import { marketRouter } from "./modules/offers/offers.routes.ts";
import { contractRouter } from "./modules/contracts/contracts.routes.ts";
import { forecastRouter } from "./modules/forecast/forecast.routes.ts";
import { notificationRouter } from "./modules/notifications/notifications.routes.ts";
import { adminRouter } from "./modules/admin/admin.routes.ts";
import express from "express";
import { ApiError } from "./shared/api-error.ts";
import { authRouter } from "./modules/auth/auth.routes.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { parseAllowedOrigins } from "./config/env.ts";
import type { PrismaClient } from "@prisma/client";

export function createApp(db: PrismaClient, origin: string, consentVersion = "demo-v1") {
  const app = express();
  const allowedOrigins = parseAllowedOrigins(origin);
  const secureCookie = allowedOrigins.length > 0 && allowedOrigins.every((item) => item.startsWith("https:"));

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.vary("Origin");
    const requestOrigin = req.headers.origin;
    if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
      throw new ApiError(
        403,
        "ORIGIN_DENIED",
        "Akses ditolak karena alamat situs belum terdaftar pada server."
      );
    }
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.set("Access-Control-Allow-Origin", requestOrigin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
      res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    if (
      ["POST", "PATCH"].includes(req.method) &&
      req.path !== "/auth/logout" &&
      !req.is("application/json")
    ) {
      throw new ApiError(415, "JSON_REQUIRED", "Gunakan format JSON untuk mengirim data.");
    }
    next();
  });

  app.use(express.json({ limit: "32kb" }));
  app.get("/", (_req, res) => {
    res.send("Hello World!");
  });
  app.get("/health", async (_req, res) => {
    await db.account.findFirst({ select: { id: true } });
    res.json({ status: "ok" });
  });
  app.use(
    "/auth",
    (_req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    },
    authRouter(db, secureCookie, consentVersion)
  );
  app.use("/contracts", contractRouter(db));
  app.use(forecastRouter());
  app.use(notificationRouter(db));
  app.use(adminRouter(db, secureCookie));
  app.use(marketRouter(db));
  app.use((_req, _res, next) =>
    next(
      new ApiError(
        404,
        "NOT_FOUND",
        "Halaman atau layanan API yang diminta tidak ditemukan."
      )
    )
  );
  app.use(errorHandler);
  return app;
}
