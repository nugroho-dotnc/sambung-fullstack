/**
 * Pure domain types & helpers for deterministic fair grain price calculation.
 * Backed live by GET /fair-price/params & POST /fair-price/calculate.
 */

export interface FairPriceCalculationInput {
  grainType: "GKP" | "GKG";
  region: string;
  ricePrice?: number;
  rendemen?: number;
  moisturePercent?: number;
  hppGovernment?: number;
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

export interface FairProvinceRecord {
  province: string;
  riceReferencePrice: number;
  isDirectProducerPrice?: boolean;
  referenceSource: string;
  GKP: { lowerBound: number; medianPrice: number; upperBound: number };
  GKG: { lowerBound: number; medianPrice: number; upperBound: number };
}

export interface FairPriceEmpiricalEntry {
  rendemenSkgb: number;
  p10: number;
  p50: number;
  p90: number;
  samplePairs: number;
}

export interface FairPriceParamsResponse {
  generatedAtUtc: string;
  updatedAt: string;
  formulaNote: string;
  hppActive2026: {
    GKP: number;
    GKG: number;
    noRafaksi?: boolean;
    regulation?: string;
  };
  empiricalParams: {
    GKP: FairPriceEmpiricalEntry;
    GKG: FairPriceEmpiricalEntry;
  };
  provinces: Record<string, FairProvinceRecord>;
  toleranceDelta?: number;
  systemParameters?: {
    fairPriceToleranceDelta: number;
    rendemenGKP: number;
    rendemenGKG: number;
    governmentFloorPriceGKP: number;
  };
}

export function sortFairPriceProvinces(provinces: Record<string, FairProvinceRecord> | undefined): string[] {
  if (!provinces) return [];
  return Object.keys(provinces).sort((a, b) => {
    if (a === "Nasional") return -1;
    if (b === "Nasional") return 1;
    return a.localeCompare(b, "id");
  });
}

/** Half-up rounding to nearest Rupiah */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value + 0.5);
}
