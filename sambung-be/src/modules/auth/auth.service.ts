import { randomInt } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import { createSession, digest, profileFields, publicProfile } from "./session.ts";
import type { Registration } from "./auth.schemas.ts";

export function authService(db: PrismaClient, consentVersion: string) {
  return {
    async requestOtp(phone: string) {
      const code = randomInt(10000).toString().padStart(4, "0");
      const now = new Date();
      const data = { digest: digest(phone + code), requestedAt: now,
        expiresAt: new Date(now.getTime() + 300000), attempts: 0 };
      await db.$transaction(async tx => {
        const renewed = await tx.otpChallenge.updateMany({ where: {
          phone, requestedAt: { lte: new Date(now.getTime() - 60000) },
        }, data });
        if (renewed.count) return;
        const created = await tx.otpChallenge.createMany({ data: [{ phone, ...data }], skipDuplicates: true });
        if (!created.count) throw new ApiError(429, "OTP_COOLDOWN", "Tunggu satu menit sebelum meminta kode baru.");
      });
      return code;
    },
    async verify(phone: string, code: string, previousHash: string) {
      const result = await db.$transaction(async tx => {
        const attempt = await tx.otpChallenge.updateMany({ where: { phone, attempts: { lt: 5 },
          expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } } });
        if (!attempt.count) return null;
        const consumed = await tx.otpChallenge.deleteMany({ where: { phone, digest: digest(phone + code) } });
        if (!consumed.count) return null;
        const account = await tx.account.findUnique({ where: { phone }, select: profileFields });
        if (account && (account.status !== "active" || account.role === "admin")) {
          throw new ApiError(403, "ACCESS_DENIED", "Akun ini tidak dapat masuk melalui OTP demo.");
        }
        await tx.authSession.deleteMany({ where: { OR: [
          { tokenHash: previousHash }, { expiresAt: { lte: new Date() } },
        ] } });
        const session = await createSession(tx, phone, account?.id ?? null);
        return { session, body: account ? { success: true, isNewUser: false, user: publicProfile(account) }
          : { success: true, isNewUser: true, phone } };
      });
      if (!result) throw new ApiError(401, "INVALID_OTP", "Kode salah atau sudah kedaluwarsa.");
      return result;
    },
    async register(input: Registration, tokenHash: string) {
      const { agreedToTerms, ...profile } = input;
      try {
        return await db.$transaction(async tx => {
          const proof = await tx.authSession.deleteMany({ where: { tokenHash, phone: profile.phone,
            accountId: null, expiresAt: { gt: new Date() } } });
          if (!proof.count) throw new ApiError(401, "VERIFICATION_REQUIRED", "Verifikasi nomor ponsel terlebih dahulu.");
          const account = await tx.account.create({ data: { ...profile, consentAt: new Date(), consentVersion }, select: profileFields });
          return { session: await createSession(tx, account.phone, account.id), body: { success: true, user: publicProfile(account) } };
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ApiError(409, "PHONE_REGISTERED", "Nomor ini sudah terdaftar. Silakan masuk kembali.");
        }
        throw error;
      }
    },
    async current(tokenHash: string) {
      const session = await db.authSession.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() },
        account: { status: "active" } }, select: { account: { select: profileFields } } });
      return session?.account ? publicProfile(session.account) : null;
    },
    async logout(tokenHash: string) {
      await db.authSession.deleteMany({ where: { tokenHash } });
    },
  };
}
