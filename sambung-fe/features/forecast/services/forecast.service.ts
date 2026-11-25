import { apiClient } from "@/lib/api/client";
import type { ForecastRecord } from "../domain/forecast-data";

export interface ForecastResponse {
  meta: {
    generatedAtUtc: string;
    latestObservationWeek: string;
    modelVersion: string;
    championPerHorizon?: Record<string, string>;
    derivedConversion: {
      rGkp: number;
      rGkg: number;
      p50QGkp: number;
      p50QGkg: number;
    };
    summary?: Record<string, any>;
    sourceMode: "live" | "snapshot";
  };
  records: ForecastRecord[];
}

export interface ForecastMetaResponse {
  latestObservationWeek: string;
  modelVersion: string;
  derivedConversion: {
    rGkp: number;
    rGkg: number;
    p50QGkp: number;
    p50QGkg: number;
  };
  activeProvinces: string[];
  allProvinces: string[];
  sourceMode: "live" | "snapshot";
}

export const forecastService = {
  async getForecasts(params: {
    province?: string;
    horizonWeeks?: 2 | 4;
    activeOnly?: boolean;
  }): Promise<ForecastResponse> {
    const searchParams = new URLSearchParams();
    if (params.province) searchParams.set("province", params.province);
    if (params.horizonWeeks) searchParams.set("horizonWeeks", String(params.horizonWeeks));
    if (params.activeOnly !== undefined) searchParams.set("activeOnly", String(params.activeOnly));

    const qs = searchParams.toString();
    const path = `/forecasts${qs ? `?${qs}` : ""}`;
    return (await apiClient(path)) as ForecastResponse;
  },

  async getMeta(): Promise<ForecastMetaResponse> {
    return (await apiClient("/forecasts/meta")) as ForecastMetaResponse;
  },
};
