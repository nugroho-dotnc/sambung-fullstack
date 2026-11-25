import { z } from "zod";

export const roleSchema = z.enum(["petani", "pembeli", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  role: roleSchema,
  name: z.string().min(1, "Nama lengkap wajib diisi"),
  phone: z.string(),
  email: z.string().email().optional(),
  province: z.string().min(1, "Provinsi wajib diisi"),
  regency: z.string().min(1, "Kabupaten/Kota wajib diisi"),
  district: z.string().min(1, "Kecamatan wajib diisi"),
  businessName: z.string().optional(),
  status: z.enum(["active", "closing", "closed"]).default("active"),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
export type SessionUser = UserProfile;

// Input untuk meminta OTP
export const requestOtpInputSchema = z.object({
  phone: z
    .string()
    .min(10, "Nomor ponsel minimal 10 digit")
    .max(15, "Nomor ponsel maksimal 15 digit")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Format nomor ponsel Indonesia tidak valid (contoh: 081234567890)"),
});
export type RequestOtpInput = z.infer<typeof requestOtpInputSchema>;

// Input untuk verifikasi OTP
export const verifyOtpInputSchema = z.object({
  phone: z.string().min(10),
  otpCode: z
    .string()
    .length(4, "Kode OTP harus 4 digit")
    .regex(/^\d+$/, "Kode OTP harus berupa angka"),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpInputSchema>;

// Input pendaftaran profil baru
export const registerProfileInputSchema = z.object({
  phone: z.string().min(10),
  role: z.enum(["petani", "pembeli"]),
  name: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  province: z.string().min(1, "Provinsi wajib dipilih"),
  regency: z.string().min(1, "Kabupaten/Kota wajib dipilih"),
  district: z.string().min(1, "Kecamatan wajib dipilih"),
  businessName: z.string().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "Anda harus menyetujui Ketentuan Layanan & Kebijakan Data",
  }),
});
export type RegisterProfileInput = z.infer<typeof registerProfileInputSchema>;

// Input login admin
export const adminLoginInputSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});
export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;
