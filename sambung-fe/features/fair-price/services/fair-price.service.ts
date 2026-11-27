import { apiClient } from "@/lib/api/client";
import type {
  FairPriceBreakdownResult,
  FairPriceCalculationInput,
  FairPriceParamsResponse,
} from "../domain/calculate-fair-price";

export const fairPriceService = {
  getParams: async (): Promise<FairPriceParamsResponse> => {
    return apiClient.get<FairPriceParamsResponse>("/fair-price/params");
  },

  calculate: async (input: FairPriceCalculationInput): Promise<FairPriceBreakdownResult> => {
    const body: Record<string, unknown> = {
      grainType: input.grainType,
      region: input.region,
    };
    if (input.ricePrice !== undefined) body.ricePrice = input.ricePrice;
    if (input.rendemen !== undefined) body.rendemen = input.rendemen;
    if (input.moisturePercent !== undefined) body.moisturePercent = input.moisturePercent;
    if (input.hppGovernment !== undefined) body.hppGovernment = input.hppGovernment;

    return apiClient.post<FairPriceBreakdownResult>("/fair-price/calculate", body);
  },
};
