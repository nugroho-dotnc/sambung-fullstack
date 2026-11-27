"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/hooks/use-auth";
import { subscriptionService } from "../services/subscription.service";

export const subscriptionKeys = {
  all: ["subscription"] as const,
  me: () => [...subscriptionKeys.all, "me"] as const,
};

export function useMySubscription(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: subscriptionKeys.me(),
    queryFn: () => subscriptionService.getMySubscription(),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
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
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.me() });
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      void queryClient.invalidateQueries({ queryKey: ["price-history"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
