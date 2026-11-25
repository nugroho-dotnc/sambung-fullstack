import { z } from "zod";
export const inputSchema = z.object({
  districtId:z.string().min(1), grainType:z.enum(["GKP","GKG"]),
  totalVolumeKg:z.number().positive().max(999999999999.99).multipleOf(0.01),
  askPrice:z.number().int().positive().max(2147483647),quality:z.number().min(0).max(100).nullable(),
  notes:z.string().max(500).nullish(),availableOn:z.iso.date().nullish()
});
export const versionSchema = z.object({version:z.number().int().positive(),
  referenceVersion:z.string().max(128).optional(),redConfirmed:z.boolean().optional()});
