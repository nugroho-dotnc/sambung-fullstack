import {z} from "zod";
export const actionSchema=z.enum(["order","counter","accept","reject","cancel","confirm"]);
export type Action=z.infer<typeof actionSchema>;
const price=z.number().int().positive().max(2147483647);
const confirmation={redConfirmed:z.boolean().optional(),referenceVersion:z.string().optional()};
export const orderSchema=z.object({offerId:z.uuid(),volumeKg:z.number().positive().max(999999999999.99).multipleOf(0.01),
  proposedPrice:price,notes:z.string().max(500).nullish(),...confirmation});
export const acceptSchema=z.object({priceOfferVersion:z.number().int().positive(),...confirmation});
export const counterSchema=acceptSchema.extend({proposedPrice:price,note:z.string().max(300).nullish()});
export const reasonSchema=z.object({reason:z.string().trim().min(5).max(300)});

