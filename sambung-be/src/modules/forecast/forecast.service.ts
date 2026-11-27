import { ApiError } from "../../shared/api-error.ts";
import { fetchForecasts } from "./ai-forecast.client.ts";
import type { forecastQuerySchema } from "./forecast.types.ts";
import { z } from "zod";

export async function getForecasts(query: z.infer<typeof forecastQuerySchema>) {
  const result = await fetchForecasts(query.province, query.horizonWeeks, query.activeOnly);

  if (query.province && result.records.length === 0) {
    throw new ApiError(
      404,
      "FORECAST_NOT_FOUND",
      `Data prakiraan untuk provinsi ${query.province} belum tersedia dalam basis data AI.`
    );
  }

  return {
    meta: {
      generatedAtUtc: result.generatedAtUtc,
      latestObservationWeek: result.latestObservationWeek,
      ...(result.modelName ? { modelName: result.modelName } : {}),
      modelVersion: result.modelVersion,
      championPerHorizon: result.championPerHorizon,
      derivedConversion: result.derivedConversion,
      summary: result.summary,
      sourceMode: result.sourceMode,
    },
    records: result.records,
  };
}

export async function getForecastMeta() {
  const result = await fetchForecasts();
  const activeProvinces = Array.from(
    new Set(result.records.filter((r) => !r.isFallback).map((r) => r.province))
  );
  const allProvinces = Array.from(new Set(result.records.map((r) => r.province))).sort((a, b) =>
    a.localeCompare(b, "id")
  );

  return {
    latestObservationWeek: result.latestObservationWeek,
    modelVersion: result.modelVersion,
    derivedConversion: result.derivedConversion,
    activeProvinces,
    allProvinces,
    sourceMode: result.sourceMode,
  };
}
