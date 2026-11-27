import { z } from "zod";

export const initiatePaymentBodySchema = z
  .object({
    recreate: z.boolean().optional(),
  })
  .optional()
  .default({});

export const midtransWebhookSchema = z
  .object({
    order_id: z.string().min(1),
    status_code: z.union([z.string(), z.number()]).transform((v) => String(v)),
    gross_amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
    signature_key: z.string().min(1),
    transaction_status: z.string().min(1),
    fraud_status: z.string().optional().nullable(),
    transaction_id: z.string().optional().nullable(),
    payment_type: z.string().optional().nullable(),
    va_numbers: z
      .array(
        z.object({
          bank: z.string().optional(),
          va_number: z.string().optional(),
        })
      )
      .optional(),
    permata_va_number: z.string().optional().nullable(),
    bill_key: z.string().optional().nullable(),
    biller_code: z.string().optional().nullable(),
    acquirer: z.string().optional().nullable(),
    store: z.string().optional().nullable(),
    payment_code: z.string().optional().nullable(),
    bank: z.string().optional().nullable(),
    masked_card: z.string().optional().nullable(),
  })
  .passthrough();

export type MidtransWebhookPayload = z.infer<typeof midtransWebhookSchema>;
