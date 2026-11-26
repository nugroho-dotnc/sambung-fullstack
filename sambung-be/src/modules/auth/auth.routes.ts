import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { requestSchema, verifySchema, registerSchema } from "./auth.schemas.ts";
import { authService } from "./auth.service.ts";
import { sessionHash } from "./session.ts";
import { ApiError } from "../../shared/api-error.ts";

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
  router.post("/otp/request", async (req, res) => {
    const input = requestSchema.safeParse(req.body);
    if (!input.success) throw new ApiError(422, "INVALID_PHONE", "Masukkan nomor ponsel Indonesia yang valid.");
    const code = await auth.requestOtp(input.data.phone);
    res.json({ success: true, message: "Kode demo siap digunakan.", debugHint: "Kode demo Anda: " + code });
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
