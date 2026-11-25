/**
 * Pure deterministic domain logic for calculating fair grain price.
 * Uses empirical Bapanas grain-to-rice ratios (q_GKP, q_GKG) & BPS SKGB 2018 conversion rates.
 * Strictly deterministic (not ML / not SHAP) and NEVER applies automatic deduction for declarative moisture.
 */

import fairPriceJson from "@/data/ai/fair_price_params.json";

export interface FairPriceCalculationInput {
  grainType: "GKP" | "GKG";
  region: string;
  ricePrice: number;
  rendemen?: number;
  moisturePercent?: number;
}

export interface FairPriceBreakdownResult {
  grainType: "GKP" | "GKG";
  region: string;
  ricePrice: number;
  rendemen: number;
  moisturePercent: number;
  lowerBound: number;
  upperBound: number;
  medianPrice: number;
  hppGovernment: number;
  millingMarginAmount: number;
  referenceSource: string;
  empiricalParams: {
    p10: number;
    p50: number;
    p90: number;
    samplePairs: number;
  };
  explanation: {
    grossValue: number;
    dryingAdjustment: number;
    netCalculated: number;
  };
}

export const DEFAULT_RENDEMEN: Record<"GKP" | "GKG", number> = {
  GKP: fairPriceJson.empiricalParams.GKP.rendemenSkgb, // 0.5338 SKGB BPS 2018
  GKG: fairPriceJson.empiricalParams.GKG.rendemenSkgb, // 0.6274 SKGB BPS 2018
};

export const GOVERNMENT_HPP: Record<"GKP" | "GKG", number> = {
  GKP: fairPriceJson.hppActive2026.GKP, // Rp6.500 (Inpres No. 4/2026 & Kepbadan No. 2/2025, tanpa rafaksi)
  GKG: fairPriceJson.hppActive2026.GKG, // Rp8.000
};

export const FAIR_PRICE_META = {
  updatedAt: fairPriceJson.updatedAt,
  formulaNote: fairPriceJson.formulaNote,
  hppActive2026: fairPriceJson.hppActive2026,
  empiricalParams: fairPriceJson.empiricalParams,
};

type FairProvinceRecord = {
  province: string;
  riceReferencePrice: number;
  isDirectProducerPrice: boolean;
  referenceSource: string;
  GKP: { lowerBound: number; medianPrice: number; upperBound: number };
  GKG: { lowerBound: number; medianPrice: number; upperBound: number };
};

const PROVINCE_MAP = fairPriceJson.provinces as Record<string, FairProvinceRecord>;

export const FAIR_PRICE_PROVINCES: string[] = Object.keys(PROVINCE_MAP).sort((a, b) => {
  if (a === "Nasional") return -1;
  if (b === "Nasional") return 1;
  return a.localeCompare(b, "id");
});

/** Half-up rounding to nearest Rupiah */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value + 0.5);
}

export function getProvinceReferenceEntry(region: string): FairProvinceRecord {
  return PROVINCE_MAP[region] || PROVINCE_MAP["Jawa Timur"] || PROVINCE_MAP["Nasional"];
}

export function getProvinceReferenceRicePrice(region: string): number {
  return getProvinceReferenceEntry(region).riceReferencePrice;
}

export function calculateFairPriceBreakdown({
  grainType,
  region,
  ricePrice,
  rendemen = DEFAULT_RENDEMEN[grainType],
  moisturePercent = grainType === "GKP" ? 22 : 14,
}: FairPriceCalculationInput): FairPriceBreakdownResult {
  const refEntry = getProvinceReferenceEntry(region);
  const emp = fairPriceJson.empiricalParams[grainType];
  const safeRicePrice = Math.max(8000, ricePrice || refEntry.riceReferencePrice);

  // Deterministic formula calculations:
  // Gross rice-equivalent baseline = P_beras * R
  const grossValue = roundHalfUp(safeRicePrice * rendemen);

  // L_asal = P_beras * R * P10(q), U_asal = P_beras * R * P90(q), rounded half-up to nearest Rp
  const lowerBound = roundHalfUp(safeRicePrice * rendemen * emp.p10);
  const medianPrice = roundHalfUp(safeRicePrice * rendemen * emp.p50);
  const upperBound = roundHalfUp(safeRicePrice * rendemen * emp.p90);

  // Inpres 4/2026 (no rafaksi): declarative moisture does NOT auto-adjust bounds
  const dryingAdjustment = 0;
  const millingMarginAmount = Math.max(0, grossValue - medianPrice);

  return {
    grainType,
    region: refEntry.province,
    ricePrice: safeRicePrice,
    rendemen,
    moisturePercent,
    lowerBound,
    upperBound,
    medianPrice,
    hppGovernment: GOVERNMENT_HPP[grainType],
    millingMarginAmount,
    referenceSource: refEntry.referenceSource,
    empiricalParams: {
      p10: emp.p10,
      p50: emp.p50,
      p90: emp.p90,
      samplePairs: emp.samplePairs,
    },
    explanation: {
      grossValue,
      dryingAdjustment,
      netCalculated: medianPrice,
    },
  };
}
