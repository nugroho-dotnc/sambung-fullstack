/**
 * Domain types and verified PIHPS spatial disparity dataset for SAMBUNG.
 * Backed by ai/artifacts/v3/spatial_disparity.json (34 provinces + dynamic spatial TreeSHAP).
 */

import spatialDisparityJson from "@/data/ai/spatial_disparity.json";

export interface SpatialShapFactor {
  category: string;
  variable: string;
  condition: string;
  impactRp: number;
  direction: "Menaikkan" | "Meredam";
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
  status: "above" | "below" | "normal";
  surplusRatio?: number;
  spatialFactors?: SpatialShapFactor[];
}

export const SPATIAL_META = {
  generatedAtUtc: spatialDisparityJson.generatedAtUtc,
  snapshotWeek: spatialDisparityJson.snapshotWeek,
  snapshotLabel: spatialDisparityJson.snapshotLabel,
  primaryCommodity: spatialDisparityJson.primaryCommodity,
  nationalMedianPrice: spatialDisparityJson.nationalMedianPrice,
  nationalMedianPrice30d: spatialDisparityJson.nationalMedianPrice30d,
  explainerMetrics: spatialDisparityJson.explainerMetrics,
};

export const SEED_PROVINCIAL_DATA: ProvincialPriceComparison[] =
  spatialDisparityJson.provinces.map((p) => ({
    province: p.province,
    price: p.price,
    price30d: p.price30d,
    medianPrice: p.medianPrice,
    medianPrice30d: p.medianPrice30d,
    percentageDiff: p.percentageDiff,
    percentageDiff30d: p.percentageDiff30d,
    gkpDerivedPrice: p.gkpDerivedPrice,
    gkgDerivedPrice: p.gkgDerivedPrice,
    grainType: p.grainType,
    isAvailable: p.isAvailable,
    sampleCount: p.sampleCount,
    status: (p.status === "above" || p.status === "below" ? p.status : "normal") as
      | "above"
      | "below"
      | "normal",
    surplusRatio: p.surplusRatio,
    spatialFactors: p.spatialFactors.map((sf) => ({
      category: sf.category,
      variable: sf.variable,
      condition: sf.condition,
      impactRp: sf.impactRp,
      direction: (sf.direction === "Meredam" ? "Meredam" : "Menaikkan") as
        | "Menaikkan"
        | "Meredam",
    })),
  }));
