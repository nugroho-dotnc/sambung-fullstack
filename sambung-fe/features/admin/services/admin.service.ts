import { apiClient } from "@/lib/api/client";
import type {
  AdminStats,
  SystemParameters,
  PriceObservationRecord,
  AuditLogEntry,
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
    updates: Partial<SystemParameters>
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
      {}
    );
  },

  moderateOffer: async (
    offerId: string,
    action: "request_fix" | "resolve",
    note?: string
  ): Promise<{ success: boolean; offer: HarvestOffer }> => {
    return apiClient.post<{ success: boolean; offer: HarvestOffer }>(
      "/admin/moderation",
      { offerId, action, note }
    );
  },
};
