import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { readDb, writeDb } from "./db";
import {
  createOrderInputSchema,
  counterOfferInputSchema,
  cancelContractInputSchema,
  type Contract,
} from "@/features/contracts/schemas";
import { getNextNegotiationTurn } from "@/features/contracts/domain/state-machine";

export function handleContractRequest(
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

  const match = /^\/contracts(?:\/([^/]+))?(?:\/(accept|counter|cancel|confirm))?$/.exec(path);
  if (!match) throw new ApiError("Endpoint kontrak tidak ditemukan.", 404, "NOT_FOUND");

  const id = match[1] ? decodeURIComponent(match[1]) : undefined;
  const action = match[2];

  // GET /contracts
  if (method === "GET" && !action) {
    if (!id) {
      const url = new URL(`http://localhost${path}`);
      const statusFilter = url.searchParams.get("status");

      let userContracts = db.contracts.filter(
        (c) => c.farmerId === user.id || c.buyerId === user.id
      );

      if (statusFilter && statusFilter !== "all") {
        userContracts = userContracts.filter((c) => c.status === statusFilter);
      }

      // Sort newest first
      userContracts.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return { data: userContracts };
    }

    // GET /contracts/:id
    const contract = db.contracts.find((c) => c.id === id);
    if (!contract) throw new ApiError("Kontrak tidak ditemukan.", 404, "NOT_FOUND");

    if (user.role !== "admin" && contract.farmerId !== user.id && contract.buyerId !== user.id) {
      throw new ApiError("Anda tidak memiliki hak akses untuk kesepakatan ini.", 403, "FORBIDDEN");
    }

    return { data: contract };
  }

  // POST /contracts (Create new order by Buyer)
  if (method === "POST" && !id && !action) {
    if (user.role !== "pembeli") {
      throw new ApiError("Hanya akun Pembeli yang dapat mengajukan pesanan komitmen pasokan.", 403, "FORBIDDEN");
    }

    const input = createOrderInputSchema.parse(body);
    const offerIndex = db.offers.findIndex((o) => o.id === input.offerId);
    if (offerIndex === -1) {
      throw new ApiError("Tawaran pasokan panen tidak ditemukan.", 404, "NOT_FOUND");
    }

    const offer = db.offers[offerIndex];
    if (offer.status !== "published") {
      throw new ApiError("Tawaran panen ini sedang tidak aktif di katalog.", 409, "OFFER_NOT_ACTIVE");
    }

    if (input.volumeKg > offer.availableVolumeKg) {
      throw new ApiError(
        `Volume yang dipesan (${input.volumeKg.toLocaleString("id-ID")} kg) melebihi volume yang tersedia (${offer.availableVolumeKg.toLocaleString("id-ID")} kg).`,
        409,
        "EXCEEDS_AVAILABLE_VOLUME"
      );
    }

    // Atomic volume reservation
    offer.availableVolumeKg = Math.round((offer.availableVolumeKg - input.volumeKg) * 100) / 100;
    offer.reservedVolumeKg = Math.round((offer.reservedVolumeKg + input.volumeKg) * 100) / 100;
    offer.typeLocationLocked = true;
    offer.version += 1;
    offer.updatedAt = new Date().toISOString();

    const farmerUser = db.users.find((u) => u.id === offer.ownerId);

    const newContract: Contract = {
      id: `ctr-${Date.now().toString().slice(-6)}`,
      offerId: offer.id,
      farmerId: offer.ownerId,
      farmerName: offer.farmerName || farmerUser?.name || "Pak Subur",
      farmerPhone: farmerUser?.phone || "081234567890",
      farmerBusiness: farmerUser?.businessName || "Kelompok Tani Subur Makmur",
      buyerId: user.id,
      buyerName: user.name,
      buyerPhone: user.phone,
      buyerBusiness: user.businessName || "Mitra Pembeli SAMBUNG",
      grainType: offer.grainType,
      volumeKg: input.volumeKg,
      initialPrice: input.proposedPrice,
      currentPrice: input.proposedPrice,
      farmerAskPrice: offer.askPrice,
      status: "pending",
      currentTurnRole: "petani", // Menunggu respons dari petani
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      farmerConfirmed: false,
      buyerConfirmed: false,
      cancelReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      province: offer.province || user.province || "Jawa Barat",
      regency: offer.regency || user.regency || "Subang",
      district: offer.district || "Pagaden",
      history: [
        {
          id: `hist-1`,
          role: "pembeli",
          authorName: user.name,
          price: input.proposedPrice,
          note: input.notes || "Pesanan komitmen awal diajukan oleh pembeli.",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    db.contracts.unshift(newContract);
    writeDb(db);

    return { data: newContract };
  }

  // Contract specific actions require id
  const contractIndex = db.contracts.findIndex((c) => c.id === id);
  if (contractIndex === -1) {
    throw new ApiError("Kesepakatan kontrak tidak ditemukan.", 404, "NOT_FOUND");
  }

  const contract = db.contracts[contractIndex];
  const offerIndex = db.offers.findIndex((o) => o.id === contract.offerId);
  const offer = offerIndex !== -1 ? db.offers[offerIndex] : null;

  // ACTION: Accept Price
  if (action === "accept") {
    if (contract.status !== "pending") {
      throw new ApiError("Hanya kesepakatan dalam proses negosiasi yang dapat disetujui.", 409, "INVALID_STATE");
    }

    contract.status = "approved";
    contract.updatedAt = new Date().toISOString();
    contract.history.push({
      id: `hist-${Date.now().toString().slice(-6)}`,
      role: user.role === "petani" ? "petani" : "pembeli",
      authorName: user.name,
      price: contract.currentPrice,
      note: `Harga Rp${contract.currentPrice.toLocaleString("id-ID")}/kg telah disetujui bersama. Kesepakatan sah.`,
      timestamp: new Date().toISOString(),
    });

    if (offer) {
      // Move from reserved to approved
      offer.reservedVolumeKg = Math.max(0, Math.round((offer.reservedVolumeKg - contract.volumeKg) * 100) / 100);
      offer.approvedVolumeKg = Math.round((offer.approvedVolumeKg + contract.volumeKg) * 100) / 100;
      offer.updatedAt = new Date().toISOString();
    }

    writeDb(db);
    return { data: contract };
  }

  // ACTION: Counter-Offer
  if (action === "counter") {
    if (contract.status !== "pending") {
      throw new ApiError("Negosiasi harga hanya dapat diajukan saat status kesepakatan aktif.", 409, "INVALID_STATE");
    }

    const input = counterOfferInputSchema.parse(body);
    contract.currentPrice = input.proposedPrice;
    contract.currentTurnRole = getNextNegotiationTurn(contract.currentTurnRole);
    contract.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Reset 24 hours
    contract.updatedAt = new Date().toISOString();

    contract.history.push({
      id: `hist-${Date.now().toString().slice(-6)}`,
      role: user.role === "petani" ? "petani" : "pembeli",
      authorName: user.name,
      price: input.proposedPrice,
      note: input.note || `Nego harga baru diajukan sebesar Rp${input.proposedPrice.toLocaleString("id-ID")}/kg.`,
      timestamp: new Date().toISOString(),
    });

    writeDb(db);
    return { data: contract };
  }

  // ACTION: Cancel or Reject
  if (action === "cancel") {
    if (contract.status !== "pending" && contract.status !== "approved") {
      throw new ApiError("Kesepakatan tidak dapat dibatalkan pada status ini.", 409, "INVALID_STATE");
    }

    const input = cancelContractInputSchema.parse(body);
    const wasPending = contract.status === "pending";

    contract.status = "cancelled";
    contract.cancelReason = input.reason;
    contract.updatedAt = new Date().toISOString();

    contract.history.push({
      id: `hist-${Date.now().toString().slice(-6)}`,
      role: user.role === "petani" ? "petani" : "pembeli",
      authorName: user.name,
      price: contract.currentPrice,
      note: `Pesanan dibatalkan. Alasan: ${input.reason}`,
      timestamp: new Date().toISOString(),
    });

    if (offer) {
      // Release volume back to available
      if (wasPending) {
        offer.reservedVolumeKg = Math.max(0, Math.round((offer.reservedVolumeKg - contract.volumeKg) * 100) / 100);
      } else {
        offer.approvedVolumeKg = Math.max(0, Math.round((offer.approvedVolumeKg - contract.volumeKg) * 100) / 100);
      }
      offer.availableVolumeKg = Math.round((offer.availableVolumeKg + contract.volumeKg) * 100) / 100;
      offer.updatedAt = new Date().toISOString();
    }

    writeDb(db);
    return { data: contract };
  }

  // ACTION: Dual Confirmation of Physical Delivery
  if (action === "confirm") {
    if (contract.status !== "approved") {
      throw new ApiError("Konfirmasi penyelesaian hanya dapat dilakukan setelah kesepakatan harga disetujui.", 409, "INVALID_STATE");
    }

    if (user.role === "petani") {
      contract.farmerConfirmed = true;
    } else {
      contract.buyerConfirmed = true;
    }

    contract.updatedAt = new Date().toISOString();

    // Check if both parties have confirmed
    if (contract.farmerConfirmed && contract.buyerConfirmed) {
      contract.status = "completed";
      contract.history.push({
        id: `hist-${Date.now().toString().slice(-6)}`,
        role: user.role === "petani" ? "petani" : "pembeli",
        authorName: "Sistem SAMBUNG",
        price: contract.currentPrice,
        note: "Kedua pihak telah mengonfirmasi bahwa serah terima fisik gabah dan transaksi telah selesai.",
        timestamp: new Date().toISOString(),
      });

      if (offer) {
        // Move from approved to completed
        offer.approvedVolumeKg = Math.max(0, Math.round((offer.approvedVolumeKg - contract.volumeKg) * 100) / 100);
        offer.completedVolumeKg = Math.round((offer.completedVolumeKg + contract.volumeKg) * 100) / 100;
        offer.updatedAt = new Date().toISOString();
      }
    } else {
      contract.history.push({
        id: `hist-${Date.now().toString().slice(-6)}`,
        role: user.role === "petani" ? "petani" : "pembeli",
        authorName: user.name,
        price: contract.currentPrice,
        note: `Pihak ${user.role === "petani" ? "Petani" : "Pembeli"} telah mengonfirmasi penyelesaian fisik gabah.`,
        timestamp: new Date().toISOString(),
      });
    }

    writeDb(db);
    return { data: contract };
  }

  throw new ApiError("Aksi tidak didukung.", 400, "BAD_REQUEST");
}
