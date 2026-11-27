import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Request } from "express";
import { ApiError } from "../../shared/api-error.ts";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function sessionHash(req: Request) {
  const token = req.headers.cookie?.match(/(?:^|;\s*)sambung_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  return token ? digest(token) : "";
}
export async function createSession(tx: Prisma.TransactionClient, phone: string, accountId: string | null) {
  const token = randomBytes(32).toString("hex");
  const maxAge = (accountId ? 480 : 10) * 60000;
  await tx.authSession.create({ data: {
    phone, accountId, tokenHash: digest(token), expiresAt: new Date(Date.now() + maxAge),
  }});
  return { token, maxAge };
}
export const profileFields = {
  id: true, phone: true, name: true, role: true, province: true, regency: true,
  district: true, status: true, businessName: true, proExpiresAt: true,
} as const;

/**
 * Returns true when an account is a buyer with an unexpired Pembeli Pro period.
 */
export function isBuyerPro(
  user: { role?: string | null; proExpiresAt?: Date | string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!user || user.role !== "pembeli" || !user.proExpiresAt) return false;
  const expiresMs =
    user.proExpiresAt instanceof Date
      ? user.proExpiresAt.getTime()
      : Date.parse(user.proExpiresAt);
  return Number.isFinite(expiresMs) && expiresMs > now.getTime();
}

export function publicProfile<
  T extends { businessName: string | null; role?: string; proExpiresAt?: Date | null }
>(user: T) {
  const activePro = isBuyerPro(user);
  return {
    ...user,
    businessName: user.businessName ?? undefined,
    proExpiresAt: user.proExpiresAt ? user.proExpiresAt.toISOString() : null,
    isPro: activePro,
    subscriptionPlan: activePro ? ("pro" as const) : ("free" as const),
  };
}

/**
 * Resolves the active account from the session cookie without throwing when unauthenticated.
 */
export async function resolveOptionalActor(db: PrismaClient, req: Request) {
  const hash = sessionHash(req);
  if (!hash) return null;
  const session = await db.authSession.findFirst({
    where: {
      tokenHash: hash,
      expiresAt: { gt: new Date() },
      account: { status: "active" },
    },
    select: {
      account: {
        select: {
          id: true,
          role: true,
          province: true,
          proExpiresAt: true,
        },
      },
    },
  });
  return session?.account ?? null;
}

/**
 * Requires an active authenticated account from the session cookie, throwing 401 otherwise.
 */
export async function requireActiveActor(db: PrismaClient, req: Request) {
  const actor = await resolveOptionalActor(db, req);
  if (!actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Masuk terlebih dahulu.");
  }
  return actor;
}

/**
 * Masks phone numbers for supervisor views so personal contacts are never exposed raw.
 */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length >= 8) {
    return `${trimmed.slice(0, 4)}-****-${trimmed.slice(-4)}`;
  }
  return "****";
}
