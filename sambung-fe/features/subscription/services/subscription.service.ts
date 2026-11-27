import { apiClient } from "@/lib/api/client";
import {
  subscriptionCheckoutResponseSchema,
  subscriptionMeSchema,
  subscriptionSyncResponseSchema,
  type SubscriptionCheckoutResponse,
  type SubscriptionMe,
  type SubscriptionSyncResponse,
} from "../schemas";

export const subscriptionService = {
  async getMySubscription(): Promise<SubscriptionMe> {
    const { data } = await apiClient.get<{ data: unknown }>("/subscription/me");
    return subscriptionMeSchema.parse(data);
  },

  async checkoutSubscription(options?: {
    recreate?: boolean;
  }): Promise<SubscriptionCheckoutResponse> {
    const { data } = await apiClient.post<{ data: unknown }>(
      "/subscription/checkout",
      { recreate: options?.recreate ?? false }
    );
    return subscriptionCheckoutResponseSchema.parse(data);
  },

  async syncSubscription(options?: {
    orderId?: string;
  }): Promise<SubscriptionSyncResponse> {
    const body = options?.orderId ? { orderId: options.orderId } : {};
    const { data } = await apiClient.post<{ data: unknown }>(
      "/subscription/sync",
      body
    );
    return subscriptionSyncResponseSchema.parse(data);
  },
};
