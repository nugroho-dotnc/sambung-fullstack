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

  const raw = await calculateAiFairPrice({
    grainType,
    region: province,
    moisturePercent,
    rendemen: resolveValidRendemen(overrides?.rendemen),
    hppGovernment: resolveValidHpp(overrides?.hppGovernment),
  });

  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      503,
      "PRICE_UNAVAILABLE",
      "Acuan harga belum tersedia. Simpan draf atau coba lagi."
    );
  }

  const result = parsed.data;
  if (
    result.region !== province ||
    result.grainType !== grainType ||
    result.upperBound < result.lowerBound
  ) {
    throw new ApiError(
      503,
      "PRICE_UNAVAILABLE",
      "Acuan harga belum tersedia. Simpan draf atau coba lagi."
    );
  }

  return { ...result, sourceMode: "live" as const, sourceDate: null as string | null };
}
