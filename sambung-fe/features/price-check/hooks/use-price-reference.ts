"use client";

import { useMemo } from "react";
import { useFairPriceParams } from "@/features/fair-price/hooks/use-fair-price";
import { extractPriceReference } from "../services/price-reference.service";

export function usePriceReference(
  grainType: "GKP" | "GKG" = "GKP",
  region: string = "Jawa Barat",
) {
  const query = useFairPriceParams();

  const reference = useMemo(
    () => extractPriceReference(query.data, grainType, region),
    [query.data, grainType, region],
  );

  return {
    reference,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
