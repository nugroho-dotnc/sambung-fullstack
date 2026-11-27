import type {Prisma,PrismaClient} from "@prisma/client";
import {z} from "zod";
import {ApiError} from "../../shared/api-error.ts";
import {digest, isBuyerPro, maskPhone} from "../auth/session.ts";
import {include as offerInclude,present} from "../offers/offers.service.ts";
import {preview} from "../pricing/pricing.service.ts";
import {orderSchema,counterSchema,acceptSchema,reasonSchema,signSchema,shipSchema,receiveSchema,disputeSchema,type Action} from "./contracts.schemas.ts";
import {
  RECEIPT_AUTO_RELEASE_MS,
  SIGN_DEADLINE_MS,
} from "./contracts.constants.ts";
import {
  BUYER_FEE_RATE,
  PAYMENT_DUE_MS,
  PAYMENT_GRACE_MS,
  PRO_BUYER_FEE_RATE,
  presentPayment,
} from "../payments/payments.service.ts";

export type Actor={id:string,role:string};
const person={select:{id:true,name:true,phone:true,businessName:true,proExpiresAt:true}} as const;
const include={offer:{include:{region:true,owner:person}},buyer:person,history:{orderBy:{version:"asc"}},payments:{orderBy:{attempt:"desc"},take:1}} as const;
type Row=Prisma.ContractGetPayload<{include:typeof include}>;
function fail(code:string,message:string):never {throw new ApiError(409,code,message);}
function missing():never {throw new ApiError(404,"NOT_FOUND","Kontrak tidak ditemukan.");}
function resolveContractContacts(row: Row, actorRole: string) {
  const hasSettledPayment = row.payments.some((p) => p.status === "paid");
  const canRevealContacts =
    hasSettledPayment || row.status === "shipping" || row.status === "completed";
  if (!canRevealContacts) {
    return {};
  }
  if (actorRole === "admin") {
    return {
      farmerPhone: maskPhone(row.offer.owner.phone),
      buyerPhone: maskPhone(row.buyer.phone),
    };
  }
  return {
    farmerPhone: row.offer.owner.phone,
    buyerPhone: row.buyer.phone,
  };
}

function view(row: Row, actorRole: string) {
  const { offer, buyer, history, payments, ...contract } = row;
  const saved = history[history.length - 1].priceCheck;
  const accepted = saved && typeof saved === "object" && !Array.isArray(saved) ? saved.acceptance : null;
  const checked = accepted ?? saved;
  const priceReference = checked && typeof checked === "object" && !Array.isArray(checked) ? checked.reference : null;
  const latestPayment = payments[0];
  const buyerIsPro = isBuyerPro({ role: "pembeli", proExpiresAt: buyer.proExpiresAt });
  const buyerFeeRate =
    latestPayment && Number(latestPayment.contractAmount) > 0
      ? Math.round(
          (Number(latestPayment.buyerFeeAmount) / Number(latestPayment.contractAmount)) * 10000
        ) / 10000
      : buyerIsPro
      ? PRO_BUYER_FEE_RATE
      : BUYER_FEE_RATE;
  return {
    ...contract,
    signDeadlineAt: contract.signDeadlineAt ? contract.signDeadlineAt.toISOString() : null,
    shippingDeadlineAt: contract.shippingDeadlineAt ? contract.shippingDeadlineAt.toISOString() : null,
    shippingReminderSentAt: contract.shippingReminderSentAt ? contract.shippingReminderSentAt.toISOString() : null,
    receiptDeadlineAt: contract.receiptDeadlineAt ? contract.receiptDeadlineAt.toISOString() : null,
    disputedAt: contract.disputedAt ? contract.disputedAt.toISOString() : null,
    disputeResolvedAt: contract.disputeResolvedAt ? contract.disputeResolvedAt.toISOString() : null,
    actualVolumeKg:
      contract.actualVolumeKg !== null && contract.actualVolumeKg !== undefined
        ? Number(contract.actualVolumeKg)
        : null,
    paymentDueAt: contract.paymentDueAt ? contract.paymentDueAt.toISOString() : null,
    paymentGraceEndsAt: contract.paymentGraceEndsAt ? contract.paymentGraceEndsAt.toISOString() : null,
    paymentReminderSentAt: contract.paymentReminderSentAt ? contract.paymentReminderSentAt.toISOString() : null,
    payment: latestPayment ? presentPayment(latestPayment) : null,
    buyerIsPro,
    buyerFeeRate,
    priceReference,
    volumeKg: Number(row.volumeKg),
    farmerId: offer.ownerId,
    farmerName: offer.owner.name,
    buyerName: buyer.name,
    farmerBusiness: offer.owner.businessName ?? undefined,
    buyerBusiness: buyer.businessName ?? undefined,
    ...resolveContractContacts(row, actorRole),
    grainType: offer.grainType,
    province: offer.region.province,
    regency: offer.region.regency,
    district: offer.districtId,
    quality: offer.quality,
    initialPrice: history[0].price,
    history: history.map((h) => ({
      ...h,
      authorName: h.role === "petani" ? offer.owner.name : buyer.name,
    })),
  };
}
const parties=(actor:Actor)=> actor.role === "admin" ? {} : ({OR:[{buyerId:actor.id},{offer:{ownerId:actor.id}}]});
export async function contracts(db:PrismaClient,actor:Actor,status?:string) {
  return (await db.contract.findMany({where:{...parties(actor),status},include,orderBy:{createdAt:"desc"}})).map((row)=>view(row, actor.role));
}
export async function detail(db:PrismaClient,actor:Actor,id:string) {
  const row=await db.contract.findFirst({where:{id,...parties(actor)},include});
  return row?view(row, actor.role):missing();
}
export async function command(db:PrismaClient,actor:Actor,action:Action,id:string|undefined,body:unknown,key:string) {
  if (!z.uuid().safeParse(key).success) {
    throw new ApiError(400, "INVALID_REQUEST", "Permintaan tidak lengkap. Muat ulang halaman lalu coba kembali.");
  }
  const order=action==="order"?orderSchema.parse(body):undefined;
  const counter=action==="counter"?counterSchema.parse(body):undefined;
  const acceptance=action==="accept"?acceptSchema.parse(body):undefined;
  const sign=action==="sign"?signSchema.parse(body):undefined;
  const ship=action==="ship"?shipSchema.parse(body):undefined;
  const receive=action==="receive"?receiveSchema.parse(body):undefined;
  const dispute=action==="dispute"?disputeSchema.parse(body):undefined;
  const reason=action==="cancel"||action==="reject"?reasonSchema.parse(body).reason:undefined;
  const fingerprint=digest(JSON.stringify(["contract",action,id,order,counter,acceptance,sign,ship,receive,dispute,reason]));
  const where={ownerId_key:{ownerId:actor.id,key}};
  // Store only the resource ID. Every replay must apply the current contact visibility.
  async function replay(tx:Prisma.TransactionClient,receipt:{fingerprint:string,response:Prisma.JsonValue}) {
    if(receipt.fingerprint!==fingerprint) fail("IDEMPOTENCY_CONFLICT","Permintaan ini sudah pernah dikirim dengan isi berbeda. Muat ulang halaman lalu coba kembali.");
    return view(await tx.contract.findUniqueOrThrow({where:{id:String(receipt.response)},include}), actor.role);
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
      fail("VERSION_CONFLICT","Penawaran harga telah diperbarui mitra Anda. Muat ulang halaman untuk meninjau harga terbaru.");
    if(check && pricing) {
      if(locked.version!==offer.version || pricing.referenceVersion!==check.reference.referenceVersion)
        fail("REFERENCE_CHANGED","Acuan harga pasar baru saja berubah. Tinjau kembali acuan harga terbaru.");
      if(check.requiresConfirmation && !pricing.redConfirmed) fail("RED_CONFIRMATION_REQUIRED","Harga yang diajukan jauh di bawah acuan pasar. Mohon konfirmasi terlebih dahulu sebelum melanjutkan.");
    }
    let contractId=id;
    const sysParam=await tx.systemParameter.findUnique({where:{id:"active"}});
    const expiryMs=(sysParam?.orderExpiryHours ?? 24)*3600000;
    if(order && check) {
      if(locked.status!=="published" || order.volumeKg>present(locked).availableVolumeKg)
        fail("INSUFFICIENT_STOCK","Stok tersedia tidak mencukupi untuk jumlah pesanan ini. Periksa kembali sisa volume di katalog.");
      const row=await tx.contract.create({data:{offerId,buyerId:actor.id,volumeKg:order.volumeKg,
        farmerAskPrice:locked.askPrice,currentPrice:order.proposedPrice,expiresAt:new Date(Date.now()+expiryMs),
        history:{create:{version:1,role:actor.role,price:order.proposedPrice,note:order.notes,priceCheck:{...check,redConfirmed:!!order.redConfirmed}}}}});
      contractId=row.id;
      await tx.notification.create({data:{accountId:locked.ownerId,type:"kontrak",title:"Pesanan Baru Masuk",
        description:`Pembeli mengajukan pesanan ${order.volumeKg} kg pada tawaran panen Anda.`,linkHref:`/kontrak/${row.id}`,contractId:row.id}});
      await tx.auditLog.create({data:{actorRole:actor.role,actorName:actor.id,action:"CREATE_ORDER",
        targetType:"contract",targetId:row.id,details:`Pesanan ${order.volumeKg} kg seharga Rp${order.proposedPrice}/kg`}});
    } else if(c) {
      if(c.status==="pending" && Date.now()>=c.expiresAt.getTime()) fail("EXPIRED","Batas waktu negosiasi untuk pesanan ini sudah berakhir.");
      const update:Prisma.ContractUpdateManyMutationInput={};
      const partnerId=actor.id===c.buyerId?locked.ownerId:c.buyerId;
      if(action==="counter" || action==="accept") {
        if(c.status!=="pending" || c.currentTurnRole!==actor.role) fail("INVALID_TURN","Saat ini giliran mitra Anda untuk menanggapi harga. Muat ulang halaman untuk melihat pembaruan.");
        if(counter && check) {
          await tx.contractPrice.create({data:{contractId:c.id,version:c.priceOfferVersion+1,role:actor.role,
            price:counter.proposedPrice,note:counter.note,priceCheck:{...check,redConfirmed:!!counter.redConfirmed}}});
          Object.assign(update,{currentPrice:counter.proposedPrice,priceOfferVersion:{increment:1},currentTurnRole:actor.role==="petani"?"pembeli":"petani"});
          await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Tawar Balik Harga",
            description:`Mitra transaksi mengajukan harga penyesuaian Rp${counter.proposedPrice.toLocaleString("id-ID")}/kg.`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
        } else {
          update.status="approved";
          update.signDeadlineAt=new Date(Date.now() + SIGN_DEADLINE_MS);
          const activePrice={contractId_version:{contractId:c.id,version:c.priceOfferVersion}};
          const proposal=await tx.contractPrice.findUniqueOrThrow({where:activePrice});
          await tx.contractPrice.update({where:activePrice,data:{priceCheck:{proposal:proposal.priceCheck,
            acceptance:{...check,redConfirmed:!!acceptance?.redConfirmed}}}});
          await tx.notification.createMany({data:[
            {accountId:locked.ownerId,type:"kontrak",title:"Harga Disepakati",description:`Harga kesepakatan Rp${c.currentPrice.toLocaleString("id-ID")}/kg telah disetujui. Silakan tanda tangani lembar kesepakatan dalam 48 jam.`,linkHref:`/kontrak/${c.id}`,contractId:c.id},
            {accountId:c.buyerId,type:"kontrak",title:"Harga Disepakati",description:`Harga kesepakatan Rp${c.currentPrice.toLocaleString("id-ID")}/kg telah disetujui. Silakan tanda tangani lembar kesepakatan dalam 48 jam.`,linkHref:`/kontrak/${c.id}`,contractId:c.id},
          ]});
        }
      } else if(action==="sign") {
        if(c.status!=="approved") fail("INVALID_STATUS","Tanda tangan kontrak hanya dapat dilakukan setelah harga disepakati bersama.");
        if(c.signDeadlineAt && Date.now() >= c.signDeadlineAt.getTime()) fail("EXPIRED","Batas waktu tanda tangan 48 jam untuk kesepakatan ini telah berakhir.");
        if(actor.role==="petani") {
          if(actor.id!==locked.ownerId) fail("FORBIDDEN","Hanya petani pemilik tawaran yang dapat menandatangani sebagai pihak petani.");
          if(c.farmerSignature) fail("ALREADY_SIGNED","Anda sudah menandatangani kontrak kesepakatan ini.");
          update.farmerSignature=sign!.signature;
          update.farmerSignatureType=sign!.type;
          update.farmerSignedAt=new Date();
          update.farmerConfirmed=true;
        } else if(actor.role==="pembeli") {
          if(actor.id!==c.buyerId) fail("FORBIDDEN","Hanya pembeli terkait yang dapat menandatangani sebagai pihak pembeli.");
          if(c.buyerSignature) fail("ALREADY_SIGNED","Anda sudah menandatangani kontrak kesepakatan ini.");
          update.buyerSignature=sign!.signature;
          update.buyerSignatureType=sign!.type;
          update.buyerSignedAt=new Date();
          update.buyerConfirmed=true;
        } else {
          fail("FORBIDDEN","Hanya pihak petani atau pembeli yang dapat menandatangani kontrak.");
        }
        const bothSigned=(c.farmerSignature||update.farmerSignature)&&(c.buyerSignature||update.buyerSignature);
        if(bothSigned) {
          const signedNow = new Date();
          const paymentDueAt = new Date(signedNow.getTime() + PAYMENT_DUE_MS);
          const paymentGraceEndsAt = new Date(paymentDueAt.getTime() + PAYMENT_GRACE_MS);
          update.status="signed";
          update.paymentDueAt=paymentDueAt;
          update.paymentGraceEndsAt=paymentGraceEndsAt;
          await tx.notification.createMany({data:[
            {accountId:locked.ownerId,type:"kontrak",title:"Kontrak Resmi Mengikat",description:"Kedua belah pihak telah menandatangani lembar kesepakatan. Menunggu pembeli menyelesaikan pembayaran escrow dalam 7 hari sebelum pengiriman gabah.",linkHref:`/kontrak/${c.id}`,contractId:c.id},
            {accountId:c.buyerId,type:"kontrak",title:"Kontrak Resmi Mengikat — Segera Bayar Escrow",description:"Kedua belah pihak telah menandatangani lembar kesepakatan. Silakan lakukan pembayaran melalui Midtrans Sandbox dalam 7 hari agar petani dapat mengirim gabah.",linkHref:`/kontrak/${c.id}`,contractId:c.id},
          ]});
          await tx.auditLog.create({data:{actorRole:actor.role,actorName:actor.id,action:"CONTRACT_SIGNED",
            targetType:"contract",targetId:c.id,details:"Kedua belah pihak telah melengkapi tanda tangan kontrak."}});
        } else {
          await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Mitra Telah Menandatangani",
            description:"Mitra transaksi telah menandatangani lembar kesepakatan. Giliran Anda untuk menandatangani kontrak.",linkHref:`/kontrak/${c.id}`,contractId:c.id}});
        }
      } else if(action==="ship") {
        if(c.status!=="signed") fail("INVALID_STATUS","Pengiriman gabah hanya dapat dikonfirmasi setelah kedua belah pihak menandatangani kontrak.");
        if(actor.role!=="petani" || actor.id!==locked.ownerId) fail("FORBIDDEN","Hanya petani pemilik komoditas yang dapat mengonfirmasi pengiriman gabah.");
        if(c.disputeStatus==="open") fail("DISPUTE_OPEN","Kontrak sedang dalam peninjauan sengketa oleh pengawas sistem.");
        if(c.shippingDeadlineAt && Date.now()>=c.shippingDeadlineAt.getTime()) fail("SHIPPING_DEADLINE_PASSED","Batas waktu pengiriman 7 hari telah terlewati. Menunggu penanganan pengawas.");
        const settledPayment=await tx.payment.findFirst({where:{contractId:c.id,status:"paid"},select:{id:true}});
        if(!settledPayment) {
          fail("PAYMENT_REQUIRED","Pembeli belum menyelesaikan pembayaran escrow. Pengiriman gabah baru dapat dikonfirmasi setelah pembayaran terverifikasi.");
        }
        const shippedNow = new Date();
        update.status="shipping";
        update.shippedAt=shippedNow;
        update.receiptDeadlineAt=new Date(shippedNow.getTime() + RECEIPT_AUTO_RELEASE_MS);
        await tx.notification.create({data:{accountId:c.buyerId,type:"kontrak",title:"Gabah Sedang Dikirim",
          description:`Petani telah mengonfirmasi bahwa gabah sedang dikirim ke lokasi Anda. Konfirmasi penerimaan atau laporkan kendala dalam 5 hari sebelum dana escrow dicairkan otomatis.${ship?.notes?` Catatan: ${ship.notes}`:""}`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
        await tx.auditLog.create({data:{actorRole:actor.role,actorName:actor.id,action:"CONTRACT_SHIPPED",
          targetType:"contract",targetId:c.id,details:`Petani mengonfirmasi pengiriman gabah. Catatan: ${ship?.notes || "-"}`}});
      } else if(action==="receive") {
        if(c.status!=="shipping") fail("INVALID_STATUS","Penerimaan barang hanya dapat dikonfirmasi setelah gabah berstatus sedang dikirim.");
        if(actor.role!=="pembeli" || actor.id!==c.buyerId) fail("FORBIDDEN","Hanya pembeli yang dapat mengonfirmasi penerimaan gabah.");
        if(c.disputeStatus==="open") fail("DISPUTE_OPEN","Kontrak sedang dalam peninjauan sengketa oleh pengawas sistem.");
        const releasedAt = new Date();
        update.status="completed";
        update.completedAt=releasedAt;
        if(receive?.actualVolumeKg !== undefined) update.actualVolumeKg=receive.actualVolumeKg;
        if(receive?.actualMoisturePercent !== undefined) update.actualMoisturePercent=receive.actualMoisturePercent;
        if(receive?.notes?.trim()) update.handoverNotes=receive.notes.trim();
        const heldPayment = await tx.payment.findFirst({
          where:{contractId:c.id,status:"paid",escrowStatus:"held"},
          select:{id:true,orderId:true,contractAmount:true},
        });
        if(heldPayment) {
          const released = await tx.payment.updateMany({
            where:{id:heldPayment.id,status:"paid",escrowStatus:"held"},
            data:{escrowStatus:"released",releasedAt},
          });
          if(released.count>0) {
            await tx.notification.create({data:{
              accountId:locked.ownerId,
              type:"kontrak",
              title:"Dana Escrow Dicairkan",
              description:`Pembeli telah mengonfirmasi penerimaan gabah. Dana bersih sebesar Rp${Number(heldPayment.contractAmount).toLocaleString("id-ID")} dicairkan ke akun Anda (Simulasi Escrow ${heldPayment.orderId}).`,
              linkHref:`/kontrak/${c.id}/bukti`,
              contractId:c.id,
            }});
            await tx.auditLog.create({data:{
              actorRole:"sistem",
              actorName:"Sistem Escrow",
              action:"ESCROW_RELEASED",
              targetType:"contract",
              targetId:c.id,
              details:`Dana bersih petani Rp${Number(heldPayment.contractAmount).toLocaleString("id-ID")} (${heldPayment.orderId}) dicairkan setelah konfirmasi terima gabah.`,
            }});
          }
        }
        await tx.notification.createMany({data:[
          {accountId:locked.ownerId,type:"kontrak",title:"Transaksi Selesai",description:"Pembeli telah mengonfirmasi penerimaan gabah. Transaksi komitmen pasokan telah selesai tuntas.",linkHref:`/kontrak/${c.id}/bukti`,contractId:c.id},
          {accountId:c.buyerId,type:"kontrak",title:"Transaksi Selesai",description:"Anda telah mengonfirmasi penerimaan gabah. Lembar bukti kesepakatan tuntas dapat diunduh.",linkHref:`/kontrak/${c.id}/bukti`,contractId:c.id},
        ]});
        await tx.auditLog.create({data:{actorRole:actor.role,actorName:actor.id,action:"CONTRACT_COMPLETED",
          targetType:"contract",targetId:c.id,details:`Pembeli mengonfirmasi penerimaan gabah (timbang aktual: ${receive?.actualVolumeKg ?? "-"} kg, kadar air: ${receive?.actualMoisturePercent ?? "-"}%). Catatan: ${receive?.notes || "-"}`}});
      } else if(action==="dispute") {
        const paidPayment=await tx.payment.findFirst({where:{contractId:c.id,status:"paid",escrowStatus:"held"},select:{id:true}});
        const disputeAllowed=(c.status==="shipping") || (c.status==="signed" && Boolean(paidPayment));
        if(!disputeAllowed) fail("INVALID_STATUS","Laporan sengketa hanya dapat diajukan setelah pembayaran escrow lunas pada tahap persiapan kirim atau pengiriman.");
        if(actor.role!=="petani" && actor.role!=="pembeli") fail("FORBIDDEN","Hanya pihak petani atau pembeli terkait yang dapat mengajukan sengketa.");
        if(c.disputeStatus!=="none") fail("DISPUTE_ALREADY_EXISTS","Sengketa untuk kontrak ini sudah tercatat dan sedang/telah ditangani pengawas.");
        update.disputeStatus="open";
        update.disputeReason=dispute!.reason;
        update.disputeByRole=actor.role;
        update.disputedAt=new Date();
        await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Kendala / Sengketa Transaksi Dilaporkan",
          description:`Mitra melaporkan kendala pada kontrak ini untuk ditinjau pengawas (pencairan otomatis ditahan). Alasan: ${dispute!.reason}`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
        await tx.auditLog.create({data:{actorRole:actor.role,actorName:actor.id,action:"CONTRACT_DISPUTE_OPENED",
          targetType:"contract",targetId:c.id,details:`Sengketa dibuka oleh ${actor.role}: ${dispute!.reason}`}});
      } else if(action==="reject") {
        if(c.status!=="pending" || actor.role!=="petani") fail("INVALID_STATUS","Penolakan hanya dapat dilakukan oleh petani saat status penawaran masih berlangsung.");
        update.status="rejected";
        update.cancelReason=reason;
        await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Pesanan Ditolak",
          description:`Kontrak transaksi telah ditolak oleh petani. Alasan: ${reason || "-"}`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
      } else if(action==="cancel") {
        if(c.status==="signed" || c.status==="shipping" || c.status==="completed") {
          fail("LOCKED","Kontrak telah ditandatangani oleh kedua belah pihak dan mengikat secara hukum, sehingga tidak dapat dibatalkan.");
        }
        const allowed=(c.status==="pending" && actor.role==="pembeli") || c.status==="approved";
        if(!allowed) fail("INVALID_STATUS","Kontrak tidak dapat dibatalkan pada status transaksi saat ini.");
        update.status="cancelled";
        update.cancelReason=reason;
        await tx.notification.create({data:{accountId:partnerId,type:"kontrak",title:"Pesanan Dibatalkan",
          description:`Kontrak transaksi telah dibatalkan. Alasan: ${reason || "-"}`,linkHref:`/kontrak/${c.id}`,contractId:c.id}});
      } else {
        fail("INVALID_ACTION","Tindakan kontrak tidak dikenali.");
      }
      const changed=await tx.contract.updateMany({where:{id:c.id,status:c.status,
        ...(c.status==="pending"?{expiresAt:{gt:new Date()}}:{})},data:update});
      if(!changed.count) fail("VERSION_CONFLICT","Status kontrak telah berubah. Muat ulang halaman untuk melihat pembaruan terbaru.");
    }
    const result=await tx.contract.findUniqueOrThrow({where:{id:contractId},include});
    await tx.offerRequest.create({data:{ownerId:actor.id,key,fingerprint,response:result.id}});
    return view(result, actor.role);
  });
}
