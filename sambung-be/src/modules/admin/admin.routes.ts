import { Router, type Request } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { sessionHash } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { enforcePredictLiveRateLimit } from "../ai/ai-rate-limit.ts";
import {
  livePredictBodySchema,
  modelEvaluationQuerySchema,
  weeklyIngestBodySchema,
} from "../ai/ai.schemas.ts";
import {
  adminLogin,
  getAdminStats,
  getAdminUsers,
  getSystemParameters,
  updateSystemParameters,
  getAuditLogs,
  getObservations,
  publishObservations,
  moderateOffer,
  getAdminModelEvaluation,
  runAdminLivePrediction,
  runAdminAiIngest,
} from "./admin.service.ts";

export function adminRouter(db: PrismaClient, isSecure: boolean) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  async function getAdminActor(req: Request) {
    const session = await db.authSession.findFirst({
      where: {
        tokenHash: sessionHash(req),
        expiresAt: { gt: new Date() },
        account: { status: "active" },
      },
      include: { account: true },
    });
    if (!session?.account) {
      throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk ke portal pengawas terlebih dahulu.");
    }
    if (session.account.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "Halaman ini hanya dapat dibuka oleh akun pengawas sistem.");
    }
    return session.account;
  }

  router.post("/admin/auth/login", async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(req.body);

    const { token, maxAge, user } = await adminLogin(db, body.email, body.password);

    res.cookie("sambung_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure || req.secure,
      path: "/",
      maxAge,
    });

    res.json({ success: true, user });
  });

  router.get("/admin/stats", async (req, res) => {
    await getAdminActor(req);
    const stats = await getAdminStats(db);
    res.json(stats);
  });

  router.get("/admin/users", async (req, res) => {
    await getAdminActor(req);
    const users = await getAdminUsers(db);
    res.json(users);
  });

  router.get("/admin/parameters", async (req, res) => {
    await getAdminActor(req);
    const params = await getSystemParameters(db);
    res.json(params);
  });

  router.post("/admin/parameters", async (req, res) => {
    const actor = await getAdminActor(req);
    const body = z
      .object({
        orderExpiryHours: z.number().int().min(1).max(168).optional(),
        fairPriceToleranceDelta: z.number().min(0.005).max(0.25).optional(),
        rendemenGKP: z.number().min(0.4).max(0.75).optional(),
        rendemenGKG: z.number().min(0.4).max(0.75).optional(),
        governmentFloorPriceGKP: z.number().int().min(3000).max(20000).optional(),
      })
      .parse(req.body);

    const updated = await updateSystemParameters(db, actor.name, body);
    res.json(updated);
  });

  router.get("/admin/audit-logs", async (req, res) => {
    await getAdminActor(req);
    const logs = await getAuditLogs(db);
    res.json(logs);
  });

  router.get("/admin/observations", async (req, res) => {
    await getAdminActor(req);
    const observations = await getObservations();
    res.json(observations);
  });

  router.post("/admin/observations/publish", async (req, res) => {
    const actor = await getAdminActor(req);
    const result = await publishObservations(db, actor.name);
    res.json(result);
  });

  router.get("/admin/model-evaluation", async (req, res) => {
    await getAdminActor(req);
    modelEvaluationQuerySchema.parse(req.query);
    res.json(await getAdminModelEvaluation());
  });

  router.post("/admin/predict/live", async (req, res) => {
    const actor = await getAdminActor(req);
    enforcePredictLiveRateLimit(actor.id);
    const body = livePredictBodySchema.parse(req.body);
    res.json(await runAdminLivePrediction(body));
  });

  router.post("/admin/ai/ingest", async (req, res) => {
    const actor = await getAdminActor(req);
    const body = weeklyIngestBodySchema.parse(req.body);
    res.json(await runAdminAiIngest(db, actor.name, body));
  });

  router.post("/admin/moderation", async (req, res) => {
    const actor = await getAdminActor(req);
    const body = z
      .object({
        offerId: z.string().uuid(),
        action: z.enum(["request_fix", "resolve"]),
        note: z.string().optional(),
      })
      .parse(req.body);

    const result = await moderateOffer(db, body.offerId, body.action, body.note, actor.name);
    res.json(result);
  });

  return router;
}
