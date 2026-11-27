import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { digest } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { resolveValidHpp, resolveValidRendemen, resolveValidTolerance } from "../ai/ai.service.ts";
import { calculate } from "./ai-price.client.ts";

export const referenceInput = z.object({
  regionId: z.string().min(1, "Pilih kecamatan yang tersedia."),
  grainType: z.enum(["GKP", "GKG"], { message: "Jenis gabah harus GKP atau GKG." }),
  quality: z.coerce.number().min(0, "Kadar air minimal 0%.").max(100, "Kadar air maksimal 100%.").nullish(),
  period: z.literal("current").optional(),
});

export const previewInput = referenceInput.extend({
  action: z.enum(["order", "counter", "accept", "publish"]).optional(),
  price: z
    .number({ message: "Nominal harga harus berupa angka." })
    .int("Nominal harga harus berupa angka bulat.")
    .positive("Nominal harga harus lebih dari Rp0.")
    .max(2147483647, "Nominal harga melebihi batas maksimal."),
});

export async function reference(db: PrismaClient, input: z.infer<typeof referenceInput>) {
  const [region, sysParam] = await Promise.all([
    db.region.findUnique({ where: { id: input.regionId } }),
    db.systemParameter.findUnique({ where: { id: "active" } }),
  ]);
  if (!region) {
    throw new ApiError(422, "INVALID_REGION", "Pilih kecamatan yang tersedia pada daftar wilayah.");
  }

  const rendemen = resolveValidRendemen(
    input.grainType === "GKP" ? sysParam?.rendemenGKP : sysParam?.rendemenGKG
  );
  const hppGovernment =
    input.grainType === "GKP" ? resolveValidHpp(sysParam?.governmentFloorPriceGKP) : undefined;

  const result = await calculate(input.grainType, region.province, input.quality ?? null, {
    rendemen,
    hppGovernment,
  });
  const bounds = {
    lowerOriginal: result.lowerBound,
    upperOriginal: result.upperBound,
    lowerOperational: Math.round(result.lowerBound),
    upperOperational: Math.round(result.upperBound),
  };
  const deltaBp = Math.round(resolveValidTolerance(sysParam?.fairPriceToleranceDelta) * 10000);
  const data = { ...result, regionId: region.id, quality: input.quality ?? null, bounds, deltaBp };

  return {
    ...data,
    referenceVersion: digest(JSON.stringify(data)),
    computedAt: new Date().toISOString(),
    availability: "available",
    period: "current",
    reason: null,
  };
}

export async function preview(db: PrismaClient, input: z.infer<typeof previewInput>) {
  const ref = await reference(db, input);
  const { lowerOperational: l, upperOperational: u } = ref.bounds;
  const red = input.price * 10000 < l * (10000 - ref.deltaBp);
  const light = red ? "merah" : input.price < l || input.price > u ? "kuning" : "hijau";

  return {
    reference: {
      ...ref,
      referenceVersion: digest(`${ref.referenceVersion}|${input.action ?? "publish"}|${input.price}`),
    },
    price: input.price,
    light,
    requiresConfirmation: red,
    reason: "Harga dibandingkan dengan rentang acuan wilayah.",
  };
}
