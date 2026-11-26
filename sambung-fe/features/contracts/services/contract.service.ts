import { apiClient } from "@/lib/api/client";
import { contractSchema } from "../schemas";

export type Quote = {
  regionId: string;
  grainType: "GKP" | "GKG";
  quality?: number | null;
  price: number;
  action: "order" | "accept" | "counter";
};

export type Intent = {
  path: string;
  body: Record<string, unknown>;
  quote?: Quote;
};

export interface PricePreviewResult {
  reference: {
    referenceVersion: string;
    bounds: { lowerOperational: number; upperOperational: number };
    deltaBp: number;
    sourceMode: string;
    sourceDate: string | null;
  };
  requiresConfirmation: boolean;
}

export class ContractService {
  static async getMyContracts(status?: string) {
    const query = status && status !== "all" ? "?status=" + encodeURIComponent(status) : "";
    const { data } = await apiClient.get<{ data: unknown }>("/contracts" + query);
    return contractSchema.array().parse(data);
  }

  static async getContractById(id: string) {
    const { data } = await apiClient.get<{ data: unknown }>(
      "/contracts/" + encodeURIComponent(id)
    );
    return contractSchema.parse(data);
  }

  static async preview(quote: Quote): Promise<PricePreviewResult> {
    return apiClient.post<PricePreviewResult>("/price-checks/preview", quote);
  }

  static async prepare({ quote, body }: Intent) {
    if (
      !quote ||
      process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
      typeof body.referenceVersion === "string"
    ) {
      return body;
    }
    const check = await ContractService.preview(quote);
    return {
      ...body,
      referenceVersion: check.reference.referenceVersion,
      redConfirmed:
        typeof body.redConfirmed === "boolean" ? body.redConfirmed : false,
    };
  }

  static async send(path: string, body: Record<string, unknown>, key: string) {
    const { data } = await apiClient.post<{ data: unknown }>(path, body, {
      headers: { "Idempotency-Key": key },
    });
    return contractSchema.parse(data);
  }
}
