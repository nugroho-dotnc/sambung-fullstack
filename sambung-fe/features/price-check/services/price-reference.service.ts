/**
 * Price reference service for contract & catalog traffic-light checks.
 * Backed by verified fair_price_params.json (34 provinces + Nasional).
 */

import fairPriceJson from "@/data/ai/fair_price_params.json";
import { getProvinceReferenceEntry } from "@/features/fair-price/domain/calculate-fair-price";

export interface PriceReference {
  grainType: "GKP" | "GKG";
  lowerBound: number;
  upperBound: number;
  medianPrice: number;
  toleranceDelta: number;
  region: string;
  sourceNote: string;
  updatedAt: string;
}

const REGION_TO_PROVINCE: Record<string, string> = {
  subang: "Jawa Barat",
  karawang: "Jawa Barat",
  indramayu: "Jawa Barat",
  cirebon: "Jawa Barat",
  majalengka: "Jawa Barat",
  sragen: "Jawa Tengah",
  demak: "Jawa Tengah",
  grobogan: "Jawa Tengah",
  pati: "Jawa Tengah",
  ngawi: "Jawa Timur",
  lamongan: "Jawa Timur",
  jombang: "Jawa Timur",
  kediri: "Jawa Timur",
  banyuwangi: "Jawa Timur",
  bone: "Sulawesi Selatan",
  sidrap: "Sulawesi Selatan",
  pinrang: "Sulawesi Selatan",
};

function resolveProvinceName(region: string): string {
  const raw = (region || "").trim();
  const provinces = fairPriceJson.provinces as Record<string, unknown>;
  if (raw in provinces) return raw;

  const lower = raw.toLowerCase();
  for (const key of Object.keys(provinces)) {
    if (key.toLowerCase() === lower) return key;
  }
  for (const [alias, prov] of Object.entries(REGION_TO_PROVINCE)) {
    if (lower.includes(alias)) return prov;
  }
  return "Nasional";
}

export class PriceReferenceService {
  static getReference(grainType: "GKP" | "GKG" = "GKP", region: string = "Jawa Barat"): PriceReference {
    const resolvedProv = resolveProvinceName(region);
    const entry = getProvinceReferenceEntry(resolvedProv);
    const bounds = grainType === "GKG" ? entry.GKG : entry.GKP;

    return {
      grainType,
      lowerBound: bounds.lowerBound,
      upperBound: bounds.upperBound,
      medianPrice: bounds.medianPrice,
      toleranceDelta: 0.03, // Toleransi batas awal 3%
      region: resolvedProv,
      sourceNote: `${entry.referenceSource} + rasio empiris Bapanas`,
      updatedAt: fairPriceJson.updatedAt,
    };
  }
}
