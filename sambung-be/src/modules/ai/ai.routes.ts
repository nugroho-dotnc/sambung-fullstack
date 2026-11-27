import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import { isBuyerPro, resolveOptionalActor } from "../auth/session.ts";
import {
  fairPriceCalculateBodySchema,
  fairPriceParamsQuerySchema,
  priceBoardQuerySchema,
  priceHistoryQuerySchema,
  spatialDisparityQuerySchema,
} from "./ai.schemas.ts";
import {
  calculateFairPrice,
  getAiHealth,
  getFairPriceParams,
  getPriceBoard,
  getSpatialDisparity,
} from "./ai.service.ts";
import { getPriceHistory } from "./price-history.service.ts";

const FREE_BUYER_HISTORY_RANGES = new Set(["4w", "8w", "12w"]);

/**
 * Express router exposing validated public AI proxy endpoints.
 */
export function aiRouter(db: PrismaClient) {
  const router = Router();

  router.get("/ai/health", async (_req, res) => {
    const result = await getAiHealth();
    res.status(result.httpStatus).json(result.data);
  });

  router.get("/spatial-disparity", async (req, res) => {
    const query = spatialDisparityQuerySchema.parse(req.query);
    res.json(await getSpatialDisparity(query));
  });

  router.get("/price-board", async (req, res) => {
    const query = priceBoardQuerySchema.parse(req.query);
    res.json(await getPriceBoard(query));
  });

  router.get("/price-history", async (req, res) => {
    const query = priceHistoryQuerySchema.parse(req.query);
    const actor = await resolveOptionalActor(db, req);
    if (actor?.role === "pembeli" && !isBuyerPro(actor) && !FREE_BUYER_HISTORY_RANGES.has(query.range)) {
      throw new ApiError(
        403,
        "SUBSCRIPTION_REQUIRED",
        "Rentang riwayat harga di atas 12 pekan hanya tersedia untuk paket Pembeli Pro."
      );
    }
    res.json(await getPriceHistory(db, query));
  });

  router.get("/fair-price/params", async (req, res) => {
    fairPriceParamsQuerySchema.parse(req.query);
    res.json(await getFairPriceParams(db));
  });

  router.post("/fair-price/calculate", async (req, res) => {
    const body = fairPriceCalculateBodySchema.parse(req.body);
    res.json(await calculateFairPrice(db, body));
  });

  return router;
}
