import { z } from "zod";

export const actionSchema = z.enum([
  "order",
  "counter",
  "accept",
  "reject",
  "cancel",
  "sign",
  "ship",
  "receive",
  "dispute",
]);
export type Action = z.infer<typeof actionSchema>;

export const signSchema = z
  .object({
    type: z.enum(["draw", "type"], {
      message: "Tipe tanda tangan harus berupa goresan ('draw') atau ketikan ('type').",
    }),
    signature: z.string().min(1, "Data tanda tangan wajib diisi."),
  })
  .superRefine((data, ctx) => {
    if (data.type === "draw") {
      if (
        data.signature.length > 120_000 ||
        !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.signature)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["signature"],
          message: "Format gambar tanda tangan digital harus berupa PNG base64 yang valid.",
        });
      }
    } else {
      const trimmedLen = data.signature.trim().length;
      if (trimmedLen < 2 || trimmedLen > 120) {
        ctx.addIssue({
          code: "custom",
          path: ["signature"],
          message: "Nama tanda tangan ketik harus terdiri dari 2 hingga 120 karakter.",
        });
      }
    }
  });

export const shipSchema = z.object({
  notes: z.string().max(300, "Catatan pengiriman maksimal 300 karakter.").optional(),
});

export const receiveSchema = z.object({
  actualVolumeKg: z
    .number({ message: "Berat timbang aktual harus berupa angka." })
    .positive("Berat timbang aktual harus lebih besar dari 0 kg.")
    .max(999999999999.99, "Berat timbang aktual melebihi batas maksimal.")
    .multipleOf(0.01, "Berat timbang maksimal dua angka di belakang koma.")
    .optional(),
  actualMoisturePercent: z
    .number({ message: "Kadar air aktual harus berupa angka." })
    .min(5, "Kadar air aktual minimal 5%.")
    .max(45, "Kadar air aktual maksimal 45%.")
    .optional(),
  notes: z.string().max(500, "Catatan penerimaan maksimal 500 karakter.").optional(),
});

export const disputeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Jelaskan kendala atau alasan sengketa minimal 10 karakter.")
    .max(500, "Alasan sengketa maksimal 500 karakter."),
});

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
