import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  fairPriceCalculateBodySchema,
  fairPriceParamsQuerySchema,
  priceBoardQuerySchema,
  spatialDisparityQuerySchema,
} from "./ai.schemas.ts";
import {
  calculateFairPrice,
  getAiHealth,
  getFairPriceParams,
  getPriceBoard,
  getSpatialDisparity,
} from "./ai.service.ts";

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
