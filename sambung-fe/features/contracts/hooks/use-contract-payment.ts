"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContractService } from "../services/contract.service";
import { CONTRACT_QUERY_KEYS } from "./use-contracts";

/**
 * Initiates or reuses a Midtrans Sandbox Snap payment session and refreshes contract & notification queries.
 */
export function useInitiatePayment(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { recreate?: boolean }) =>
      ContractService.initiatePayment(contractId, options),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CONTRACT_QUERY_KEYS.detail(contractId),
        }),
        queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

/**
 * Polls backend Midtrans Sandbox Status API for authoritative payment state transitions.
 */
export function useSyncPayment(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ContractService.syncPayment(contractId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CONTRACT_QUERY_KEYS.detail(contractId),
        }),
        queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}
