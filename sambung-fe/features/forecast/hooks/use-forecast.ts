"use client";

import { useQuery } from "@tanstack/react-query";
import { forecastService } from "../services/forecast.service";

export const forecastQueryKeys = {
  all: ["forecasts"] as const,
  meta: () => [...forecastQueryKeys.all, "meta"] as const,
  detail: (province?: string, horizonWeeks?: 2 | 4) =>
    [...forecastQueryKeys.all, "detail", province, horizonWeeks] as const,
};

export function useForecastMeta() {
  return useQuery({
    queryKey: forecastQueryKeys.meta(),
    queryFn: () => forecastService.getMeta(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useForecast(province?: string, horizonWeeks?: 2 | 4) {
  return useQuery({
    queryKey: forecastQueryKeys.detail(province, horizonWeeks),
    queryFn: () => forecastService.getForecasts({ province, horizonWeeks }),
    staleTime: 60 * 1000,
  });
}
