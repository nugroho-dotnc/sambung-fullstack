"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { FairPriceCalculationInput } from "../domain/calculate-fair-price";
import { fairPriceService } from "../services/fair-price.service";

export const fairPriceQueryKeys = {
  all: ["fair-price"] as const,
  params: () => [...fairPriceQueryKeys.all, "params"] as const,
  calculate: (input: FairPriceCalculationInput | null) =>
    [...fairPriceQueryKeys.all, "calculate", input] as const,
};

export function useFairPriceParams() {
  return useQuery({
    queryKey: fairPriceQueryKeys.params(),
    queryFn: () => fairPriceService.getParams(),
    staleTime: 60_000,
  });
}

export function useFairPriceCalculation(input: FairPriceCalculationInput | null) {
  return useQuery({
    queryKey: fairPriceQueryKeys.calculate(input),
    queryFn: () => {
      if (!input) {
        throw new Error("Parameter kalkulator harga wajar belum lengkap.");
      }
      return fairPriceService.calculate(input);
    },
    enabled: Boolean(input),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
