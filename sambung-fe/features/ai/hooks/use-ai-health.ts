"use client";

import { useQuery } from "@tanstack/react-query";
import { aiHealthService } from "../services/ai-health.service";

export const aiHealthQueryKeys = {
  all: ["ai-health"] as const,
};

export function useAiHealth() {
  return useQuery({
    queryKey: aiHealthQueryKeys.all,
    queryFn: () => aiHealthService.getHealth(),
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.ready === false && query.state.data?.status === "starting" ? 15_000 : false,
  });
}
