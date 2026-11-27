import { Router, type Request } from "express";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import { sessionHash } from "../auth/session.ts";
import {
  subscriptionCheckoutSchema,
  subscriptionSyncSchema,
} from "./subscriptions.schemas.ts";
import {
  checkoutSubscription,
  getSubscriptionMe,
  syncSubscriptionPayment,
} from "./subscriptions.service.ts";

/**
 * Express router exposing Pembeli Pro subscription status, checkout, and manual payment sync.
 */
export function subscriptionsRouter(db: PrismaClient) {
  const router = Router();

  async function requireActiveActor(req: Request) {
    const session = await db.authSession.findFirst({
      where: {
        tokenHash: sessionHash(req),
        expiresAt: { gt: new Date() },
        account: { status: "active" },
      },
      select: {
        account: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });
    if (!session?.account) {
      throw new ApiError(401, "UNAUTHENTICATED", "Masuk terlebih dahulu.");
    }
    return session.account;
  }

  router.get("/subscription/me", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const actor = await requireActiveActor(req);
    res.json({ data: await getSubscriptionMe(db, actor.id) });
  });

  router.post("/subscription/checkout", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const actor = await requireActiveActor(req);
    const body = subscriptionCheckoutSchema.parse(req.body);
    res.json({ data: await checkoutSubscription(db, actor, body) });
  });

  router.post("/subscription/sync", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const actor = await requireActiveActor(req);
    const body = subscriptionSyncSchema.parse(req.body);
    res.json({ data: await syncSubscriptionPayment(db, actor, body) });
  });

  return router;
}
