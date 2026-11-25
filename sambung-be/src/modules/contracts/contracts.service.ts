import type {Prisma,PrismaClient} from "@prisma/client";
import {z} from "zod";
import {ApiError} from "../../shared/api-error.ts";
import {digest} from "../auth/session.ts";
import {include as offerInclude,present} from "../offers/offers.service.ts";
import {preview} from "../pricing/pricing.service.ts";
import {orderSchema,counterSchema,acceptSchema,reasonSchema,type Action} from "./contracts.schemas.ts";

export type Actor={id:string,role:string};
const person={select:{id:true,name:true,phone:true,businessName:true}} as const;
const include={offer:{include:{region:true,owner:person}},buyer:person,history:{orderBy:{version:"asc"}}} as const;
type Row=Prisma.ContractGetPayload<{include:typeof include}>;
function fail(code:string,message:string):never {throw new ApiError(409,code,message);}
function missing():never {throw new ApiError(404,"NOT_FOUND","Kontrak tidak ditemukan.");}
function view(row:Row) {
  const {offer,buyer,history,...contract}=row;
  const saved=history[history.length-1].priceCheck;
  const accepted=saved && typeof saved==="object" && !Array.isArray(saved) ? saved.acceptance : null;
  const checked=accepted ?? saved;
  const priceReference=checked && typeof checked==="object" && !Array.isArray(checked) ? checked.reference : null;
  return {...contract,priceReference,volumeKg:Number(row.volumeKg),farmerId:offer.ownerId,farmerName:offer.owner.name,
    buyerName:buyer.name,farmerBusiness:offer.owner.businessName ?? undefined,buyerBusiness:buyer.businessName ?? undefined,
    ...(row.status==="approved"?{farmerPhone:offer.owner.phone,buyerPhone:buyer.phone}:{}),
    grainType:offer.grainType,province:offer.region.province,regency:offer.region.regency,district:offer.districtId,
    quality:offer.quality,initialPrice:history[0].price,history:history.map(h=>({...h,authorName:h.role==="petani"?offer.owner.name:buyer.name}))};
}
const parties=(actor:Actor)=> actor.role === "admin" ? {} : ({OR:[{buyerId:actor.id},{offer:{ownerId:actor.id}}]});
export async function contracts(db:PrismaClient,actor:Actor,status?:string) {
  return (await db.contract.findMany({where:{...parties(actor),status},include,orderBy:{createdAt:"desc"}})).map(view);
}
export async function detail(db:PrismaClient,actor:Actor,id:string) {
  const row=await db.contract.findFirst({where:{id,...parties(actor)},include});
  return row?view(row):missing();
}
export async function command(db:PrismaClient,actor:Actor,action:Action,id:string|undefined,body:unknown,key:string) {
  z.uuid().parse(key);
  const order=action==="order"?orderSchema.parse(body):undefined;
  const counter=action==="counter"?counterSchema.parse(body):undefined;
  const acceptance=action==="accept"?acceptSchema.parse(body):undefined;
  const reason=action==="cancel"||action==="reject"?reasonSchema.parse(body).reason:undefined;
  const fingerprint=digest(JSON.stringify(["contract",action,id,order,counter,acceptance,reason]));
  const where={ownerId_key:{ownerId:actor.id,key}};
  // Store only the resource ID. Every replay must apply the current contact visibility.
  async function replay(tx:Prisma.TransactionClient,receipt:{fingerprint:string,response:Prisma.JsonValue}) {
    if(receipt.fingerprint!==fingerprint) fail("IDEMPOTENCY_CONFLICT","Kunci permintaan sudah dipakai.");
    return view(await tx.contract.findUniqueOrThrow({where:{id:String(receipt.response)},include}));
  }
  const prior=await db.offerRequest.findUnique({where});
  if(prior) return replay(db,prior);
  if(order && actor.role!=="pembeli") throw new ApiError(403,"FORBIDDEN","Hanya pembeli dapat memesan.");
  const before=id?await db.contract.findFirst({where:{id,...parties(actor)}}):null;
  if(id && !before) missing();
  const offerId=order?.offerId ?? before!.offerId;
  const offer=await db.offer.findUnique({where:{id:offerId}});
  if(!offer) missing();
  const pricing=order ?? counter ?? acceptance;
  const check=pricing?await preview(db,{grainType:z.enum(["GKP","GKG"]).parse(offer.grainType),quality:offer.quality,
    regionId:offer.districtId,price:order?.proposedPrice ?? counter?.proposedPrice ?? before!.currentPrice,
    action:order?"order":counter?"counter":"accept"}):undefined;
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${actor.id+key},0))`;
    const duplicate=await tx.offerRequest.findUnique({where});
    if(duplicate) return replay(tx,duplicate);
    await tx.$queryRaw`SELECT id FROM "Offer" WHERE id=${offerId}::uuid FOR UPDATE`;
    const locked=await tx.offer.findUniqueOrThrow({where:{id:offerId},include:offerInclude});
    const c=id?await tx.contract.findUniqueOrThrow({where:{id}}):null;
    if(c && (counter || acceptance) && (counter ?? acceptance)!.priceOfferVersion!==c.priceOfferVersion)
      fail("VERSION_CONFLICT","Harga sudah berubah. Tinjau pengajuan terbaru.");
    if(check && pricing) {
      if(locked.version!==offer.version || pricing.referenceVersion!==check.reference.referenceVersion)
        fail("REFERENCE_CHANGED","Tinjau kembali acuan harga terbaru.");
      if(check.requiresConfirmation && !pricing.redConfirmed) fail("RED_CONFIRMATION_REQUIRED","Konfirmasikan harga merah terlebih dahulu.");
    }
    let contractId=id;
    const sysParam=await tx.systemParameter.findUnique({where:{id:"active"}});
    const expiryMs=(sysParam?.orderExpiryHours ?? 24)*3600000;
    if(order && check) {
      if(locked.status!=="published" || order.volumeKg>present(locked).availableVolumeKg)
        fail("INSUFFICIENT_STOCK","Stok tersedia tidak mencukupi. Periksa kembali katalog.");
      const row=await tx.contract.create({data:{offerId,buyerId:actor.id,volumeKg:order.volumeKg,
        farmerAskPrice:locked.askPrice,currentPrice:order.proposedPrice,expiresAt:new Date(Date.now()+expiryMs),
        history:{create:{version:1,role:actor.role,price:order.proposedPrice,note:order.notes,priceCheck:{...check,redConfirmed:!!order.redConfirmed}}}}});
      contractId=row.id;
      await tx.notification.create({data:{accountId:locked.ownerId,type:"kontrak",title:"Pesanan Baru Masuk",
        description:`Pembeli mengajukan pesanan ${order.volumeKg} kg pada tawaran panen Anda.`,linkHref:`/kontrak/${row.id}`,contractId:row.id}});
      await tx.auditLog.create({data:{actorRole:actor.role,actorName:actor.id,action:"CREATE_ORDER",
        targetType:"contract",targetId:row.id,details:`Pesanan ${order.volumeKg} kg seharga Rp${order.proposedPrice}/kg`}});
    } else if(c) {
      if(c.status==="pending" && Date.now()>=c.expiresAt.getTime()) fail("EXPIRED","Tenggat sudah tercapai.");
      const update:Prisma.ContractUpdateManyMutationInput={};
      const partnerId=actor.id===c.buyerId?locked.ownerId:c.buyerId;
      if(action==="counter" || action==="accept") {
        if(c.status!=="pending" || c.currentTurnRole!==actor.role) fail("INVALID_TURN","Tindakan tidak tersedia untuk giliran ini.");
        if(counter && check) {
          await tx.contractPrice.create({data:{contractId:c.id,version:c.priceOfferVersion+1,role:actor.role,
            price:counter.proposedPrice,note:counter.note,priceCheck:{...check,redConfirmed:!!counter.redConfirmed}}});
          Object.assign(update,{currentPrice:counter.proposedPrice,priceOfferVersion:{increment:1},currentTurnRole:actor.role==="petani"?"pembeli":"petani"});
          await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Tawar Balik Harga",
            description:`Mitra transaksi mengajukan harga penyesuaian Rp${counter.proposedPrice.toLocaleString("id-ID")}/kg.`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
        } else {
          update.status="approved";
          const activePrice={contractId_version:{contractId:c.id,version:c.priceOfferVersion}};
          const proposal=await tx.contractPrice.findUniqueOrThrow({where:activePrice});
          await tx.contractPrice.update({where:activePrice,data:{priceCheck:{proposal:proposal.priceCheck,
            acceptance:{...check,redConfirmed:!!acceptance?.redConfirmed}}}});
          await tx.notification.createMany({data:[
            {accountId:locked.ownerId,type:"kontrak",title:"Harga Disepakati",description:`Harga kesepakatan Rp${c.currentPrice.toLocaleString("id-ID")}/kg telah disetujui. Silakan konfirmasi penyelesaian.`,linkHref:`/kontrak/${c.id}`,contractId:c.id},
            {accountId:c.buyerId,type:"kontrak",title:"Harga Disepakati",description:`Harga kesepakatan Rp${c.currentPrice.toLocaleString("id-ID")}/kg telah disetujui. Silakan konfirmasi penyelesaian.`,linkHref:`/kontrak/${c.id}`,contractId:c.id},
          ]});
        }
      } else if(action==="confirm") {
        if(c.status!=="approved") fail("INVALID_STATUS","Kontrak belum disetujui atau sudah ditutup.");
        if(actor.role==="petani") update.farmerConfirmed=true; else update.buyerConfirmed=true;
        const bothDone=(c.farmerConfirmed||update.farmerConfirmed)&&(c.buyerConfirmed||update.buyerConfirmed);
        if(bothDone) {
          update.status="completed";
          await tx.notification.createMany({data:[
            {accountId:locked.ownerId,type:"kontrak",title:"Kesepakatan Selesai Bersama",description:"Kedua belah pihak telah mengonfirmasi penyelesaian. Lembar bukti kesepakatan dapat diunduh.",linkHref:`/kontrak/${c.id}/bukti`,contractId:c.id},
            {accountId:c.buyerId,type:"kontrak",title:"Kesepakatan Selesai Bersama",description:"Kedua belah pihak telah mengonfirmasi penyelesaian. Lembar bukti kesepakatan dapat diunduh.",linkHref:`/kontrak/${c.id}/bukti`,contractId:c.id},
          ]});
          await tx.auditLog.create({data:{actorRole:"sistem",actorName:"Sistem Transaksi",action:"CONTRACT_COMPLETED",
            targetType:"contract",targetId:c.id,details:"Kedua belah pihak mengonfirmasi penyelesaian transaksi."}});
        } else {
          await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Konfirmasi Mitra Diterima",
            description:"Mitra transaksi Anda telah mengonfirmasi penyelesaian. Mohon lakukan konfirmasi dari akun Anda.",linkHref:`/kontrak/${c.id}`,contractId:c.id}});
        }
      } else {
        const allowed=action==="reject"?c.status==="pending" && actor.role==="petani":
          c.status==="approved" || (c.status==="pending" && actor.role==="pembeli");
        if(!allowed) fail("INVALID_STATUS","Kontrak tidak dapat ditutup melalui tindakan ini.");
        update.status=action==="reject"?"rejected":"cancelled"; update.cancelReason=reason;
        await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:action==="reject"?"Pesanan Ditolak":"Pesanan Dibatalkan",
          description:`Kontrak transaksi telah ditutup. Catatan: ${reason || "-"}`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
      }
      const changed=await tx.contract.updateMany({where:{id:c.id,status:c.status,
        ...(c.status==="pending"?{expiresAt:{gt:new Date()}}:{})},data:update});
      if(!changed.count) fail("VERSION_CONFLICT","Status kontrak berubah. Muat ulang.");
    }
    const result=await tx.contract.findUniqueOrThrow({where:{id:contractId},include});
    await tx.offerRequest.create({data:{ownerId:actor.id,key,fingerprint,response:result.id}});
    return view(result);
  });
}
