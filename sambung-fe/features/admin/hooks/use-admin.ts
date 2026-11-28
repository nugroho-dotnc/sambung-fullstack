"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/admin.service";
import type {
  AdminAiIngestRequest,
  AdminLivePredictRequest,
  SystemParameters,
} from "../domain/admin-types";

export const adminQueryKeys = {
  all: ["admin"] as const,
  stats: () => [...adminQueryKeys.all, "stats"] as const,
  users: () => [...adminQueryKeys.all, "users"] as const,
  parameters: () => [...adminQueryKeys.all, "parameters"] as const,
  auditLogs: () => [...adminQueryKeys.all, "audit-logs"] as const,
  observations: () => [...adminQueryKeys.all, "observations"] as const,
  modelEvaluation: () => [...adminQueryKeys.all, "model-evaluation"] as const,
};

export function useAdminStats() {
  return useQuery({
    queryKey: adminQueryKeys.stats(),
    queryFn: () => adminService.getStats(),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminQueryKeys.users(),
    queryFn: () => adminService.getUsers(),
  });
}

export function useAdminParameters() {
  return useQuery({
    queryKey: adminQueryKeys.parameters(),
    queryFn: () => adminService.getParameters(),
  });
}

export function useUpdateParameters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<SystemParameters>) =>
      adminService.updateParameters(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.parameters() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.auditLogs() });
      queryClient.invalidateQueries({ queryKey: ["fair-price"] });
      queryClient.invalidateQueries({ queryKey: ["price-board"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
      queryClient.invalidateQueries({ queryKey: ["spatial-disparity"] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
  });
}

export function useAdminAuditLogs() {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs(),
    queryFn: () => adminService.getAuditLogs(),
  });
}

export function useAdminObservations() {
  return useQuery({
    queryKey: adminQueryKeys.observations(),
    queryFn: () => adminService.getObservations(),
  });
}

export function usePublishObservations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminService.publishObservations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.observations() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.auditLogs() });
      queryClient.invalidateQueries({ queryKey: ["fair-price"] });
      queryClient.invalidateQueries({ queryKey: ["price-board"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
      queryClient.invalidateQueries({ queryKey: ["spatial-disparity"] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
  });
}

export function useAdminModelEvaluation() {
  return useQuery({
    queryKey: adminQueryKeys.modelEvaluation(),
    queryFn: () => adminService.getModelEvaluation(),
    staleTime: 60_000,
  });
}

export function useAdminLivePredict() {
  return useMutation({
    mutationFn: (payload: AdminLivePredictRequest) =>
      adminService.predictLive(payload),
  });
}

export function useAdminAiIngest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminAiIngestRequest) =>
      adminService.ingestWeeklyPrices(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.observations() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.auditLogs() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.modelEvaluation() });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["fair-price"] });
      queryClient.invalidateQueries({ queryKey: ["price-board"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
      queryClient.invalidateQueries({ queryKey: ["spatial-disparity"] });
    },
  });
}

export function useModerateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      offerId,
      action,
      note,
    }: {
      offerId: string;
      action: "request_fix" | "resolve";
      note?: string;
    }) => adminService.moderateOffer(offerId, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.auditLogs() });
    },
  });
}
