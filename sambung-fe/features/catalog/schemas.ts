import { z } from "zod";
import { harvestOfferSchema } from "@/features/offers/schemas";

export const catalogQueryFilterSchema = z.object({
  grainType: z.enum(["ALL", "GKP", "GKG"]).optional().default("ALL"),
  regency: z.string().optional(),
  district: z.string().optional(),
  minVolumeKg: z.number().optional(),
  maxPrice: z.number().optional(),
  search: z.string().optional(),
});

export type CatalogQueryFilter = z.infer<typeof catalogQueryFilterSchema>;

export const catalogItemSchema = harvestOfferSchema.extend({
  farmerBusiness: z.string().optional(),
  isDirectFarmer: z.boolean().default(true),
});

export type CatalogItem = z.infer<typeof catalogItemSchema>;
