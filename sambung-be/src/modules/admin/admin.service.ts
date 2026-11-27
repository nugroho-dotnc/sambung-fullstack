import type { PrismaClient, Prisma } from "@prisma/client";
import { digest, createSession, maskPhone, profileFields, publicProfile } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { present, include } from "../offers/offers.service.ts";
import { MODERATION_MARKER, applyModerationNote } from "../offers/offer-moderation.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import {
  clearAiCache,
  fetchAiFairPriceParams,
  fetchAiModelEvaluation,
  ingestAiWeeklyPrices,
  predictAiLive,
  type AiLivePredictPayload,
  type AiWeeklyIngestPayload,
} from "../ai/ai-api.client.ts";

export interface CreateAuditLogInput {
  actorRole: "admin" | "petani" | "pembeli" | "sistem";
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}

export async function createAuditLog(
  client: PrismaClient | Prisma.TransactionClient,
  input: CreateAuditLogInput
) {
  return client.auditLog.create({
    data: {
      actorRole: input.actorRole,
      actorName: input.actorName,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details,
    },
  });
}

export async function adminLogin(db: PrismaClient, email: string, pass: string) {
  const account = await db.account.findFirst({
    where: { email: email.toLowerCase().trim(), role: "admin", status: "active" },
  });

  if (!account || account.passwordHash !== digest(pass)) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi pengawas tidak sesuai.");
  }

  const { token, maxAge } = await db.$transaction((tx) =>
    createSession(tx, account.phone, account.id)
  );

  await createAuditLog(db, {
    actorRole: "admin",
    actorName: account.name,
    action: "ADMIN_LOGIN",
    targetType: "account",
    targetId: account.id,
    details: "Masuk ke portal pengawas sistem.",
  });

  return { token, maxAge, user: publicProfile(account) };
}

export async function getAdminStats(db: PrismaClient) {
  const [
    totalOffers,
    volumeAgg,
    activeContracts,
    approvedContracts,
    flaggedOffers,
    registeredUsers,
    auditEntriesCount,
  ] = await Promise.all([
    db.offer.count({ where: { status: "published" } }),
    db.offer.aggregate({
      _sum: { totalVolumeKg: true },
      where: { status: "published" },
    }),
    db.contract.count({ where: { status: "pending" } }),
    db.contract.count({ where: { status: { in: ["approved", "completed"] } } }),
    db.offer.count({ where: { notes: { contains: MODERATION_MARKER } } }),
    db.account.count({ where: { status: "active" } }),
    db.auditLog.count(),
  ]);

  return {
    totalOffers,
    totalVolumeKg: Number(volumeAgg._sum.totalVolumeKg ?? 0),
    activeContracts,
    approvedContracts,
    flaggedOffers,
    registeredUsers,
    auditEntriesCount,
    dataFreshnessStatus: "Aktif & Valid",
  };
}

export async function getAdminUsers(db: PrismaClient) {
  const accounts = await db.account.findMany({
    select: { ...profileFields, email: true },
    orderBy: { consentAt: "desc" },
  });
  return accounts.map((account) =>
    publicProfile({
      ...account,
      phone: maskPhone(account.phone),
      email: account.email ?? undefined,
    })
  );
}

export async function getSystemParameters(db: PrismaClient) {
  const param = await db.systemParameter.upsert({
    where: { id: "active" },
    update: {},
    create: {
      id: "active",
      orderExpiryHours: 24,
      fairPriceToleranceDelta: 0.03,
      rendemenGKP: 0.5338,
      rendemenGKG: 0.6274,
      governmentFloorPriceGKP: 6500,
    },
  });

  return {
    orderExpiryHours: param.orderExpiryHours,
    fairPriceToleranceDelta: param.fairPriceToleranceDelta,
    rendemenGKP: param.rendemenGKP,
    rendemenGKG: param.rendemenGKG,
    governmentFloorPriceGKP: param.governmentFloorPriceGKP,
    lastUpdated: param.updatedAt.toISOString(),
  };
}

export async function updateSystemParameters(
  db: PrismaClient,
  actorName: string,
  updates: {
    orderExpiryHours?: number;
    fairPriceToleranceDelta?: number;
    rendemenGKP?: number;
    rendemenGKG?: number;
    governmentFloorPriceGKP?: number;
  }
) {
  const updated = await db.systemParameter.upsert({
    where: { id: "active" },
    update: {
      orderExpiryHours: updates.orderExpiryHours,
      fairPriceToleranceDelta: updates.fairPriceToleranceDelta,
      rendemenGKP: updates.rendemenGKP,
      rendemenGKG: updates.rendemenGKG,
      governmentFloorPriceGKP: updates.governmentFloorPriceGKP,
    },
    create: {
      id: "active",
      orderExpiryHours: updates.orderExpiryHours ?? 24,
      fairPriceToleranceDelta: updates.fairPriceToleranceDelta ?? 0.03,
      rendemenGKP: updates.rendemenGKP ?? 0.5338,
      rendemenGKG: updates.rendemenGKG ?? 0.6274,
      governmentFloorPriceGKP: updates.governmentFloorPriceGKP ?? 6500,
    },
  });

  await createAuditLog(db, {
    actorRole: "admin",
    actorName,
    action: "UPDATE_PARAMETERS",
    targetType: "system_parameter",
    targetId: "active",
    details: `Pembaruan parameter pasar: ${JSON.stringify(updates)}`,
  });

  clearAiCache();

  return {
    orderExpiryHours: updated.orderExpiryHours,
    fairPriceToleranceDelta: updated.fairPriceToleranceDelta,
    rendemenGKP: updated.rendemenGKP,
    rendemenGKG: updated.rendemenGKG,
    governmentFloorPriceGKP: updated.governmentFloorPriceGKP,
    lastUpdated: updated.updatedAt.toISOString(),
  };
}

export async function getAuditLogs(db: PrismaClient) {
  const logs = await db.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp.toISOString(),
    actorRole: l.actorRole as "admin" | "petani" | "pembeli" | "sistem",
    actorName: l.actorName,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    details: l.details,
  }));
}

interface FairPriceParamsObservationSource {
  updatedAt?: unknown;
  provinces?: Record<
    string,
    {
      province?: unknown;
      referenceSource?: unknown;
      GKP?: { medianPrice?: unknown };
    }
  >;
}

export async function getObservations() {
  const params = await fetchAiFairPriceParams<FairPriceParamsObservationSource>();
  if (!params || typeof params !== "object" || !params.provinces || typeof params.provinces !== "object") {
    throw new ApiError(
      502,
      "AI_UNEXPECTED_RESPONSE",
      "Format data observasi dari layanan AI tidak sesuai."
    );
  }

  const period =
    typeof params.updatedAt === "string" && params.updatedAt ? params.updatedAt : "Pekan Berjalan";

  const observations = Object.entries(params.provinces)
    .filter(([key, entry]) => key !== "Nasional" && entry?.province !== "Nasional")
    .flatMap(([key, entry]) => {
      const median = entry?.GKP?.medianPrice;
      if (typeof median !== "number" || !Number.isFinite(median)) {
        return [];
      }
      const province =
        typeof entry?.province === "string" && entry.province.trim() ? entry.province.trim() : key;
      const slug = province
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const source =
        typeof entry?.referenceSource === "string" && entry.referenceSource
          ? entry.referenceSource
          : "PIHPS BI Produsen & Bapanas";

      return [
        {
          id: `obs-${slug}-gkp`,
          province,
          commodity: "Gabah Kering Panen (GKP)",
          price: Math.round(median),
          unit: "Rp/kg",
          source,
          period,
          status: "Valid" as const,
        },
      ];
    })
    .sort((a, b) => a.province.localeCompare(b.province, "id"));

  if (observations.length === 0) {
    throw new ApiError(
      502,
      "AI_UNEXPECTED_RESPONSE",
      "Daftar observasi provinsi dari layanan AI kosong."
    );
  }

  return observations;
}

export async function publishObservations(db: PrismaClient, actorName: string) {
  await createAuditLog(db, {
    actorRole: "admin",
    actorName,
    action: "PUBLISH_OBSERVATIONS",
    targetType: "price_observation",
    targetId: "batch-current",
    details: "Publikasi snapshot observasi harga pasar ke seluruh sistem.",
  });

  clearAiCache();

  return { success: true, message: "Observasi pasar berhasil dipublikasikan." };
}

export async function getAdminModelEvaluation() {
  return fetchAiModelEvaluation();
}

export async function runAdminLivePrediction(payload: AiLivePredictPayload) {
  return predictAiLive(payload);
}

export async function runAdminAiIngest(
  db: PrismaClient,
  actorName: string,
  payload: AiWeeklyIngestPayload
) {
  const result = await ingestAiWeeklyPrices<{ updatedProvincesCount?: number }>(payload);

  const count =
    typeof result?.updatedProvincesCount === "number"
      ? result.updatedProvincesCount
      : payload.updates.length;

  await createAuditLog(db, {
    actorRole: "admin",
    actorName,
    action: payload.persist === false ? "AI_INGEST_DRY_RUN" : "AI_INGEST_WEEKLY",
    targetType: "ai_market_state",
    targetId: payload.weekStart,
    details:
      payload.persist === false
        ? `Uji kering (dry-run) ingest data AI pekan ${payload.weekStart} (${payload.updates.length} provinsi).`
        : `Ingest pembaruan harga pasar AI pekan ${payload.weekStart} (${count} provinsi diperbarui).`,
  });

  return result;
}

export async function moderateOffer(
  db: PrismaClient,
  offerId: string,
  action: "request_fix" | "resolve",
  note: string | undefined,
  actorName: string
) {
  const offer = await db.offer.findUnique({ where: { id: offerId }, include });
  if (!offer) {
    throw new ApiError(404, "NOT_FOUND", "Tawaran tidak ditemukan.");
  }

  const nextNotes = applyModerationNote(offer.notes, action, note);

  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.offer.update({
      where: { id: offerId },
      data: { notes: nextNotes },
      include,
    });

    await createNotification(tx, {
      accountId: offer.ownerId,
      type: "pasar",
      title:
        action === "request_fix"
          ? "Permintaan Perbaikan Informasi Tawaran"
          : "Catatan Pengawas pada Tawaran Ditutup",
      description:
        action === "request_fix"
          ? `Pengawas meminta klarifikasi pada tawaran ${offer.grainType} Anda: ${note?.trim()}`
          : `Catatan pengawas pada tawaran ${offer.grainType} Anda telah dinyatakan selesai.`,
      linkHref: `/petani/tawaran/${offerId}`,
    });

    await createAuditLog(tx, {
      actorRole: "admin",
      actorName,
      action: `MODERATE_OFFER_${action.toUpperCase()}`,
      targetType: "offer",
      targetId: offerId,
      details: `Tindakan moderasi ${action} pada tawaran ${offerId}. Catatan: ${note?.trim() || "-"}`,
    });

    return saved;
  });

  return { success: true, offer: present(updated) };
}
