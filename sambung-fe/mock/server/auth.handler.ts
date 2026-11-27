import { ApiError } from "@/lib/api/errors";
import { readDb, writeDb } from "./db";
import {
  requestOtpInputSchema,
  verifyOtpInputSchema,
  registerProfileInputSchema,
  adminLoginInputSchema,
  type UserProfile,
} from "@/features/auth/schemas";

export function handleAuthRequest(path: string, method: string, body: unknown): unknown {
  const db = readDb();

  // 0. Mode OTP demo
  if (path === "/auth/otp/mode" && method === "GET") {
    return { otpMode: "demo" as const };
  }

  // 1. Minta Kode OTP
  if (path === "/auth/otp/request" && method === "POST") {
    const parse = requestOtpInputSchema.safeParse(body);
    if (!parse.success) {
      throw new ApiError(parse.error.issues[0]?.message || "Nomor ponsel tidak valid.", 422, "VALIDATION_ERROR");
    }
    const { phone } = parse.data;
    // OPN-001: Simulasi kode OTP standar 1234
    const simulatedCode = "1234";
    db.pendingOtp[phone] = {
      code: simulatedCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    writeDb(db);
    return {
      success: true,
      message: "Kode verifikasi 4-digit berhasil dikirim via simulasi SMS.",
      debugHint: "Gunakan kode: 1234",
    };
  }

  // 2. Verifikasi Kode OTP
  if (path === "/auth/otp/verify" && method === "POST") {
    const parse = verifyOtpInputSchema.safeParse(body);
    if (!parse.success) {
      throw new ApiError("Kode verifikasi harus 4 digit angka.", 422, "VALIDATION_ERROR");
    }
    const { phone, otpCode } = parse.data;
    const pending = db.pendingOtp[phone];

    // Cek kode (kode standar "1234" selalu diterima di simulasi demo)
    if (otpCode !== "1234" && (!pending || pending.code !== otpCode)) {
      throw new ApiError("Kode verifikasi salah atau sudah kedaluwarsa. Gunakan kode 1234.", 401, "INVALID_OTP");
    }

    // Bersihkan OTP pending
    delete db.pendingOtp[phone];

    // Cek apakah nomor sudah terdaftar
    const existingUser = db.users.find((u) => u.phone === phone);
    if (existingUser) {
      db.currentSession = existingUser;
      writeDb(db);
      return {
        success: true,
        isNewUser: false,
        user: existingUser,
      };
    }

    // Nomor baru, perlu melengkapi profil di /daftar
    writeDb(db);
    return {
      success: true,
      isNewUser: true,
      phone,
    };
  }

  // 3. Pendaftaran Profil Akun Baru
  if (path === "/auth/register" && method === "POST") {
    const parse = registerProfileInputSchema.safeParse(body);
    if (!parse.success) {
      throw new ApiError(parse.error.issues[0]?.message || "Data pendaftaran belum lengkap.", 422, "VALIDATION_ERROR");
    }
    const input = parse.data;
    const newUser: UserProfile = {
      id: "usr-" + crypto.randomUUID().slice(0, 8),
      role: input.role,
      name: input.name,
      phone: input.phone,
      province: input.province,
      regency: input.regency,
      district: input.district,
      businessName: input.businessName,
      status: "active",
    };

    db.users.push(newUser);
    db.currentSession = newUser;
    writeDb(db);

    return {
      success: true,
      user: newUser,
    };
  }

  // 4. Masuk Khusus Admin (Email + Sandi)
  if (path === "/admin/auth/login" && method === "POST") {
    const parse = adminLoginInputSchema.safeParse(body);
    if (!parse.success) {
      throw new ApiError(parse.error.issues[0]?.message || "Kredensial tidak valid.", 422, "VALIDATION_ERROR");
    }
    const { email, password } = parse.data;

    // Kredensial default admin
    if (email === "admin@sambung.id" && password === "admin123") {
      const adminUser = db.users.find((u) => u.role === "admin") || {
        id: "usr-admin-01",
        role: "admin",
        name: "Pengelola Pusat SAMBUNG",
        phone: "081122334455",
        email: "admin@sambung.id",
        province: "DKI Jakarta",
        regency: "Jakarta Pusat",
        district: "Gambir",
        status: "active",
      };
      db.currentSession = adminUser;
      writeDb(db);
      return {
        success: true,
        user: adminUser,
      };
    }

    throw new ApiError("Email atau kata sandi pengelola salah.", 401, "INVALID_CREDENTIALS");
  }

  // 5. Cek Sesi Aktif (/auth/me)
  if (path === "/auth/me" && method === "GET") {
    return {
      user: db.currentSession,
    };
  }

  // 6. Keluar / Logout
  if (path === "/auth/logout" && method === "POST") {
    db.currentSession = null;
    writeDb(db);
    return {
      success: true,
      message: "Sesi telah berakhir.",
    };
  }

  throw new ApiError(`Endpoint auth '${path}' tidak ditemukan.`, 404, "NOT_FOUND");
}
