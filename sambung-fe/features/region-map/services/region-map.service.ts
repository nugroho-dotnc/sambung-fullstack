import { apiClient } from "@/lib/api/client";
import type { SpatialDisparityResponse } from "../domain/map-types";

export const regionMapService = {
  getSpatialDisparity: async (params?: {
    province?: string;
    status?: "above" | "below" | "normal";
  }): Promise<SpatialDisparityResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.province) searchParams.set("province", params.province);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return apiClient.get<SpatialDisparityResponse>(`/spatial-disparity${qs ? `?${qs}` : ""}`);
  },
};
