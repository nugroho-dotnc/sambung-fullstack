import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "../../shared/api-error.ts";
import { digest } from "../auth/session.ts";
import { preview } from "../pricing/pricing.service.ts";
import { inputSchema, versionSchema } from "./offers.schemas.ts";
import { extractModeration, preserveModerationMarker } from "./offer-moderation.ts";

export const include = {contracts:{select:{status:true,volumeKg:true}},region:true,owner:{select:{name:true,businessName:true}}} as const;
export function present(row: Prisma.OfferGetPayload<{include:typeof include}>) {
  const {owner,region,contracts,...offer}=row;
  const { cleanNotes, moderationStatus, moderationIssue } = extractModeration(row.notes);
  const sum=(status:string)=>contracts.filter(c=>c.status===status).reduce((n,c)=>n+Math.round(Number(c.volumeKg)*100),0)/100;
  const reservedVolumeKg=sum("pending");
  const approvedVolumeKg=sum("approved")+sum("signed")+sum("shipping");
  const completedVolumeKg=sum("completed");
  const availableVolumeKg=Math.round((Number(row.totalVolumeKg)-reservedVolumeKg-approvedVolumeKg-completedVolumeKg)*100)/100;
  return {...offer,notes:cleanNotes,moderationStatus,moderationIssue,province:region.province,regency:region.regency,district:region.id,farmerName:owner.name,
    farmerBusiness:owner.businessName ?? undefined,isDirectFarmer:true,totalVolumeKg:Number(row.totalVolumeKg),
    reservedVolumeKg,completedVolumeKg,approvedVolumeKg,availableVolumeKg,
    typeLocationLocked:contracts.length>0};
}
export async function mutate(db:PrismaClient, ownerId:string, action:string, id:string|undefined, key:string, body:unknown) {
  if (!z.uuid().safeParse(key).success) {
    throw new ApiError(400, "INVALID_REQUEST", "Permintaan tidak lengkap. Muat ulang halaman lalu coba kembali.");
  }
  const input = action==="create" || action==="update" ? inputSchema.parse(body) : undefined;
  const control = action==="create" ? undefined : versionSchema.parse(body);
  const fingerprint=digest(JSON.stringify([action,id,input,control]));
  const where={ownerId_key:{ownerId,key}};
  function replay(record:{fingerprint:string,response:Prisma.JsonValue}) {
    if(record.fingerprint!==fingerprint) throw new ApiError(409,"IDEMPOTENCY_CONFLICT","Permintaan ini sudah pernah dikirim dengan isi berbeda. Muat ulang halaman lalu coba kembali.");
    return record.response;
  }
  const previous=await db.offerRequest.findUnique({where});
  if(previous) return replay(previous);
  const existing=id ? await db.offer.findFirst({where:{id,ownerId}}) : null;
  if(id && !existing) throw new ApiError(404,"NOT_FOUND","Tawaran tidak ditemukan.");
  if(existing && existing.version!==control?.version) {
    const completed = await db.offerRequest.findUnique({where});
    if(completed) return replay(completed);
    throw new ApiError(409,"VERSION_CONFLICT","Data tawaran telah berubah. Muat ulang halaman untuk melihat versi terbaru.");
  }
  if(existing && (existing.status==="withdrawn" || (action==="publish" && existing.status!=="draft")))
    throw new ApiError(409,"INVALID_STATUS","Tawaran sudah ditarik atau sudah diterbitkan sehingga tindakan ini tidak dapat dilakukan.");
  if(input && !await db.region.findUnique({where:{id:input.districtId}})) throw new ApiError(422,"INVALID_REGION","Pilih kecamatan yang tersedia pada daftar wilayah.");
  const values=input ?? existing;
  const check=(action==="publish" || (action==="update" && existing?.status==="published")) && values ? await preview(db,{regionId:values.districtId,
    grainType:z.enum(["GKP","GKG"]).parse(values.grainType),quality:values.quality,price:values.askPrice}) : undefined;
  if(check && check.reference.referenceVersion!==control?.referenceVersion) throw new ApiError(409,"REFERENCE_CHANGED","Acuan harga pasar baru saja diperbarui. Tinjau kembali ringkasan harga terbaru.");
  if(check?.requiresConfirmation && !control?.redConfirmed) throw new ApiError(422,"RED_CONFIRMATION_REQUIRED","Harga yang diajukan jauh di bawah acuan pasar. Mohon konfirmasi terlebih dahulu sebelum melanjutkan.");
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${ownerId+key},0))`;
    const duplicate=await tx.offerRequest.findUnique({where});
    if(duplicate) return replay(duplicate);
    let offer;
    if(!id && input) {
      offer=await tx.offer.create({data:{...input,ownerId},include});
    } else {
      await tx.$queryRaw`SELECT id FROM "Offer" WHERE id=${id}::uuid FOR UPDATE`;
      const locked=await tx.offer.findUniqueOrThrow({where:{id},include});
      const stock=present(locked);
      if(input && stock.typeLocationLocked && (input.grainType!==locked.grainType || input.districtId!==locked.districtId))
        throw new ApiError(409,"LOCATION_LOCKED","Jenis dan lokasi terkunci sejak pesanan pertama.");
      if(input && Math.round(input.totalVolumeKg*100)<Math.round((stock.reservedVolumeKg+stock.approvedVolumeKg+stock.completedVolumeKg)*100))
        throw new ApiError(409,"VOLUME_COMMITTED","Volume sudah terikat pada kontrak.");
      if (action === "withdraw") {
        const pendingContracts = await tx.contract.findMany({
          where: { offerId: id, status: "pending" },
          select: { id: true, buyerId: true, volumeKg: true },
        });
        if (pendingContracts.length > 0) {
          await tx.contract.updateMany({
            where: { offerId: id, status: "pending" },
            data: { status: "cancelled", cancelReason: "Tawaran ditarik petani." },
          });
          await tx.notification.createMany({
            data: pendingContracts.map((pending) => ({
              accountId: pending.buyerId,
              type: "kontrak",
              title: "Pesanan Dibatalkan — Tawaran Ditarik",
              description: `Petani menarik penawaran gabah untuk pesanan ${Number(pending.volumeKg).toLocaleString("id-ID")} kg Anda sebelum kesepakatan disetujui.`,
              linkHref: `/kontrak/${pending.id}`,
              contractId: pending.id,
            })),
          });
          await tx.auditLog.createMany({
            data: pendingContracts.map((pending) => ({
              actorRole: "petani",
              actorName: locked.owner.name,
              action: "OFFER_WITHDRAWN_CANCELLED_PENDING",
              targetType: "contract",
              targetId: pending.id,
              details: `Pesanan ${pending.id} (${Number(pending.volumeKg)} kg) otomatis dibatalkan karena tawaran ${id} ditarik petani.`,
            })),
          });
        }
        await tx.auditLog.create({
          data: {
            actorRole: "petani",
            actorName: locked.owner.name,
            action: "OFFER_WITHDRAWN",
            targetType: "offer",
            targetId: id!,
            details: `Petani menarik tawaran panen ${locked.grainType} (${pendingContracts.length} pesanan tertunda dibatalkan).`,
          },
        });
      }
      const nextInput = input ? { ...input, notes: preserveModerationMarker(locked.notes, input.notes) } : undefined;
      const changed=await tx.offer.updateMany({where:{id,ownerId,version:control!.version},
        data:{...nextInput,version:{increment:1},status:action==="publish"?"published":action==="withdraw"?"withdrawn":existing!.status,
          priceCheck:check ? {...check,redConfirmed:control?.redConfirmed===true} : undefined}});
      if(!changed.count) throw new ApiError(409,"VERSION_CONFLICT","Data tawaran telah berubah. Muat ulang halaman untuk melihat versi terbaru.");
      offer=await tx.offer.findUniqueOrThrow({where:{id},include});
    }
    const response=JSON.parse(JSON.stringify(present(offer)));
    await tx.offerRequest.create({data:{ownerId,key,fingerprint,response}});
    return response;
  });
}

