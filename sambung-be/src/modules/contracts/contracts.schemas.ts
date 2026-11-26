import { z } from "zod";

export const actionSchema = z.enum(["order", "counter", "accept", "reject", "cancel", "confirm"]);
export type Action = z.infer<typeof actionSchema>;

const price = z
  .number({ message: "Nominal harga harus berupa angka." })
  .int("Harga penawaran harus berupa angka bulat rupiah per kg.")
  .positive("Harga penawaran harus lebih dari Rp0.")
  .max(2147483647, "Nominal harga melebihi batas maksimal.");

const confirmation = {
  redConfirmed: z.boolean().optional(),
  referenceVersion: z.string().optional(),
};

export const orderSchema = z.object({
  offerId: z.uuid("ID tawaran tidak valid."),
  volumeKg: z
    .number({ message: "Volume pesanan harus berupa angka." })
    .positive("Volume pesanan harus lebih besar dari 0 kg.")
    .max(999999999999.99, "Volume pesanan melebihi batas maksimal.")
    .multipleOf(0.01, "Volume maksimal dua angka di belakang koma."),
  proposedPrice: price,
  notes: z.string().max(500, "Catatan pesanan maksimal 500 karakter.").nullish(),
  ...confirmation,
});

export const acceptSchema = z.object({
  priceOfferVersion: z.number().int().positive("Versi penawaran harga tidak valid."),
  ...confirmation,
});

export const counterSchema = acceptSchema.extend({
  proposedPrice: price,
  note: z.string().max(300, "Catatan penawaran harga maksimal 300 karakter.").nullish(),
});

export const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Tuliskan alasan minimal 5 karakter agar mitra memahami kondisinya.")
    .max(300, "Alasan maksimal 300 karakter."),
});
