import { Router, type Request } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { sessionHash } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from "./notifications.service.ts";

export function notificationRouter(db: PrismaClient) {
  const router = Router();

  async function getActor(req: Request) {
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
    return session.account;
  }

  router.get("/notifications", async (req, res) => {
    const actor = await getActor(req);
    const notifications = await getUserNotifications(db, actor.id);
    res.json({ data: notifications });
  });

  router.post("/notifications/read-all", async (req, res) => {
    const actor = await getActor(req);
    const result = await markAllAsRead(db, actor.id);
    res.json(result);
  });

  router.post("/notifications/:id/read", async (req, res) => {
    const actor = await getActor(req);
    const id = z.string().uuid().parse(req.params.id);
    const result = await markAsRead(db, actor.id, id);
    res.json({ data: result });
  });

  return router;
}
