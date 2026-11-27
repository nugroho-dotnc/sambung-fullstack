/**
 * Domain types for PIHPS 34-province spatial disparity & dynamic TreeSHAP drivers.
 * Backed live by GET /spatial-disparity.
 */

export interface SpatialShapFactor {
  category: string;
  variable: string;
  condition: string;
  impactRp: number;
  direction: "Menaikkan" | "Meredam" | "Netral" | string;
}

export interface ProvincialPriceComparison {
  province: string;
  price: number;
  price30d?: number;
  medianPrice: number;
  medianPrice30d?: number;
  percentageDiff: number;
  percentageDiff30d?: number;
  gkpDerivedPrice?: number;
  gkgDerivedPrice?: number;
  grainType: string;
  isAvailable: boolean;
  sampleCount: number;
  status: "above" | "below" | "normal" | string;
  surplusRatio?: number;
  spatialFactors?: SpatialShapFactor[];
}

export interface SpatialDisparityResponse {
  generatedAtUtc: string;
  modelName?: string;
  modelVersion?: string;
  snapshotWeek: string;
  snapshotLabel: string;
  primaryCommodity: string;
  nationalMedianPrice: number;
  nationalMedianPrice30d: number;
  explainerMetrics?: {
    holdout8wR2: number;
    holdout8wMaeRp: number;
    featureCount: number;
  };
  spatialShapMaxAdditivityErrRp?: number;
  restrictedPreview?: boolean;
  provinces: ProvincialPriceComparison[];
}
