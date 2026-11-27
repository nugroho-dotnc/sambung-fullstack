"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { priceBoardService, type PriceBoardPeriod } from "../services/price-board.service";

export const priceBoardQueryKeys = {
  all: ["price-board"] as const,
  detail: (region?: string, period?: PriceBoardPeriod) =>
    [...priceBoardQueryKeys.all, region ?? "default", period ?? "default"] as const,
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
