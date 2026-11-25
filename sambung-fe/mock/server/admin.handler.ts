import { ApiError } from "@/lib/api/errors";
import { readDb, writeDb } from "./db";
import type { SystemParameters } from "@/features/admin/domain/admin-types";

export function handleAdminRequest(
  path: string,
  method: string,
  body: unknown,
  headers?: Headers
): unknown {
  const db = readDb();

  // 1. GET /admin/stats
  if (path === "/admin/stats" && method === "GET") {
    const totalVolume = db.offers.reduce(
      (sum, o) => sum + (o.totalVolumeKg || 0),
      0
    );
    const activeContracts = db.contracts.filter(
      (c) => c.status === "pending" || c.status === "approved"
    ).length;
    const approvedContracts = db.contracts.filter(
      (c) => c.status === "approved" || c.status === "completed"
    ).length;
    const flaggedOffers = db.offers.filter(
      (o) => o.moderationStatus === "Sedang diminta perbaikan"
    ).length;

    return {
      totalOffers: db.offers.length,
      totalVolumeKg: totalVolume,
      activeContracts,
      approvedContracts,
      flaggedOffers,
      registeredUsers: db.users.length,
      auditEntriesCount: db.auditLogs.length,
      dataFreshnessStatus: "Aktif & Valid (Sinkronisasi Otomatis)",
    };
  }

  // 2. GET /admin/users
  if (path === "/admin/users" && method === "GET") {
    // Return users with contact masking applied (0812-****-7890)
    return db.users.map((u) => {
      const p = u.phone || "";
      const maskedPhone =
        p.length >= 8
          ? `${p.slice(0, 4)}-****-${p.slice(-4)}`
          : "0812-****-7890";

      return {
        ...u,
        phone: maskedPhone,
      };
    });
  }

  // 3. GET /admin/parameters & POST /admin/parameters
  if (path === "/admin/parameters") {
    if (method === "GET") {
      return db.parameters;
    }
    if (method === "POST" || method === "PATCH") {
      const updates = body as Partial<SystemParameters>;
      db.parameters = {
        ...db.parameters,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      // Add to audit trail
      db.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorRole: "admin",
        actorName: "Pengawas Sistem",
        action: "Pembaruan Parameter Sistem",
        targetType: "KonfigurasiMesin",
        targetId: "engine-config",
        details: `Parameter diperbarui: Tenggat=${db.parameters.orderExpiryHours}j, Toleransi=${(db.parameters.fairPriceToleranceDelta * 100).toFixed(0)}%, Rendemen GKP=${(db.parameters.rendemenGKP * 100).toFixed(1)}%, HPP=Rp${db.parameters.governmentFloorPriceGKP?.toLocaleString("id-ID")}/kg`,
      });

      writeDb(db);
      return db.parameters;
    }
  }

  // 4. GET /admin/audit-logs
  if (path === "/admin/audit-logs" && method === "GET") {
    return db.auditLogs;
  }

  // 5. GET /admin/observations & POST /admin/observations/publish
  if (path === "/admin/observations") {
    if (method === "GET") {
      return db.observations;
    }
  }

  if (path === "/admin/observations/publish" && method === "POST") {
    db.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorRole: "admin",
      actorName: "Pengawas Sistem",
      action: "Publikasi Snapshot Harga",
      targetType: "DataObservasi",
      targetId: "snapshot-v2.5",
      details: "Mempublikasikan snapshot data observasi harga terverifikasi ke acuan harga pasar nasional.",
    });

    writeDb(db);
    return { success: true, message: "Snapshot harga berhasil dipublikasikan." };
  }

  // 6. POST /admin/moderation
  if (path === "/admin/moderation" && method === "POST") {
    const { offerId, action, note } = body as {
      offerId: string;
      action: "request_fix" | "resolve";
      note?: string;
    };

    const offer = db.offers.find((o) => o.id === offerId);
    if (!offer) {
      throw new ApiError(`Tawaran #${offerId} tidak ditemukan.`, 404, "NOT_FOUND");
    }

    if (action === "request_fix") {
      offer.moderationStatus = "Sedang diminta perbaikan";
      offer.moderationIssue = note || "Mohon periksa dan perbarui rincian informasi gabah.";
    } else {
      offer.moderationStatus = "Bersih";
      delete offer.moderationIssue;
    }

    db.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorRole: "admin",
      actorName: "Pengawas Sistem",
      action: action === "request_fix" ? "Permintaan Perbaikan Tawaran" : "Penyelesaian Temuan Moderasi",
      targetType: "PenawaranPanen",
      targetId: offerId,
      details:
        action === "request_fix"
          ? `Mengirim catatan temuan perbaikan informasi untuk tawaran #${offerId}: ${note}`
          : `Menutup temuan catatan moderasi untuk tawaran #${offerId}. Status kembali bersih.`,
    });

    writeDb(db);
    return { success: true, offer };
  }

  throw new ApiError(`Rute admin '${path}' [${method}] tidak ditemukan.`, 404, "NOT_FOUND");
}
