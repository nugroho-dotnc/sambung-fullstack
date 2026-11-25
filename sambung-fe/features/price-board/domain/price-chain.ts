/**
 * Domain logic and data models for SAMBUNG Price Chain Board (PB-02).
 * Follows Clean Code principles (pure functions, no side effects).
 */

export interface SupplyChainLevel {
  id: string;
  level: string;
  price: number;
  unit: string;
  note: string;
  description: string;
  category: "petani" | "penggilingan" | "grosir" | "konsumen";
}

export interface SupplyChainComparison {
  commodity: string;
  region: string;
  period: string;
  levels: SupplyChainLevel[];
  farmerSharePercent: number;
  retailPrice: number;
  farmerPrice: number;
  marginAmount: number;
  marginPercent: number;
  updatedAt: string;
}

export interface HistoricalTrendPoint {
  week: string;
  farmerPrice: number;
  millerPrice: number;
  retailPrice: number;
}

/**
 * Calculates Farmer's Share percentage: (Farmer Price / Retail Price) * 100
 */
export function calculateFarmerShare(farmerPrice: number, retailPrice: number): number {
  if (retailPrice <= 0) return 0;
  return Math.round((farmerPrice / retailPrice) * 1000) / 10;
}

/**
 * Calculates marketing margin amount and percentage relative to farmer price.
 */
export function calculateMargin(farmerPrice: number, retailPrice: number): {
  marginAmount: number;
  marginPercent: number;
} {
  const marginAmount = Math.max(0, retailPrice - farmerPrice);
  const marginPercent = farmerPrice > 0 ? Math.round((marginAmount / farmerPrice) * 1000) / 10 : 0;
  return { marginAmount, marginPercent };
}

/**
 * Formats supply chain data into a clean CSV string for export.
 */
export function generateSupplyChainCsv(data: SupplyChainComparison): string {
  const headers = ["Tingkat Rantai Pasok", "Komoditas", "Wilayah", "Harga Acuan (Rp/kg)", "Keterangan"];
  const rows = data.levels.map((lvl) => [
    `"${lvl.level}"`,
    `"${data.commodity}"`,
    `"${data.region}"`,
    lvl.price,
    `"${lvl.note}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
