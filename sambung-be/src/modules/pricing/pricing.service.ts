import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { digest } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { calculate } from "./ai-price.client.ts";

export const referenceInput = z.object({regionId:z.string().min(1), grainType:z.enum(["GKP","GKG"]),
  quality:z.coerce.number().min(0).max(100).nullish(), period:z.literal("current").optional()});
export const previewInput = referenceInput.extend({action:z.enum(["order","counter","accept","publish"]).optional(),price:z.number().int().positive().max(2147483647)});
export async function reference(db: PrismaClient, input: z.infer<typeof referenceInput>) {
  const region = await db.region.findUnique({where:{id:input.regionId}});
  if (!region) throw new ApiError(422,"INVALID_REGION","Pilih kecamatan yang tersedia.");
  const result = await calculate(input.grainType, region.province, input.quality ?? null);
  const bounds = {lowerOriginal:result.lowerBound,upperOriginal:result.upperBound,
    lowerOperational:Math.round(result.lowerBound),upperOperational:Math.round(result.upperBound)};
  const data = {...result, regionId:region.id, quality:input.quality ?? null, bounds, deltaBp:300};
  return {...data, referenceVersion:digest(JSON.stringify(data)),computedAt:new Date().toISOString(),
    availability:"available",period:"current",reason:null};
}
export async function preview(db: PrismaClient, input: z.infer<typeof previewInput>) {
  const ref = await reference(db,input);
  const {lowerOperational:l,upperOperational:u} = ref.bounds;
  const red = input.price*10000 < l*(10000-ref.deltaBp);
  const light = red ? "merah" : input.price < l || input.price > u ? "kuning" : "hijau";
  return {reference:{...ref,referenceVersion:digest(ref.referenceVersion+"|"+(input.action ?? "publish")+"|"+input.price)},
    price:input.price, light, requiresConfirmation:red,reason:"Harga dibandingkan dengan rentang acuan wilayah."};
}
