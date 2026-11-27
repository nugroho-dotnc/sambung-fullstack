"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  priceBoardService,
  type PriceBoardPeriod,
  type PriceHistoryRange,
  type PriceHistoryStatusFilter,
} from "../services/price-board.service";

export const priceBoardQueryKeys = {
  all: ["price-board"] as const,
  detail: (region?: string, period?: PriceBoardPeriod) =>
    [...priceBoardQueryKeys.all, region ?? "default", period ?? "default"] as const,
  history: (
    region?: string,
    range?: PriceHistoryRange,
    status?: PriceHistoryStatusFilter,
  ) => ["price-history", region ?? "Jawa Timur", range ?? "12w", status ?? "all"] as const,
};

export function usePriceBoard(
  region?: string,
  period?: PriceBoardPeriod,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: priceBoardQueryKeys.detail(region, period),
    queryFn: () => priceBoardService.getPriceBoard({ region, period }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePriceHistory(
  region?: string,
  range: PriceHistoryRange = "12w",
  status: PriceHistoryStatusFilter = "all",
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: priceBoardQueryKeys.history(region, range, status),
    queryFn: () => priceBoardService.getPriceHistory({ region, range, status }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
