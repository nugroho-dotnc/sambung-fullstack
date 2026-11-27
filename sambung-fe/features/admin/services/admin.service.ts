import { apiClient } from "@/lib/api/client";
import type {
  AdminAiIngestRequest,
  AdminAiIngestResponse,
  AdminLivePredictRequest,
  AdminLivePredictResponse,
  AdminStats,
  AuditLogEntry,
  ModelEvaluationResponse,
  PriceObservationRecord,
  SystemParameters,
} from "../domain/admin-types";
import type { UserProfile } from "@/features/auth/schemas";
import type { HarvestOffer } from "@/features/offers/schemas";

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    return apiClient.get<AdminStats>("/admin/stats");
  },

  getUsers: async (): Promise<UserProfile[]> => {
    return apiClient.get<UserProfile[]>("/admin/users");
  },

  getParameters: async (): Promise<SystemParameters> => {
    return apiClient.get<SystemParameters>("/admin/parameters");
  },

  updateParameters: async (
    updates: Partial<SystemParameters>,
  ): Promise<SystemParameters> => {
    return apiClient.post<SystemParameters>("/admin/parameters", updates);
  },

  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    return apiClient.get<AuditLogEntry[]>("/admin/audit-logs");
  },

  getObservations: async (): Promise<PriceObservationRecord[]> => {
    return apiClient.get<PriceObservationRecord[]>("/admin/observations");
  },

  publishObservations: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(
      "/admin/observations/publish",
      {},
    );
  },

  getModelEvaluation: async (): Promise<ModelEvaluationResponse> => {
    return apiClient.get<ModelEvaluationResponse>("/admin/model-evaluation");
  },

  predictLive: async (
    payload: AdminLivePredictRequest,
  ): Promise<AdminLivePredictResponse> => {
    const body: Record<string, unknown> = {
      province: payload.province,
      horizonWeeks: payload.horizonWeeks,
    };
    if (payload.weekStart) body.weekStart = payload.weekStart;
    if (payload.forceAi !== undefined) body.forceAi = payload.forceAi;
    if (payload.overrides) {
      const cleanOverrides: Record<string, number> = {};
      for (const [k, v] of Object.entries(payload.overrides)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          cleanOverrides[k] = v;
        }
      }
      if (Object.keys(cleanOverrides).length > 0) {
        body.overrides = cleanOverrides;
      }
    }
    return apiClient.post<AdminLivePredictResponse>("/admin/predict/live", body);
  },

  ingestWeeklyPrices: async (
    payload: AdminAiIngestRequest,
  ): Promise<AdminAiIngestResponse> => {
    const cleanUpdates = payload.updates.map((row) => {
      const entry: Record<string, unknown> = {
        province: row.province.trim(),
        producerPrice: row.producerPrice,
      };
      if (row.wholesalePrice !== undefined) entry.wholesalePrice = row.wholesalePrice;
      if (row.retailPrice !== undefined) entry.retailPrice = row.retailPrice;
      if (row.precip28d !== undefined) entry.precip28d = row.precip28d;
      return entry;
    });

    const body: Record<string, unknown> = {
      weekStart: payload.weekStart,
      updates: cleanUpdates,
    };
    if (payload.persist !== undefined) {
      body.persist = payload.persist;
    }
    return apiClient.post<AdminAiIngestResponse>("/admin/ai/ingest", body);
  },

  moderateOffer: async (
    offerId: string,
    action: "request_fix" | "resolve",
    note?: string,
  ): Promise<{ success: boolean; offer: HarvestOffer }> => {
    return apiClient.post<{ success: boolean; offer: HarvestOffer }>(
      "/admin/moderation",
      { offerId, action, note },
    );
  },
};
