import { z } from "zod";

export const isoDateSchema = z
  .string({ message: "Format tanggal harus YYYY-MM-DD." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    );
  }, "Tanggal kalender tidak valid.");

export const spatialDisparityQuerySchema = z.strictObject({
  province: z.string().trim().min(2, "Nama provinsi minimal 2 karakter.").optional(),
  status: z
    .enum(["above", "below", "normal"], {
      message: "Status disparitas harus above, below, atau normal.",
    })
    .optional(),
});

export const priceBoardQuerySchema = z.strictObject({
  region: z.string().trim().min(2, "Nama wilayah minimal 2 karakter.").optional(),
  period: z
    .enum(["4 Pekan Terakhir", "8 Pekan Terakhir", "12 Pekan Terakhir", "Rata-rata 30 Hari"], {
      message: "Periode papan harga tidak valid.",
    })
    .optional(),
});

export const fairPriceParamsQuerySchema = z.strictObject({});

export const modelEvaluationQuerySchema = z.strictObject({});

export const fairPriceCalculateBodySchema = z.strictObject({
  grainType: z.enum(["GKP", "GKG"], { message: "Jenis gabah harus GKP atau GKG." }),
  region: z.string().trim().min(2, "Nama wilayah minimal 2 karakter."),
  ricePrice: z
    .number({ message: "Harga beras harus berupa angka." })
    .min(8000, "Harga beras minimal Rp8.000/kg.")
    .max(40000, "Harga beras maksimal Rp40.000/kg.")
    .optional(),
  rendemen: z
    .number({ message: "Rendemen harus berupa angka." })
    .min(0.4, "Rendemen minimal 0.40.")
    .max(0.75, "Rendemen maksimal 0.75.")
    .optional(),
  moisturePercent: z
    .number({ message: "Kadar air harus berupa angka." })
    .min(8, "Kadar air minimal 8%.")
    .max(35, "Kadar air maksimal 35%.")
    .optional(),
  hppGovernment: z
    .number({ message: "HPP pemerintah harus berupa angka." })
    .int("HPP pemerintah harus bilangan bulat.")
    .min(3000, "HPP pemerintah minimal Rp3.000/kg.")
    .max(20000, "HPP pemerintah maksimal Rp20.000/kg.")
    .optional(),
});

export const livePredictOverridesSchema = z.strictObject({
  currentPrice: z.number().min(8000).max(35000).optional(),
  precip28d: z.number().min(0).max(1500).optional(),
  stickyWeeks: z.number().min(0).max(64).optional(),
  shockGrosirPct: z.number().min(-0.4).max(0.6).optional(),
  shockTradPct: z.number().min(-0.4).max(0.6).optional(),
  shockPeerPct: z.number().min(-0.4).max(0.6).optional(),
  shockBwh1Pct: z.number().min(-0.4).max(0.6).optional(),
});

export const livePredictBodySchema = z.strictObject({
  province: z.string().trim().min(2, "Nama provinsi minimal 2 karakter."),
  horizonWeeks: z.union([z.literal(2), z.literal(4)], {
    message: "Horizon prakiraan harus 2 atau 4 pekan.",
  }),
  weekStart: isoDateSchema.optional(),
  overrides: livePredictOverridesSchema.optional(),
  forceAi: z.boolean().optional(),
});

export const weeklyProvinceUpdateSchema = z.strictObject({
  province: z.string().trim().min(2, "Nama provinsi minimal 2 karakter."),
  producerPrice: z
    .number({ message: "Harga produsen harus berupa angka." })
    .min(7000, "Harga produsen minimal Rp7.000/kg.")
    .max(35000, "Harga produsen maksimal Rp35.000/kg."),
  wholesalePrice: z.number().min(7000).max(40000).optional(),
  retailPrice: z.number().min(7000).max(45000).optional(),
  precip28d: z.number().min(0).max(1500).optional(),
});

export const weeklyIngestBodySchema = z.strictObject({
  weekStart: isoDateSchema,
  updates: z
    .array(weeklyProvinceUpdateSchema)
    .min(1, "Minimal 1 pembaruan provinsi diperlukan.")
    .max(50, "Maksimal 50 entri provinsi per permintaan ingest."),
  persist: z.boolean().optional(),
});
