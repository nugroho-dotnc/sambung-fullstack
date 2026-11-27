import { z } from "zod";

export const subscriptionCheckoutSchema = z
  .strictObject({
    recreate: z.boolean().optional(),
  })
  .default({});

export const subscriptionSyncSchema = z
  .strictObject({
    orderId: z.string().trim().min(1).max(64).optional(),
  })
  .default({});
