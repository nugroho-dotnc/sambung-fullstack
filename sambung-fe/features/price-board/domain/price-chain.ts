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

export type PriceHistoryRowStatus = "actual" | "predicted" | "actual_with_prediction";

export interface HistoricalTrendPoint {
  week: string;
  weekStart?: string;
  farmerPrice: number | null;
  millerPrice: number | null;
  wholesalePrice?: number | null;
  retailPrice: number | null;
  predictedFarmerPrice?: number | null;
  predictedMillerPrice?: number | null;
  rowStatus?: PriceHistoryRowStatus;
}

export interface PriceHistoryRow {
  weekStart: string;
  weekLabel: string;
  shortWeekLabel: string;
  year: number;
  rowStatus: PriceHistoryRowStatus;
  source: string;
  farmerPrice: number | null;
  millerPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  predictedFarmerPrice: number | null;
  predictedMillerPrice: number | null;
  predictedGkpPrice: number | null;
  predictionLower80: number | null;
  predictionUpper80: number | null;
  predictionHorizonWeeks: number | null;
  predictionMethod: string | null;
  predictionModelVersion: string | null;
  farmerSharePercent: number | null;
  marginAmount: number | null;
  millerChangeRp: number | null;
  millerChangePct: number | null;
  predictionErrorRp: number | null;
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

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Formats weekly PIHPS BI + AI forecast history into CSV rows ordered newest to oldest.
 */
export function generatePriceHistoryCsv(region: string, rows: PriceHistoryRow[]): string {
  const headers = [
    "Pekan (ISO)",
    "Pekan",
    "Wilayah",
    "Status",
    "Sumber",
    "Petani Setara Beras (Rp/kg)",
    "Penggilingan Aktual (Rp/kg)",
    "Grosir (Rp/kg)",
    "Eceran Konsumen (Rp/kg)",
    "Prediksi AI Penggilingan (Rp/kg)",
    "Prediksi AI Petani Setara Beras (Rp/kg)",
    "Selisih Aktual vs Prediksi (Rp/kg)",
    "Rentang Prediksi Bawah 80% (Rp/kg)",
    "Rentang Prediksi Atas 80% (Rp/kg)",
    "Horizon Prediksi (Pekan)",
    "Farmer Share (%)",
    "Perubahan Penggilingan WoW (Rp/kg)",
  ];

  const ordered = [...rows].reverse();
  const lines = ordered.map((row) =>
    [
      csvCell(row.weekStart),
      csvCell(row.weekLabel),
      csvCell(region),
      csvCell(row.rowStatus),
      csvCell(row.source),
      csvCell(row.farmerPrice),
      csvCell(row.millerPrice),
      csvCell(row.wholesalePrice),
      csvCell(row.retailPrice),
      csvCell(row.predictedMillerPrice),
      csvCell(row.predictedFarmerPrice),
      csvCell(row.predictionErrorRp),
      csvCell(row.predictionLower80),
      csvCell(row.predictionUpper80),
      csvCell(row.predictionHorizonWeeks),
      csvCell(row.farmerSharePercent),
      csvCell(row.millerChangeRp),
    ].join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}
