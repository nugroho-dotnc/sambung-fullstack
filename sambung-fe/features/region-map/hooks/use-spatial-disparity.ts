"use client";

import { useQuery } from "@tanstack/react-query";
import { regionMapService } from "../services/region-map.service";

export const spatialDisparityQueryKeys = {
  all: ["spatial-disparity"] as const,
  list: (params?: { province?: string; status?: "above" | "below" | "normal" }) =>
    [...spatialDisparityQueryKeys.all, params ?? {}] as const,
};

export function useSpatialDisparity(params?: {
  province?: string;
  status?: "above" | "below" | "normal";
}) {
  return useQuery({
    queryKey: spatialDisparityQueryKeys.list(params),
    queryFn: () => regionMapService.getSpatialDisparity(params),
    staleTime: 60_000,
  });
}
