import { z } from "zod";
import { ApiError } from "../../shared/api-error.ts";
import { calculateAiFairPrice } from "../ai/ai-api.client.ts";
import { resolveValidHpp, resolveValidRendemen } from "../ai/ai.service.ts";

export interface CalculatePriceOverrides {
  rendemen?: number;
  hppGovernment?: number;
}

const resultSchema = z.object({
  grainType: z.enum(["GKP", "GKG"]),
  region: z.string(),
  lowerBound: z.number().positive(),
  upperBound: z.number().positive(),
  rendemen: z.number().positive(),
  medianPrice: z.number().positive(),
  referenceSource: z.string(),
  ricePrice: z.number().positive(),
});

async function requestRegionCalculation(
  grainType: "GKP" | "GKG",
  regionQuery: string,
  moisturePercent: number | undefined,
  overrides?: CalculatePriceOverrides
) {
  const raw = await calculateAiFairPrice({
    grainType,
    region: regionQuery,
    moisturePercent,
    rendemen: resolveValidRendemen(overrides?.rendemen),
    hppGovernment: resolveValidHpp(overrides?.hppGovernment),
  });

  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const result = parsed.data;
  if (result.grainType !== grainType || result.upperBound < result.lowerBound) {
    return null;
  }
  return result;
}

export async function calculate(
  grainType: "GKP" | "GKG",
  province: string,
  quality: number | null,
  overrides?: CalculatePriceOverrides
) {
  const moisturePercent =
    typeof quality === "number" && Number.isFinite(quality) && quality >= 8 && quality <= 35
      ? quality
      : undefined;

  let shouldTryNationalFallback = false;

  try {
    const primary = await requestRegionCalculation(grainType, province, moisturePercent, overrides);
    if (primary && primary.region === province) {
      return {
        ...primary,
        sourceMode: "live" as const,
        isNationalFallback: false,
        fallbackRegion: null as string | null,
        sourceDate: null as string | null,
      };
    }
    if (primary && primary.region === "Nasional" && province !== "Nasional") {
      return {
        ...primary,
        region: province,
        referenceSource: primary.referenceSource.includes("Fallback Nasional")
          ? primary.referenceSource
          : `${primary.referenceSource} (Fallback Nasional)`,
        sourceMode: "fallback" as const,
        isNationalFallback: true,
        fallbackRegion: "Nasional" as string | null,
        sourceDate: null as string | null,
      };
    }
    shouldTryNationalFallback = province !== "Nasional";
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 422) &&
      province !== "Nasional"
    ) {
      shouldTryNationalFallback = true;
    } else {
      throw err;
    }
  }

  if (shouldTryNationalFallback) {
    const fallback = await requestRegionCalculation(grainType, "Nasional", moisturePercent, overrides);
    if (fallback && (fallback.region === "Nasional" || fallback.region === province)) {
      return {
        ...fallback,
        region: province,
        referenceSource: fallback.referenceSource.includes("Fallback Nasional")
          ? fallback.referenceSource
          : `${fallback.referenceSource} (Fallback Nasional)`,
        sourceMode: "fallback" as const,
        isNationalFallback: true,
        fallbackRegion: "Nasional" as string | null,
        sourceDate: null as string | null,
      };
    }
  }

  throw new ApiError(
    503,
    "PRICE_UNAVAILABLE",
    "Acuan harga belum tersedia. Simpan draf atau coba lagi."
  );
}
