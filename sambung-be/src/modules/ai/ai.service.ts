import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import {
  calculateAiFairPrice,
  fetchAiFairPriceParams,
  fetchAiHealth,
  fetchAiPriceBoard,
  fetchAiSpatialDisparity,
} from "./ai-api.client.ts";
import type {
  fairPriceCalculateBodySchema,
  priceBoardQuerySchema,
  spatialDisparityQuerySchema,
} from "./ai.schemas.ts";

const RENDEMEN_MIN = 0.4;
const RENDEMEN_MAX = 0.75;
const HPP_MIN = 3000;
const HPP_MAX = 20000;

export function resolveValidRendemen(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= RENDEMEN_MIN && value <= RENDEMEN_MAX) {
    return value;
  }
  return undefined;
}

export function resolveValidHpp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= HPP_MIN && value <= HPP_MAX) {
    return value;
  }
  return undefined;
}

export function resolveValidTolerance(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return 0.03;
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyGrainRendemenOverlay(
  grain: "GKP" | "GKG",
  empiricalParams: Record<string, unknown> | undefined,
  provinces: Record<string, unknown> | undefined,
  overrideRendemen: number | undefined
): number | undefined {
  const empEntry = empiricalParams && isPlainRecord(empiricalParams[grain])
    ? (empiricalParams[grain] as Record<string, unknown>)
    : undefined;
  const origRendemen = typeof empEntry?.rendemenSkgb === "number" ? empEntry.rendemenSkgb : undefined;

  if (overrideRendemen === undefined) {
    return origRendemen;
  }
  if (!empEntry) {
    return overrideRendemen;
  }

  empEntry.rendemenSkgb = overrideRendemen;
  if (origRendemen === overrideRendemen || !provinces) {
    return overrideRendemen;
  }

  const p10 = typeof empEntry.p10 === "number" ? empEntry.p10 : undefined;
  const p50 = typeof empEntry.p50 === "number" ? empEntry.p50 : undefined;
  const p90 = typeof empEntry.p90 === "number" ? empEntry.p90 : undefined;
  if (p10 === undefined || p50 === undefined || p90 === undefined) {
    return overrideRendemen;
  }

  for (const prov of Object.values(provinces)) {
    if (!isPlainRecord(prov) || typeof prov.riceReferencePrice !== "number") {
      continue;
    }
    const grainEntry = isPlainRecord(prov[grain]) ? (prov[grain] as Record<string, unknown>) : undefined;
    if (!grainEntry) {
      continue;
    }
    const base = prov.riceReferencePrice * overrideRendemen;
    grainEntry.lowerBound = roundHalfUp(base * p10);
    grainEntry.medianPrice = roundHalfUp(base * p50);
    grainEntry.upperBound = roundHalfUp(base * p90);
  }

  return overrideRendemen;
}

export async function getAiHealth() {
  return fetchAiHealth();
}

export async function getSpatialDisparity(query: z.infer<typeof spatialDisparityQuerySchema>) {
  return fetchAiSpatialDisparity(query);
}

export async function getPriceBoard(query: z.infer<typeof priceBoardQuerySchema>) {
  return fetchAiPriceBoard(query);
}

/**
 * Fetches fair-price parameters and safely overlays active DB SystemParameters without mutating cache.
 */
export async function getFairPriceParams(db: PrismaClient) {
  const [rawParams, sysParam] = await Promise.all([
    fetchAiFairPriceParams<Record<string, unknown>>(),
    db.systemParameter.findUnique({ where: { id: "active" } }),
  ]);

  const cloned = structuredClone(rawParams);
  const empiricalParams = isPlainRecord(cloned.empiricalParams)
    ? (cloned.empiricalParams as Record<string, unknown>)
    : undefined;
  const provinces = isPlainRecord(cloned.provinces)
    ? (cloned.provinces as Record<string, unknown>)
    : undefined;
  const hppActive2026 = isPlainRecord(cloned.hppActive2026)
    ? (cloned.hppActive2026 as Record<string, unknown>)
    : undefined;

  const gkpRendemen = resolveValidRendemen(sysParam?.rendemenGKP);
  const gkgRendemen = resolveValidRendemen(sysParam?.rendemenGKG);
  const gkpHpp = resolveValidHpp(sysParam?.governmentFloorPriceGKP);
  const toleranceDelta = resolveValidTolerance(sysParam?.fairPriceToleranceDelta);

  const resolvedGkpRendemen = applyGrainRendemenOverlay("GKP", empiricalParams, provinces, gkpRendemen);
  const resolvedGkgRendemen = applyGrainRendemenOverlay("GKG", empiricalParams, provinces, gkgRendemen);

  if (hppActive2026 && gkpHpp !== undefined) {
    hppActive2026.GKP = gkpHpp;
  }

  const effectiveGkpRendemen = resolvedGkpRendemen ?? 0.5338;
  const effectiveGkgRendemen = resolvedGkgRendemen ?? 0.6274;
  const effectiveGkpHpp =
    gkpHpp ?? (typeof hppActive2026?.GKP === "number" ? hppActive2026.GKP : 6500);

  return {
    ...cloned,
    toleranceDelta,
    systemParameters: {
      fairPriceToleranceDelta: toleranceDelta,
      rendemenGKP: effectiveGkpRendemen,
      rendemenGKG: effectiveGkgRendemen,
      governmentFloorPriceGKP: effectiveGkpHpp,
    },
  };
}

/**
 * Proxies deterministic fair-price calculation with active DB defaults when caller omits overrides.
 */
export async function calculateFairPrice(
  db: PrismaClient,
  body: z.infer<typeof fairPriceCalculateBodySchema>
) {
  const sysParam = await db.systemParameter.findUnique({ where: { id: "active" } });

  const defaultRendemen =
    body.grainType === "GKP"
      ? resolveValidRendemen(sysParam?.rendemenGKP)
      : resolveValidRendemen(sysParam?.rendemenGKG);
  const defaultHpp =
    body.grainType === "GKP" ? resolveValidHpp(sysParam?.governmentFloorPriceGKP) : undefined;

  return calculateAiFairPrice({
    ...body,
    rendemen: body.rendemen ?? defaultRendemen,
    hppGovernment: body.hppGovernment ?? defaultHpp,
  });
}
