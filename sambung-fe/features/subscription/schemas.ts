import { z } from "zod";
import {
  paymentStatusSchema,
} from "@/features/contracts/schemas";

export const subscriptionPaymentSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  planCode: z.string(),
  attempt: z.number().int().positive(),
  orderId: z.string(),
  amount: z.number().int().positive(),
  durationDays: z.number().int().positive(),
  currency: z.string(),
  provider: z.string(),
  status: paymentStatusSchema,
  paymentType: z.string().nullable().optional(),
  paymentChannel: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  midtransTransactionId: z.string().nullable().optional(),
  midtransStatus: z.string().nullable().optional(),
  fraudStatus: z.string().nullable().optional(),
  redirectUrl: z.string().nullable().optional(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  lastSyncedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const subscriptionStatusSchema = z.enum([
  "free",
  "active",
  "expired",
  "not_applicable",
]);

export const subscriptionMeSchema = z.object({
  eligible: z.boolean(),
  planCode: z.string(),
  planName: z.string(),
  priceIdr: z.number().int().positive(),
  durationDays: z.number().int().positive(),
  buyerFeeRate: z.number(),
  standardFeeRate: z.number(),
  proFeeRate: z.number(),
  isPro: z.boolean(),
  status: subscriptionStatusSchema,
  proExpiresAt: z.string().nullable(),
  remainingDays: z.number().int().min(0),
  latestPayment: subscriptionPaymentSchema.nullable(),
  history: z.array(subscriptionPaymentSchema),
  midtransConfigured: z.boolean(),
});

export const subscriptionCheckoutResponseSchema = z.object({
  payment: subscriptionPaymentSchema,
  snapToken: z.string(),
  redirectUrl: z.string(),
  clientKey: z.string(),
  snapScriptUrl: z.string(),
});

export const subscriptionSyncResponseSchema = z.object({
  subscription: subscriptionMeSchema,
  payment: subscriptionPaymentSchema,
  synced: z.boolean(),
  awaitingMethodSelection: z.boolean(),
});

export type SubscriptionPayment = z.infer<typeof subscriptionPaymentSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type SubscriptionMe = z.infer<typeof subscriptionMeSchema>;
export type SubscriptionCheckoutResponse = z.infer<typeof subscriptionCheckoutResponseSchema>;
export type SubscriptionSyncResponse = z.infer<typeof subscriptionSyncResponseSchema>;
