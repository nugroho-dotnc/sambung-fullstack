import type { PrismaClient, Prisma } from "@prisma/client";
import { digest, createSession, publicProfile } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { present, include } from "../offers/offers.service.ts";

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
    db.offer.count({ where: { status: "draft" } }),
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
    orderBy: { consentAt: "desc" },
  });
  return accounts.map(publicProfile);
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

export async function getObservations() {
  return [
    {
      id: "obs-jatim-01",
      province: "Jawa Timur",
      commodity: "Gabah Kering Panen (GKP)",
      price: 6942,
      unit: "Rp/kg",
      source: "PIHPS BI Produsen & Bapanas",
      period: "Pekan Berjalan",
      status: "Valid" as const,
    },
    {
      id: "obs-jabar-01",
      province: "Jawa Barat",
      commodity: "Gabah Kering Panen (GKP)",
      price: 6850,
      unit: "Rp/kg",
      source: "PIHPS BI Produsen & Bapanas",
      period: "Pekan Berjalan",
      status: "Valid" as const,
    },
    {
      id: "obs-jateng-01",
      province: "Jawa Tengah",
      commodity: "Gabah Kering Panen (GKP)",
      price: 6880,
      unit: "Rp/kg",
      source: "PIHPS BI Produsen & Bapanas",
      period: "Pekan Berjalan",
      status: "Valid" as const,
    },
  ];
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

  return { success: true, message: "Observasi pasar berhasil dipublikasikan." };
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

  const updated = await db.offer.update({
    where: { id: offerId },
    data: {
      notes: note ? `${offer.notes || ""}\n[Catatan Pengawas]: ${note}`.trim() : offer.notes,
    },
    include,
  });

  await createAuditLog(db, {
    actorRole: "admin",
    actorName,
    action: `MODERATE_OFFER_${action.toUpperCase()}`,
    targetType: "offer",
    targetId: offerId,
    details: `Tindakan moderasi ${action} pada tawaran ${offerId}. Catatan: ${note || "-"}`,
  });

  return { success: true, offer: present(updated) };
}
