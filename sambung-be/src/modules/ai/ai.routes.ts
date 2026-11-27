import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import {
  hasFullAnalyticsAccess,
  isBuyerPro,
  requireActiveActor,
  resolveOptionalActor,
} from "../auth/session.ts";
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

function sanitizeSpatialDisparityForPreview(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return payload;
  }
  const source = payload as Record<string, unknown>;
  const {
    explainerMetrics: _explainerMetrics,
    spatialShapMaxAdditivityErrRp: _maxErr,
    provinces: rawProvinces,
    ...rest
  } = source;

  const provinces = Array.isArray(rawProvinces)
    ? rawProvinces.map((entry) => {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          return entry;
        }
        const {
          surplusRatio: _surplusRatio,
          spatialFactors: _spatialFactors,
          ...provRest
        } = entry as Record<string, unknown>;
        return {
          ...provRest,
          spatialFactors: [],
        };
      })
    : rawProvinces;

  return {
    ...rest,
    restrictedPreview: true,
    provinces,
  };
}

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
    const [actor, data] = await Promise.all([
      resolveOptionalActor(db, req),
      getSpatialDisparity(query),
    ]);
    res.json(
      hasFullAnalyticsAccess(actor)
        ? data
        : sanitizeSpatialDisparityForPreview(data)
    );
  });

  router.get("/price-board", async (req, res) => {
    const query = priceBoardQuerySchema.parse(req.query);
    res.json(await getPriceBoard(query));
  });

  router.get("/price-history", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const actor = await requireActiveActor(db, req);
    const query = priceHistoryQuerySchema.parse(req.query);
    if (
      actor.role === "pembeli" &&
      !isBuyerPro(actor) &&
      !FREE_BUYER_HISTORY_RANGES.has(query.range)
    ) {
      throw new ApiError(
        403,
        "SUBSCRIPTION_REQUIRED",
        "Riwayat harga lebih dari 12 minggu hanya tersedia untuk anggota Produsen Pro."
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
