/**
 * Domain model and verified AI forecast dataset for SAMBUNG.
 * Backed by Walk-Forward validated Bagged3 Hurdle-LightGBM v3 + TreeSHAP (ai/artifacts/v3).
 */

import forecastProdusenJson from "@/data/ai/forecast_produsen.json";

export type ShapCategory = "cuaca" | "kebijakan" | "pasokan" | "sentra" | "harga_lokal";

export interface ShapFactor {
  feature: string;
  impact: number; // positive = pushes forecast up, negative = restrains forecast
  description: string;
  category: ShapCategory;
}

export interface ForecastSeriesPoint {
  week: string;
  actualPrice?: number;
  forecastPrice?: number;
  lowerCi?: number;
  upperCi?: number;
}

export interface ForecastRecord {
  id: string;
  horizonWeeks: 2 | 4;
  province: string;
  commodity: string;
  referenceDate?: string;
  targetDate: string;
  riceProducerPrice: number;
  confidenceInterval80: [number, number];
  gkpEstimate: number;
  gkgEstimate: number;
  derivedDisclaimer?: string;
  method: string;
  isFallback: boolean;
  gateMase?: number;
  gateCoverage80Pct?: number;
  shapContributions: ShapFactor[];
  historicalSeries: ForecastSeriesPoint[];
}

export const FORECAST_META = {
  generatedAtUtc: forecastProdusenJson.generatedAtUtc,
  latestObservationWeek: forecastProdusenJson.latestObservationWeek,
  modelVersion: forecastProdusenJson.modelVersion,
  derivedConversion: forecastProdusenJson.derivedConversion,
  summary: forecastProdusenJson.summary,
};

export const SEED_FORECASTS: ForecastRecord[] = forecastProdusenJson.records.map((rec) => ({
  id: rec.id,
  horizonWeeks: (rec.horizonWeeks === 4 ? 4 : 2) as 2 | 4,
  province: rec.province,
  commodity: rec.commodity,
  referenceDate: rec.referenceDate,
  targetDate: rec.targetDate,
  riceProducerPrice: rec.riceProducerPrice,
  confidenceInterval80: [
    rec.confidenceInterval80[0] ?? rec.riceProducerPrice,
    rec.confidenceInterval80[1] ?? rec.riceProducerPrice,
  ],
  gkpEstimate: rec.gkpEstimate,
  gkgEstimate: rec.gkgEstimate,
  derivedDisclaimer: rec.derivedDisclaimer,
  method: rec.method,
  isFallback: rec.isFallback,
  gateMase: rec.gateMase,
  gateCoverage80Pct: rec.gateCoverage80Pct,
  shapContributions: rec.shapContributions.map((sf) => ({
    feature: sf.feature,
    impact: sf.impact,
    description: sf.description,
    category: (["cuaca", "kebijakan", "pasokan", "sentra", "harga_lokal"].includes(sf.category)
      ? sf.category
      : "harga_lokal") as ShapCategory,
  })),
  historicalSeries: rec.historicalSeries,
}));

export const ACTIVE_AI_PROVINCES: string[] = Array.from(
  new Set(SEED_FORECASTS.filter((f) => !f.isFallback).map((f) => f.province))
);

export const ALL_FORECAST_PROVINCES: string[] = Array.from(
  new Set(SEED_FORECASTS.map((f) => f.province))
).sort((a, b) => a.localeCompare(b, "id"));
