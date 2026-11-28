import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { fetchAiForecasts, type AiWeeklyIngestPayload } from "./ai-api.client.ts";
import type { priceHistoryQuerySchema } from "./ai.schemas.ts";

export const PRICE_HISTORY_COMMODITY = "Beras Medium I";
export const FARMER_EQUIV_RATIO = 0.9669;

const FORECAST_SYNC_COOLDOWN_MS = 5 * 60_000;
const FORECAST_SYNC_ERROR_BACKOFF_MS = 30_000;
const COVERED_REGIONS_TTL_MS = 5 * 60_000;

const forecastSyncUntil = new Map<string, number>();
const forecastSyncInFlight = new Map<string, Promise<number>>();
let coveredRegionsCache: { regions: string[]; expiresAt: number } | null = null;
let cacheEpoch = 0;

/**
 * Clears cached forecast sync cooldowns and covered region lookups.
 */
export function clearPriceHistoryCache(): void {
  forecastSyncUntil.clear();
  forecastSyncInFlight.clear();
  coveredRegionsCache = null;
  cacheEpoch += 1;
}

const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

interface UpstreamForecastRecord {
  province?: unknown;
  horizonWeeks?: unknown;
  targetDateIso?: unknown;
  riceProducerPrice?: unknown;
  gkpEstimate?: unknown;
  confidenceInterval80?: unknown;
  method?: unknown;
}

interface UpstreamForecastPayload {
  modelVersion?: unknown;
  records?: UpstreamForecastRecord[];
}

export type PriceHistoryRowStatus = "actual" | "predicted" | "actual_with_prediction";

export interface PriceHistoryRowDto {
  weekStart: string;
  weekLabel: string;
  shortWeekLabel: string;
  year: number;
  rowStatus: PriceHistoryRowStatus;
  source: string;
  farmerPrice: number | null;
  millerPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  predictedFarmerPrice: number | null;
  predictedMillerPrice: number | null;
  predictedGkpPrice: number | null;
  predictionLower80: number | null;
  predictionUpper80: number | null;
  predictionHorizonWeeks: number | null;
  predictionMethod: string | null;
  predictionModelVersion: string | null;
  farmerSharePercent: number | null;
  marginAmount: number | null;
  millerChangeRp: number | null;
  millerChangePct: number | null;
  predictionErrorRp: number | null;
}

function toUtcDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatShortWeekLabel(isoDate: string): string {
  const [_, monthStr, dayStr] = isoDate.split("-");
  const monthIdx = Number(monthStr) - 1;
  const dayNum = Number(dayStr);
  const monthLabel = MONTH_SHORT_ID[monthIdx] ?? monthStr;
  return `${dayNum} ${monthLabel}`;
}

function formatFullWeekLabel(isoDate: string): string {
  const [yearStr] = isoDate.split("-");
  return `${formatShortWeekLabel(isoDate)} ${yearStr}`;
}

/**
 * Syncs official 2w/4w producer forecasts into market_price_history without overwriting actual observations.
 */
export async function syncForecastPredictionsToHistory(
  db: PrismaClient,
  region: string,
  options?: { force?: boolean }
): Promise<number> {
  const normalizedRegion = region.trim();
  if (!normalizedRegion || normalizedRegion === "Nasional") {
    return 0;
  }

  const syncKey = `${(process.env.AI_BASE_URL ?? "").trim()}|${normalizedRegion.toLowerCase()}`;
  if (!options?.force) {
    const until = forecastSyncUntil.get(syncKey);
    if (until !== undefined && Date.now() < until) {
      return 0;
    }
  }

  const activeFlight = forecastSyncInFlight.get(syncKey);
  if (activeFlight) {
    return activeFlight;
  }

  const requestEpoch = cacheEpoch;
  const flightPromise = (async (): Promise<number> => {
    let payload: UpstreamForecastPayload;
    try {
      payload = await fetchAiForecasts<UpstreamForecastPayload>({ province: normalizedRegion });
    } catch (err) {
      console.warn(
        "[PriceHistory] Gagal menyinkronkan prediksi AI:",
        err instanceof Error ? err.message : String(err)
      );
      if (cacheEpoch === requestEpoch) {
        forecastSyncUntil.set(syncKey, Date.now() + FORECAST_SYNC_ERROR_BACKOFF_MS);
      }
      return 0;
    }

    const records = Array.isArray(payload?.records) ? payload.records : [];
    const modelVersion =
      typeof payload?.modelVersion === "string" && payload.modelVersion.trim()
        ? payload.modelVersion.trim()
        : "sambung-predict-v1";
    const now = new Date();
    const upsertTasks: Array<{
      canonicalRegion: string;
      targetDateIso: string;
      run: () => Promise<unknown>;
    }> = [];

    for (const rec of records) {
      if (
        typeof rec?.province !== "string" ||
        rec.province.trim().toLowerCase() !== normalizedRegion.toLowerCase()
      ) {
        continue;
      }
      if (rec.horizonWeeks !== 2 && rec.horizonWeeks !== 4) {
        continue;
      }
      if (typeof rec.targetDateIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rec.targetDateIso)) {
        continue;
      }
      if (
        typeof rec.riceProducerPrice !== "number" ||
        !Number.isFinite(rec.riceProducerPrice) ||
        rec.riceProducerPrice <= 0
      ) {
        continue;
      }

      const predictedMillerPrice = Math.round(rec.riceProducerPrice);
      const predictedFarmerPrice = Math.round(predictedMillerPrice * FARMER_EQUIV_RATIO);
      if (predictedMillerPrice <= 0 || predictedFarmerPrice <= 0) {
        continue;
      }

      const predictedGkpPrice =
        typeof rec.gkpEstimate === "number" && Number.isFinite(rec.gkpEstimate) && rec.gkpEstimate > 0
          ? Math.round(rec.gkpEstimate)
          : null;

      const ci =
        Array.isArray(rec.confidenceInterval80) && rec.confidenceInterval80.length === 2
          ? rec.confidenceInterval80
          : null;
      const predictionLower80 =
        ci && typeof ci[0] === "number" && Number.isFinite(ci[0]) && ci[0] > 0
          ? Math.round(ci[0])
          : null;
      const predictionUpper80 =
        ci && typeof ci[1] === "number" && Number.isFinite(ci[1]) && ci[1] > 0
          ? Math.round(ci[1])
          : null;
      const predictionMethod =
        typeof rec.method === "string" && rec.method.trim() ? rec.method.trim() : null;

      const canonicalRegion = rec.province.trim();
      const targetDateIso = rec.targetDateIso;
      const weekDate = toUtcDateOnly(targetDateIso);

      const predictionFields = {
        predictedFarmerPrice,
        predictedMillerPrice,
        predictedGkpPrice,
        predictionLower80,
        predictionUpper80,
        predictionHorizonWeeks: rec.horizonWeeks,
        predictionMethod,
        predictionModelVersion: modelVersion,
        predictedAt: now,
      };

      upsertTasks.push({
        canonicalRegion,
        targetDateIso,
        run: () =>
          db.marketPriceHistory.upsert({
            where: {
              region_commodity_weekStart: {
                region: canonicalRegion,
                commodity: PRICE_HISTORY_COMMODITY,
                weekStart: weekDate,
              },
            },
            create: {
              region: canonicalRegion,
              commodity: PRICE_HISTORY_COMMODITY,
              weekStart: weekDate,
              source: "ai_forecast",
              ...predictionFields,
            },
            update: predictionFields,
          }),
      });
    }

    const settled = await Promise.allSettled(upsertTasks.map((task) => task.run()));
    let upserted = 0;
    settled.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        upserted += 1;
      } else {
        const task = upsertTasks[idx];
        console.warn(
          `[PriceHistory] Gagal menyimpan prediksi ${task.canonicalRegion} ${task.targetDateIso}:`,
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        );
      }
    });

    if (cacheEpoch === requestEpoch) {
      forecastSyncUntil.set(syncKey, Date.now() + FORECAST_SYNC_COOLDOWN_MS);
    }

    return upserted;
  })();

  forecastSyncInFlight.set(syncKey, flightPromise);
  try {
    return await flightPromise;
  } finally {
    if (forecastSyncInFlight.get(syncKey) === flightPromise) {
      forecastSyncInFlight.delete(syncKey);
    }
  }
}

/**
 * Persists confirmed weekly admin observations into market_price_history while keeping prior predictions intact.
 */
export async function recordAdminIngestToPriceHistory(
  db: PrismaClient,
  payload: AiWeeklyIngestPayload
): Promise<number> {
  if (payload.persist === false || !Array.isArray(payload.updates) || payload.updates.length === 0) {
    return 0;
  }

  const weekDate = toUtcDateOnly(payload.weekStart);

  await db.$transaction(async (tx) => {
    for (const item of payload.updates) {
      const region = item.province.trim();
      const millerPrice = Math.round(item.producerPrice);
      const farmerPrice = Math.round(millerPrice * FARMER_EQUIV_RATIO);
      const wholesalePrice =
        typeof item.wholesalePrice === "number" &&
        Number.isFinite(item.wholesalePrice) &&
        item.wholesalePrice > 0
          ? Math.round(item.wholesalePrice)
          : null;
      const retailPrice =
        typeof item.retailPrice === "number" &&
        Number.isFinite(item.retailPrice) &&
        item.retailPrice > 0
          ? Math.round(item.retailPrice)
          : null;

      await tx.marketPriceHistory.upsert({
        where: {
          region_commodity_weekStart: {
            region,
            commodity: PRICE_HISTORY_COMMODITY,
            weekStart: weekDate,
          },
        },
        create: {
          region,
          commodity: PRICE_HISTORY_COMMODITY,
          weekStart: weekDate,
          farmerPrice,
          millerPrice,
          wholesalePrice,
          retailPrice,
          source: "admin_ingest",
        },
        update: {
          farmerPrice,
          millerPrice,
          ...(wholesalePrice !== null ? { wholesalePrice } : {}),
          ...(retailPrice !== null ? { retailPrice } : {}),
          source: "admin_ingest",
        },
      });
    }
  });

  clearPriceHistoryCache();

  return payload.updates.length;
}

const SLIDING_RANGE_WEEKS: Record<string, number> = {
  "4w": 4,
  "8w": 8,
  "12w": 12,
  "1y": 52,
};

async function getCoveredRegions(db: PrismaClient): Promise<string[]> {
  if (coveredRegionsCache && Date.now() < coveredRegionsCache.expiresAt) {
    return [...coveredRegionsCache.regions];
  }

  const requestEpoch = cacheEpoch;
  const coveredRows = await db.marketPriceHistory.findMany({
    where: {
      commodity: PRICE_HISTORY_COMMODITY,
      source: { in: ["pihps_bi", "admin_ingest"] },
    },
    distinct: ["region"],
    select: { region: true },
    orderBy: { region: "asc" },
  });

  const regions = coveredRows.map((c) => c.region);
  if (cacheEpoch === requestEpoch && regions.length > 0) {
    coveredRegionsCache = {
      regions,
      expiresAt: Date.now() + COVERED_REGIONS_TTL_MS,
    };
  }
  return regions;
}

/**
 * Returns chronological actual PIHPS BI history + AI model predictions filtered by range and status.
 */
export async function getPriceHistory(
  db: PrismaClient,
  query: z.infer<typeof priceHistoryQuerySchema>,
  options?: { stripPredictions?: boolean }
) {
  const stripPredictions = Boolean(options?.stripPredictions);
  if (!stripPredictions) {
    await syncForecastPredictionsToHistory(db, query.region);
  }

  const [rawRows, coveredRegions] = await Promise.all([
    db.marketPriceHistory.findMany({
      where: {
        region: query.region,
        commodity: PRICE_HISTORY_COMMODITY,
      },
      orderBy: { weekStart: "asc" },
    }),
    getCoveredRegions(db),
  ]);

  const sourceRows = stripPredictions
    ? rawRows.filter(
        (row) =>
          row.farmerPrice !== null ||
          row.millerPrice !== null ||
          row.wholesalePrice !== null ||
          row.retailPrice !== null
      )
    : rawRows;

  let prevEffectiveMiller: number | null = null;
  const enriched: PriceHistoryRowDto[] = sourceRows.map((row) => {
    const weekStart = formatIsoDate(row.weekStart);
    const year = Number(weekStart.slice(0, 4));
    const hasActual =
      row.farmerPrice !== null ||
      row.millerPrice !== null ||
      row.wholesalePrice !== null ||
      row.retailPrice !== null;
    const hasPrediction = !stripPredictions && row.predictedMillerPrice !== null;
    const rowStatus: PriceHistoryRowStatus =
      hasActual && hasPrediction
        ? "actual_with_prediction"
        : hasActual
        ? "actual"
        : "predicted";

    const effectiveMiller = stripPredictions
      ? row.millerPrice
      : row.millerPrice ?? row.predictedMillerPrice;
    const millerChangeRp =
      prevEffectiveMiller !== null && effectiveMiller !== null
        ? effectiveMiller - prevEffectiveMiller
        : null;
    const millerChangePct =
      prevEffectiveMiller !== null && prevEffectiveMiller > 0 && millerChangeRp !== null
        ? Math.round((millerChangeRp / prevEffectiveMiller) * 1000) / 10
        : null;
    if (effectiveMiller !== null) {
      prevEffectiveMiller = effectiveMiller;
    }

    const farmerSharePercent =
      row.farmerPrice !== null && row.retailPrice !== null && row.retailPrice > 0
        ? Math.round((row.farmerPrice / row.retailPrice) * 1000) / 10
        : null;
    const marginAmount =
      row.farmerPrice !== null && row.retailPrice !== null
        ? Math.max(0, row.retailPrice - row.farmerPrice)
        : null;
    const predictionErrorRp =
      !stripPredictions && row.millerPrice !== null && row.predictedMillerPrice !== null
        ? row.millerPrice - row.predictedMillerPrice
        : null;

    return {
      weekStart,
      weekLabel: formatFullWeekLabel(weekStart),
      shortWeekLabel: formatShortWeekLabel(weekStart),
      year,
      rowStatus,
      source: row.source,
      farmerPrice: row.farmerPrice,
      millerPrice: row.millerPrice,
      wholesalePrice: row.wholesalePrice,
      retailPrice: row.retailPrice,
      predictedFarmerPrice: stripPredictions ? null : row.predictedFarmerPrice,
      predictedMillerPrice: stripPredictions ? null : row.predictedMillerPrice,
      predictedGkpPrice: stripPredictions ? null : row.predictedGkpPrice,
      predictionLower80: stripPredictions ? null : row.predictionLower80,
      predictionUpper80: stripPredictions ? null : row.predictionUpper80,
      predictionHorizonWeeks: stripPredictions ? null : row.predictionHorizonWeeks,
      predictionMethod: stripPredictions ? null : row.predictionMethod,
      predictionModelVersion: stripPredictions ? null : row.predictionModelVersion,
      farmerSharePercent,
      marginAmount,
      millerChangeRp,
      millerChangePct,
      predictionErrorRp,
    };
  });

  const actualRows = enriched.filter(
    (r) => r.rowStatus === "actual" || r.rowStatus === "actual_with_prediction"
  );
  const predictedOnlyRows = enriched.filter((r) => r.rowStatus === "predicted");
  const predictionCount = enriched.filter(
    (r) => r.rowStatus === "predicted" || r.rowStatus === "actual_with_prediction"
  ).length;
  const latestActualWeek =
    actualRows.length > 0 ? actualRows[actualRows.length - 1].weekStart : null;
  const actualCount = actualRows.length;
  const hasFullHistory = actualCount >= 52;
  const availableYears = Array.from(new Set(enriched.map((r) => r.year))).sort((a, b) => b - a);

  let ranged: PriceHistoryRowDto[];
  const slidingCount = SLIDING_RANGE_WEEKS[query.range];
  if (slidingCount !== undefined) {
    const tailActuals = actualRows.slice(-slidingCount);
    const futurePredictions = predictedOnlyRows.filter(
      (r) => !latestActualWeek || r.weekStart > latestActualWeek
    );
    ranged = [...tailActuals, ...futurePredictions].sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    );
  } else if (/^\d{4}$/.test(query.range)) {
    const targetYear = Number(query.range);
    ranged = enriched.filter((r) => r.year === targetYear);
  } else {
    ranged = enriched;
  }

  const rows =
    query.status === "actual"
      ? ranged.filter((r) => r.rowStatus === "actual" || r.rowStatus === "actual_with_prediction")
      : query.status === "predicted"
      ? ranged.filter(
          (r) => r.rowStatus === "predicted" || r.rowStatus === "actual_with_prediction"
        )
      : ranged;

  return {
    region: query.region,
    commodity: PRICE_HISTORY_COMMODITY,
    range: query.range,
    status: query.status,
    hasFullHistory,
    coveredRegions,
    availableYears,
    latestActualWeek,
    actualCount,
    predictionCount,
    totalMatchingRows: rows.length,
    rows,
  };
}
