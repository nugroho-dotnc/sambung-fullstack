import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { harvestOfferSchema, offerCommandSchema, type OfferCommand } from "../schemas";

export async function getOffers(signal?: AbortSignal) {
  const response = await apiClient("/offers", { signal });
  return z.object({ data: z.array(harvestOfferSchema) }).parse(response).data;
}

export async function getOffer(id: string, signal?: AbortSignal) {
  return harvestOfferSchema.parse(await apiClient(`/offers/${encodeURIComponent(id)}`, { signal }));
}

export async function executeOfferCommand(command: OfferCommand, requestId: string) {
  const parsed = offerCommandSchema.parse(command);
  const path = parsed.action === "create" ? "/offers" : `/offers/${encodeURIComponent(parsed.id)}${parsed.action === "update" ? "" : `/${parsed.action}`}`;
  const json = parsed.action === "create" ? parsed.input : parsed.action === "update" ? { ...parsed.input, version: parsed.version, referenceVersion:parsed.referenceVersion, redConfirmed:parsed.redConfirmed } : { version: parsed.version, referenceVersion:parsed.referenceVersion, redConfirmed:parsed.redConfirmed };
  return harvestOfferSchema.parse(await apiClient(path, {
    method: parsed.action === "update" ? "PATCH" : "POST",
    json,
    headers: { "Idempotency-Key": requestId },
  }));
}
