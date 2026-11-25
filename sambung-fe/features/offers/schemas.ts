import { z } from "zod";

export const offerInputSchema = z.object({
  grainType: z.enum(["GKP", "GKG"]),
  province: z.string().optional().default("Jawa Barat"),
  regency: z.string().optional().default("Subang"),
  districtId: z.string().optional().default("Pagaden"),
  district: z.string().optional().default("Pagaden"),
  farmerName: z.string().optional(),
  totalVolumeKg: z.number().positive("Volume harus berupa angka positif.").max(Number.MAX_SAFE_INTEGER / 100).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "Volume maksimal dua angka desimal.",
  ),
  askPrice: z.number().int("Harga harus berupa bilangan bulat.").positive("Harga harus lebih dari Rp0.").max(Number.MAX_SAFE_INTEGER),
  quality: z.number().min(0, "Kadar air/mutu minimal 0%.").max(100, "Kadar air/mutu maksimal 100%.").nullable(),
  availableOn: z.string().nullable().optional(),
  notes: z.string().max(500, "Catatan maksimal 500 karakter.").optional().nullable(),
});

export const harvestOfferSchema = offerInputSchema.extend({
  id: z.string(),
  ownerId: z.string(),
  farmerName: z.string().optional(),
  status: z.enum(["draft", "published", "withdrawn"]),
  version: z.number().int().positive(),
  reservedVolumeKg: z.number().nonnegative(),
  approvedVolumeKg: z.number().nonnegative(),
  completedVolumeKg: z.number().nonnegative(),
  availableVolumeKg: z.number().nonnegative(),
  typeLocationLocked: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  priceCheck:z.object({reference:z.object({bounds:z.object({lowerOperational:z.number(),upperOperational:z.number()}),deltaBp:z.number(),sourceMode:z.string().optional(),sourceDate:z.string().nullable().optional()})}).nullable().optional(),
  rejectionReason: z.string().optional().nullable(),
});

export type OfferInput = z.infer<typeof offerInputSchema>;
export type HarvestOffer = z.infer<typeof harvestOfferSchema>;

export const offerCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), input: offerInputSchema }),
  z.object({ action: z.literal("update"), referenceVersion:z.string().optional(),redConfirmed:z.boolean().optional(), id: z.string(), version: z.number().int().positive(), input: offerInputSchema }),
  z.object({ action: z.enum(["publish", "withdraw"]), referenceVersion:z.string().optional(), redConfirmed:z.boolean().optional(), id: z.string(), version: z.number().int().positive() }),
]);
export type OfferCommand = z.infer<typeof offerCommandSchema>;
