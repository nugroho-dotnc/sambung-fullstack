"use client";

import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { authKeys } from "@/features/auth/hooks/use-auth";
import type { UserProfile } from "@/features/auth/schemas";
import { subscriptionService } from "../services/subscription.service";

export const subscriptionKeys = {
  all: ["subscription"] as const,
  me: () => [...subscriptionKeys.all, "me"] as const,
};

function invalidateEntitlementAndContractQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
  void queryClient.invalidateQueries({ queryKey: ["price-history"] });
  void queryClient.invalidateQueries({ queryKey: ["forecasts"] });
  void queryClient.invalidateQueries({ queryKey: ["spatial-disparity"] });
  void queryClient.invalidateQueries({ queryKey: ["contracts"] });
  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

function invalidateSubscriptionCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: subscriptionKeys.me() });
  invalidateEntitlementAndContractQueries(queryClient);
}

export function useMySubscription(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const lastSyncedKeyRef = useRef<string | null>(null);
  const query = useQuery({
    queryKey: subscriptionKeys.me(),
    queryFn: () => subscriptionService.getMySubscription(),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!query.data || !query.data.eligible) return;
    const cachedUser = queryClient.getQueryData<UserProfile | null>(
      authKeys.currentUser()
    );
    const desiredKey = `${query.data.isPro}:${query.data.proExpiresAt ?? ""}`;
    if (
      cachedUser &&
      cachedUser.role === "pembeli" &&
      (Boolean(cachedUser.isPro) !== query.data.isPro ||
        (cachedUser.proExpiresAt ?? null) !== query.data.proExpiresAt) &&
      lastSyncedKeyRef.current !== desiredKey
    ) {
      lastSyncedKeyRef.current = desiredKey;
      invalidateEntitlementAndContractQueries(queryClient);
    }
  }, [query.data, queryClient]);

  return query;
}

export function useCheckoutSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { recreate?: boolean }) =>
      subscriptionService.checkoutSubscription(options),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.me() });
    },
  });
}

export function useSyncSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { orderId?: string }) =>
      subscriptionService.syncSubscription(options),
    onSuccess: () => {
      invalidateSubscriptionCaches(queryClient);
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { orderId?: string }) =>
      subscriptionService.cancelSubscription(options),
    onSuccess: () => {
      invalidateSubscriptionCaches(queryClient);
    },
  });
}
