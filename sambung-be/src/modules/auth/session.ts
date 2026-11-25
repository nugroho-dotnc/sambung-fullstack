import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";

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
  district: true, status: true, businessName: true,
} as const;
export function publicProfile<T extends { businessName: string | null }>(user: T) {
  return { ...user, businessName: user.businessName ?? undefined };
}
