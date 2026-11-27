/**
 * Pure price-reference resolver for contract & catalog traffic-light checks.
 * Backed dynamically by GET /fair-price/params response data.
 */

import type {
  FairPriceParamsResponse,
  FairProvinceRecord,
} from "@/features/fair-price/domain/calculate-fair-price";

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
  jember: "Jawa Timur",
  lamongan: "Jawa Timur",
  jombang: "Jawa Timur",
  kediri: "Jawa Timur",
  banyuwangi: "Jawa Timur",
  malang: "Jawa Timur",
  mojokerto: "Jawa Timur",
  madiun: "Jawa Timur",
  ponorogo: "Jawa Timur",
  bone: "Sulawesi Selatan",
  sidrap: "Sulawesi Selatan",
  pinrang: "Sulawesi Selatan",
};

export function resolveProvinceFromRegion(
  region: string,
  provinces: Record<string, FairProvinceRecord>,
): string {
  const raw = (region || "").trim();
  if (raw && raw in provinces) return raw;

  const lower = raw.toLowerCase();
  for (const key of Object.keys(provinces)) {
    if (key.toLowerCase() === lower) return key;
  }
  for (const [alias, prov] of Object.entries(REGION_TO_PROVINCE)) {
    if (lower.includes(alias) && prov in provinces) return prov;
  }
  if ("Nasional" in provinces) return "Nasional";
  return Object.keys(provinces)[0] ?? "Nasional";
}

export function extractPriceReference(
  params: FairPriceParamsResponse | undefined,
  grainType: "GKP" | "GKG" = "GKP",
  region: string = "Jawa Barat",
): PriceReference | null {
  if (!params?.provinces) return null;

  const resolvedProv = resolveProvinceFromRegion(region, params.provinces);
  const entry =
    params.provinces[resolvedProv] ??
    params.provinces["Jawa Timur"] ??
    params.provinces["Nasional"];

  if (!entry) return null;

  const bounds = grainType === "GKG" ? entry.GKG : entry.GKP;
  const toleranceDelta =
    params.toleranceDelta ?? params.systemParameters?.fairPriceToleranceDelta ?? 0.03;

  return {
    grainType,
    lowerBound: bounds.lowerBound,
    upperBound: bounds.upperBound,
    medianPrice: bounds.medianPrice,
    toleranceDelta,
    region: entry.province,
    sourceNote: `${entry.referenceSource} + rasio empiris Bapanas`,
    updatedAt: params.updatedAt,
  };
}
