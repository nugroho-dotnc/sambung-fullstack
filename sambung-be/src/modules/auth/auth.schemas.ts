import { z } from "zod";

const phone = z
  .string()
  .min(10, "Nomor ponsel minimal 10 digit.")
  .max(15, "Nomor ponsel maksimal 15 digit.")
  .regex(/^(?:\+62|62|0)8[1-9]\d{6,11}$/, "Format nomor ponsel Indonesia tidak valid (contoh: 081234567890).")
  .transform((value) => value.replace(/^(?:\+62|0)/, "62"));

const location = z.string().trim().min(1, "Wilayah domisili wajib diisi.").max(200, "Nama wilayah maksimal 200 karakter.");

export const requestSchema = z.object({ phone });

export const verifySchema = requestSchema.extend({
  otpCode: z.string().regex(/^\d{4}$/, "Kode verifikasi harus berupa 4 digit angka."),
});

export const registerSchema = requestSchema.extend({
  role: z.enum(["petani", "pembeli"], { message: "Pilih peran akun sebagai Petani atau Produsen." }),
  agreedToTerms: z.literal(true, { message: "Anda harus menyetujui ketentuan layanan terlebih dahulu." }),
  name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(200, "Nama lengkap maksimal 200 karakter."),
  province: location,
  regency: location,
  district: location,
  businessName: z.string().max(200, "Nama usaha atau kelompok tani maksimal 200 karakter.").optional(),
});

export type Registration = z.infer<typeof registerSchema>;
