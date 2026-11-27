import { Router, type Request } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "../../shared/api-error.ts";
import { sessionHash } from "../auth/session.ts";
import { initiatePaymentBodySchema } from "./payments.schemas.ts";
import {
  handleMidtransWebhook,
  initiateContractPayment,
  syncContractPayment,
} from "./payments.service.ts";

/**
 * Express router exposing Midtrans Sandbox escrow payment endpoints and webhook handler.
 */
export function paymentsRouter(db: PrismaClient) {
  const router = Router();

  async function requireActor(req: Request) {
    const session = await db.authSession.findFirst({
      where: {
        tokenHash: sessionHash(req),
        expiresAt: { gt: new Date() },
        account: { status: "active" },
      },
      include: { account: true },
    });
    if (!session?.account) {
      throw new ApiError(401, "UNAUTHENTICATED", "Masuk terlebih dahulu.");
    }
    if (!["petani", "pembeli", "admin"].includes(session.account.role)) {
      throw new ApiError(403, "FORBIDDEN", "Akses terbatas untuk pihak kontrak.");
    }
    return { id: session.account.id, role: session.account.role };
  }

  router.post("/contracts/:id/payment/initiate", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const actor = await requireActor(req);
    const contractId = z.uuid("ID kontrak tidak valid.").parse(req.params.id);
    const body = initiatePaymentBodySchema.parse(req.body);
    const result = await initiateContractPayment(db, actor, contractId, body);
    res.json({ data: result });
  });

  router.post("/contracts/:id/payment/sync", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const actor = await requireActor(req);
    const contractId = z.uuid("ID kontrak tidak valid.").parse(req.params.id);
    const result = await syncContractPayment(db, actor, contractId);
    res.json({ data: result });
  });

  router.post("/payments/midtrans/webhook", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const result = await handleMidtransWebhook(db, req.body);
    res.json(result);
  });

  return router;
}
