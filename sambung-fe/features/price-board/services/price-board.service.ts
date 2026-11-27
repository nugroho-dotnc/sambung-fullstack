import { apiClient } from "@/lib/api/client";
import type {
  HistoricalTrendPoint,
  PriceHistoryRow,
  SupplyChainComparison,
} from "../domain/price-chain";

export type PriceBoardPeriod =
  | "4 Pekan Terakhir"
  | "8 Pekan Terakhir"
  | "12 Pekan Terakhir"
  | "Rata-rata 30 Hari";

export type PriceHistoryRange =
  | "4w"
  | "8w"
  | "12w"
  | "1y"
  | "all"
  | "2026"
  | "2025"
  | "2024"
  | "2023"
  | "2022"
  | "2021"
  | "2020"
  | "2019";

export type PriceHistoryStatusFilter = "all" | "actual" | "predicted";

export const PRICE_BOARD_PERIOD_OPTIONS: Array<{
  value: PriceBoardPeriod;
  label: string;
}> = [
  { value: "12 Pekan Terakhir", label: "12 Pekan Terakhir" },
  { value: "8 Pekan Terakhir", label: "8 Pekan Terakhir" },
  { value: "4 Pekan Terakhir", label: "4 Pekan Terakhir" },
  { value: "Rata-rata 30 Hari", label: "Rata-rata 30 Hari Terakhir" },
];

export const PRICE_HISTORY_RANGE_OPTIONS: Array<{
  value: PriceHistoryRange;
  label: string;
}> = [
  { value: "12w", label: "12 Pekan Terakhir (+ Prediksi)" },
  { value: "8w", label: "8 Pekan Terakhir (+ Prediksi)" },
  { value: "4w", label: "4 Pekan Terakhir (+ Prediksi)" },
  { value: "1y", label: "1 Tahun Terakhir (52 Pekan)" },
  { value: "all", label: "Semua Riwayat (2019 – Sekarang)" },
  { value: "2026", label: "Tahun 2026" },
  { value: "2025", label: "Tahun 2025" },
  { value: "2024", label: "Tahun 2024" },
  { value: "2023", label: "Tahun 2023" },
  { value: "2022", label: "Tahun 2022" },
  { value: "2021", label: "Tahun 2021" },
  { value: "2020", label: "Tahun 2020" },
  { value: "2019", label: "Tahun 2019" },
];

export function mapHistoryRangeToBoardPeriod(range: PriceHistoryRange): PriceBoardPeriod {
  if (range === "4w") return "4 Pekan Terakhir";
  if (range === "8w") return "8 Pekan Terakhir";
  return "12 Pekan Terakhir";
}

export interface PriceBoardResponse {
  generatedAtUtc: string;
  updatedAt: string;
  availableRegions: string[];
  comparison: SupplyChainComparison;
  historicalTrends: HistoricalTrendPoint[];
}

export interface PriceHistoryResponse {
  region: string;
  commodity: string;
  range: PriceHistoryRange;
  status: PriceHistoryStatusFilter;
  hasFullHistory: boolean;
  coveredRegions: string[];
  availableYears: number[];
  latestActualWeek: string | null;
  actualCount: number;
  predictionCount: number;
  totalMatchingRows: number;
  rows: PriceHistoryRow[];
}

export const priceBoardService = {
  getPriceBoard: async (params?: {
    region?: string;
    period?: PriceBoardPeriod;
  }): Promise<PriceBoardResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.region) searchParams.set("region", params.region);
    if (params?.period) searchParams.set("period", params.period);
    const qs = searchParams.toString();
    return apiClient.get<PriceBoardResponse>(`/price-board${qs ? `?${qs}` : ""}`);
  },
  getPriceHistory: async (params?: {
    region?: string;
    range?: PriceHistoryRange;
    status?: PriceHistoryStatusFilter;
  }): Promise<PriceHistoryResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.region) searchParams.set("region", params.region);
    if (params?.range) searchParams.set("range", params.range);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return apiClient.get<PriceHistoryResponse>(`/price-history${qs ? `?${qs}` : ""}`);
  },
};
