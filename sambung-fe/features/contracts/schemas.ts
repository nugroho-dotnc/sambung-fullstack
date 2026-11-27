import { z } from "zod";

export const contractStatusSchema = z.enum([
  "pending",
  "approved",
  "signed",
  "shipping",
  "completed",
  "rejected",
  "cancelled",
  "expired",
]);

export const paymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "refunded",
]);

export const escrowStatusSchema = z.enum([
  "unpaid",
  "held",
  "released",
  "refunded",
]);

export const contractPaymentSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  attempt: z.number().int().positive(),
  orderId: z.string(),
  contractAmount: z.number(),
  buyerFeeAmount: z.number(),
  grossAmount: z.number(),
  currency: z.string(),
  provider: z.string(),
  status: paymentStatusSchema,
  escrowStatus: escrowStatusSchema,
  paymentType: z.string().nullable().optional(),
  paymentChannel: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  midtransTransactionId: z.string().nullable().optional(),
  midtransStatus: z.string().nullable().optional(),
  fraudStatus: z.string().nullable().optional(),
  redirectUrl: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  releasedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  lastSyncedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const initiatePaymentResponseSchema = z.object({
  payment: contractPaymentSchema,
  snapToken: z.string(),
  redirectUrl: z.string(),
  clientKey: z.string(),
  snapScriptUrl: z.string(),
});

export const syncPaymentResponseSchema = z.object({
  payment: contractPaymentSchema,
  synced: z.boolean(),
  awaitingMethodSelection: z.boolean(),
});

export const negotiationHistoryItemSchema = z.object({
  id: z.string(),
  role: z.enum(["petani", "pembeli"]),
  authorName: z.string(),
  price: z.number().int().positive(),
  note: z.string().optional().nullable(),
  timestamp: z.string(),
});

export const contractSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  farmerId: z.string(),
  farmerName: z.string(),
  farmerPhone: z.string().optional(),
  priceOfferVersion:z.number().int().optional(),
  priceReference:z.object({bounds:z.object({lowerOperational:z.number(),upperOperational:z.number()}),deltaBp:z.number(),
    referenceSource:z.string(),sourceDate:z.string().nullable().optional()}).nullable().optional(),
  quality:z.number().nullable().optional(),
  farmerBusiness: z.string().optional(),
  buyerId: z.string(),
  buyerName: z.string(),
  buyerPhone: z.string().optional(),
  buyerBusiness: z.string().optional(),
  grainType: z.enum(["GKP", "GKG"]),
  volumeKg: z.number().positive(),
  initialPrice: z.number().int().positive(),
  currentPrice: z.number().int().positive(),
  farmerAskPrice: z.number().int().positive(),
  status: contractStatusSchema,
  currentTurnRole: z.enum(["petani", "pembeli"]),
  history: z.array(negotiationHistoryItemSchema),
  expiresAt: z.string(),
  paymentDueAt: z.string().optional().nullable(),
  paymentGraceEndsAt: z.string().optional().nullable(),
  paymentReminderSentAt: z.string().optional().nullable(),
  payment: contractPaymentSchema.optional().nullable(),
  buyerIsPro: z.boolean().optional(),
  buyerFeeRate: z.number().optional(),
  farmerConfirmed: z.boolean(),
  buyerConfirmed: z.boolean(),
  farmerSignature: z.string().optional().nullable(),
  farmerSignatureType: z.string().optional().nullable(),
  farmerSignedAt: z.string().optional().nullable(),
  buyerSignature: z.string().optional().nullable(),
  buyerSignatureType: z.string().optional().nullable(),
  buyerSignedAt: z.string().optional().nullable(),
  shippedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  cancelReason: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  province: z.string().optional().default("Jawa Barat"),
  regency: z.string().optional().default("Subang"),
  district: z.string().optional().default("Pagaden"),
});

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type EscrowStatus = z.infer<typeof escrowStatusSchema>;
export type ContractPayment = z.infer<typeof contractPaymentSchema>;
export type InitiatePaymentResponse = z.infer<typeof initiatePaymentResponseSchema>;
export type SyncPaymentResponse = z.infer<typeof syncPaymentResponseSchema>;
export type NegotiationHistoryItem = z.infer<typeof negotiationHistoryItemSchema>;
export type Contract = z.infer<typeof contractSchema>;

export const createOrderInputSchema = z.object({
  offerId: z.string().min(1, "ID tawaran wajib disertakan."),
  volumeKg: z.number().positive("Volume harus lebih besar dari 0 kg."),
  proposedPrice: z.number().int().positive("Harga harus berupa angka bulat positif."),
  notes: z.string().max(500, "Catatan maksimal 500 karakter.").optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const counterOfferInputSchema = z.object({
  proposedPrice: z.number().int().positive("Nominal harga harus bulat positif."),
  note: z.string().max(300, "Alasan / catatan maksimal 300 karakter.").optional().nullable(),
});

export type CounterOfferInput = z.infer<typeof counterOfferInputSchema>;

export const cancelContractInputSchema = z.object({
  reason: z.string().min(5, "Alasan pembatalan minimal 5 karakter.").max(300),
});

export type CancelContractInput = z.infer<typeof cancelContractInputSchema>;
