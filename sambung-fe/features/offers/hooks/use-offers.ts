"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { executeOfferCommand, getOffer, getOffers } from "../services/offer.service";
import type { OfferCommand } from "../schemas";

export const offerKeys = {
  all: ["offers"] as const,
  list: ["offers", "list"] as const,
  detail: (id: string) => ["offers", "detail", id] as const,
};

export function useOffers() {
  return useQuery({ queryKey: offerKeys.list, queryFn: ({ signal }) => getOffers(signal) });
}

export function useOffer(id: string) {
  return useQuery({ queryKey: offerKeys.detail(id), queryFn: ({ signal }) => getOffer(id, signal), enabled: Boolean(id) });
}

export function useOfferCommand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ command, requestId }: { command: OfferCommand; requestId: string }) => executeOfferCommand(command, requestId),
    onSuccess: async (offer) => {
      client.setQueryData(offerKeys.detail(offer.id), offer);
      await client.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}
