import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { requestSchema, verifySchema, registerSchema } from "./auth.schemas.ts";
import { authService } from "./auth.service.ts";
import { sessionHash } from "./session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { getOtpSender } from "./otp/otp-factory.ts";

export function authRouter(db: PrismaClient, secure: boolean, consentVersion: string) {
  const router = Router();
  const auth = authService(db, consentVersion);
  const cookieBase = (req: Request) => ({
    httpOnly: true,
    secure: secure || req.secure,
    sameSite: "lax" as const,
    path: "/",
  });
  function signedIn(
    req: Request,
    res: Response,
    result: { session: { token: string; maxAge: number }; body: unknown }
  ) {
    res
      .cookie("sambung_session", result.session.token, {
        ...cookieBase(req),
        maxAge: result.session.maxAge,
      })
      .json(result.body);
  }
  router.get("/otp/mode", (_req, res) => {
    const sender = getOtpSender();
    res.json({ otpMode: sender.mode });
  });
  router.post("/otp/request", async (req, res) => {
    const input = requestSchema.safeParse(req.body);
    if (!input.success) throw new ApiError(422, "INVALID_PHONE", "Masukkan nomor ponsel Indonesia yang valid.");
    
    const sender = getOtpSender();
    const code = await auth.requestOtp(input.data.phone);
    const sendResult = await sender.send(input.data.phone, code);

    if (!sendResult.success && sender.mode === "live") {
      throw new ApiError(502, "OTP_DELIVERY_FAILED", sendResult.error || "Gagal mengirim kode verifikasi ke WhatsApp Anda.");
    }

    res.json({
      success: true,
      otpMode: sender.mode,
      message: sendResult.message || (sender.mode === "live" ? "Kode verifikasi telah dikirim via WhatsApp." : "Kode demo siap digunakan."),
      debugHint: sender.mode === "demo" ? "Kode demo Anda: " + code : undefined,
    });
  });
  router.post("/otp/verify", async (req, res) => {
    const input = verifySchema.parse(req.body);
    signedIn(req, res, await auth.verify(input.phone, input.otpCode, sessionHash(req)));
  });
  router.post("/register", async (req, res) => {
    signedIn(req, res, await auth.register(registerSchema.parse(req.body), sessionHash(req)));
  });
  router.get("/me", async (req, res) => { res.json({ user: await auth.current(sessionHash(req)) }); });
  router.post("/logout", async (req, res) => {
    await auth.logout(sessionHash(req));
    res.clearCookie("sambung_session", cookieBase(req)).json({ success: true });
  });
  return router;
}
