import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { readDb, writeDb } from "./db";
import { offerInputSchema, type HarvestOffer } from "@/features/offers/schemas";

export function handleOfferRequest(
  path: string,
  method: string,
  body: unknown,
  headers: Headers
): unknown {
  const db = readDb();
  const user = db.currentSession;
  if (!user) {
    throw new ApiError("Sesi telah berakhir. Silakan masuk kembali.", 401, "UNAUTHORIZED");
  }

  const match = /^\/offers(?:\/([^/]+))?(?:\/(publish|withdraw))?$/.exec(path);
  if (!match) throw new ApiError("Endpoint penawaran tidak ditemukan.", 404, "NOT_FOUND");

  const id = match[1] ? decodeURIComponent(match[1]) : undefined;
  const action = match[2];

  // GET /offers or GET /offers/:id
  if (method === "GET" && !action) {
    if (!id) {
      // Petani sees only their own offers. Buyer or Admin sees published offers
      if (user.role === "petani") {
        return { data: db.offers.filter((item) => item.ownerId === user.id) };
      }
      return { data: db.offers.filter((item) => item.status === "published") };
    }

    const offer = db.offers.find((item) => item.id === id);
    if (!offer) throw new ApiError("Tawaran panen tidak ditemukan.", 404, "NOT_FOUND");
    return offer;
  }

  // All modifications require role petani
  if (user.role !== "petani") {
    throw new ApiError("Hanya Petani yang memiliki akses untuk mengubah tawaran panen.", 403, "FORBIDDEN");
  }

  const isCreate = method === "POST" && !id;
  const isUpdate = method === "PATCH" && Boolean(id) && !action;
  const isAction = method === "POST" && Boolean(id) && Boolean(action);

  if (!isCreate && !isUpdate && !isAction) {
    throw new ApiError("Metode HTTP tidak didukung.", 405, "METHOD_NOT_ALLOWED");
  }

  const key = headers.get("Idempotency-Key");
  if (!key) {
    throw new ApiError("Identitas permintaan (Idempotency-Key) diperlukan.", 422, "VALIDATION_ERROR");
  }

  let result: HarvestOffer;

  if (isCreate) {
    const input = offerInputSchema.parse(body);
    const newOffer: HarvestOffer = {
      ...input,
      id: `of-${Date.now().toString().slice(-6)}`,
      ownerId: user.id,
      farmerName: user.name || user.businessName || "Petani SAMBUNG",
      province: input.province || user.province || "Jawa Barat",
      regency: input.regency || user.regency || "Subang",
      district: input.district || user.district || "Pagaden",
      status: "draft",
      version: 1,
      reservedVolumeKg: 0,
      approvedVolumeKg: 0,
      completedVolumeKg: 0,
      availableVolumeKg: input.totalVolumeKg,
      typeLocationLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.offers.unshift(newOffer);
    result = newOffer;
  } else {
    const offerIndex = db.offers.findIndex((item) => item.id === id && item.ownerId === user.id);
    if (offerIndex === -1) {
      throw new ApiError("Tawaran panen tidak ditemukan atau bukan milik akun Anda.", 404, "NOT_FOUND");
    }
    const existing = db.offers[offerIndex];

    const { version } = z.object({ version: z.number().int() }).parse(body);
    if (version !== existing.version) {
      throw new ApiError("Tawaran telah diperbarui dari sesi lain. Silakan muat ulang halaman.", 409, "VERSION_CONFLICT");
    }

    if (existing.status === "withdrawn") {
      throw new ApiError("Tawaran yang telah ditarik tidak dapat diubah atau diterbitkan kembali.", 409, "INVALID_STATE");
    }

    if (isUpdate) {
      const input = offerInputSchema.parse(body);
      if (existing.typeLocationLocked && (input.grainType !== existing.grainType || input.districtId !== existing.districtId)) {
        throw new ApiError("Jenis gabah dan lokasi sudah terkunci karena ada kesepakatan berjalan.", 409, "OFFER_LOCKED");
      }
      const committed = Math.round(existing.reservedVolumeKg * 100) + Math.round(existing.approvedVolumeKg * 100) + Math.round(existing.completedVolumeKg * 100);
      const available = Math.round(input.totalVolumeKg * 100) - committed;
      if (available < 0) {
        throw new ApiError("Total volume panen baru tidak boleh lebih kecil dari volume yang sedang dipesan.", 409, "INSUFFICIENT_VOLUME");
      }

      result = {
        ...existing,
        ...input,
        availableVolumeKg: available / 100,
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      db.offers[offerIndex] = result;
    } else if (action === "publish") {
      if (existing.status !== "draft") {
        throw new ApiError("Hanya tawaran berstatus draf yang dapat diterbitkan.", 409, "INVALID_STATE");
      }
      result = {
        ...existing,
        status: "published",
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      db.offers[offerIndex] = result;
    } else {
      // action === "withdraw"
      if (existing.reservedVolumeKg > 0) {
        throw new ApiError("Tawaran tidak dapat ditarik karena terdapat pesanan pembeli yang sedang menunggu kesepakatan.", 409, "HAS_PENDING_ORDERS");
      }
      result = {
        ...existing,
        status: "withdrawn",
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      db.offers[offerIndex] = result;
    }
  }

  writeDb(db);
  return result;
}
