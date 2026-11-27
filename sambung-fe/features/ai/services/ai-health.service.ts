import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

export interface AiHealthResponse {
  status: "ready" | "starting" | "unavailable" | string;
  ready: boolean;
  modelVersion?: string;
  apiVersion?: string;
}

export const aiHealthService = {
  getHealth: async (): Promise<AiHealthResponse> => {
    try {
      return await apiClient.get<AiHealthResponse>("/ai/health");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        return { status: "starting", ready: false };
      }
      return { status: "unavailable", ready: false };
    }
  },
};
