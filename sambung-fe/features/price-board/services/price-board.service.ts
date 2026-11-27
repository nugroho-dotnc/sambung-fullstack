import { apiClient } from "@/lib/api/client";
import type { HistoricalTrendPoint, SupplyChainComparison } from "../domain/price-chain";

export type PriceBoardPeriod =
  | "4 Pekan Terakhir"
  | "8 Pekan Terakhir"
  | "12 Pekan Terakhir"
  | "Rata-rata 30 Hari";

export const PRICE_BOARD_PERIOD_OPTIONS: Array<{
  value: PriceBoardPeriod;
  label: string;
}> = [
  { value: "12 Pekan Terakhir", label: "12 Pekan Terakhir" },
  { value: "8 Pekan Terakhir", label: "8 Pekan Terakhir" },
  { value: "4 Pekan Terakhir", label: "4 Pekan Terakhir" },
  { value: "Rata-rata 30 Hari", label: "Rata-rata 30 Hari Terakhir" },
];

export interface PriceBoardResponse {
  generatedAtUtc: string;
  updatedAt: string;
  availableRegions: string[];
  comparison: SupplyChainComparison;
  historicalTrends: HistoricalTrendPoint[];
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
};
