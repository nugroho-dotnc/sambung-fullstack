import { apiClient } from "@/lib/api/client";
import type {
  RegisterProfileInput,
  AdminLoginInput,
  UserProfile,
} from "../schemas";

export const authService = {
  async getOtpMode(): Promise<{ otpMode: "demo" | "live" }> {
    try {
      const res = (await apiClient("/auth/otp/mode", { method: "GET" })) as {
        otpMode: "demo" | "live";
      };
      return res;
    } catch {
      return {
        otpMode: (process.env.NEXT_PUBLIC_OTP_MODE as "demo" | "live") || "demo",
      };
    }
  },

  async requestOtp(
    phone: string
  ): Promise<{ success: boolean; message: string; otpMode?: "demo" | "live"; debugHint?: string }> {
    const res = await apiClient("/auth/otp/request", {
      method: "POST",
      json: { phone },
    });
    return res as { success: boolean; message: string; otpMode?: "demo" | "live"; debugHint?: string };
  },

  async verifyOtp(
    phone: string,
    otpCode: string
  ): Promise<{ success: boolean; isNewUser: boolean; user?: UserProfile; phone?: string }> {
    const res = await apiClient("/auth/otp/verify", {
      method: "POST",
      json: { phone, otpCode },
    });
    return res as { success: boolean; isNewUser: boolean; user?: UserProfile; phone?: string };
  },

  async registerProfile(
    input: RegisterProfileInput
  ): Promise<{ success: boolean; user: UserProfile }> {
    const res = await apiClient("/auth/register", {
      method: "POST",
      json: input,
    });
    return res as { success: boolean; user: UserProfile };
  },

  async adminLogin(
    credentials: AdminLoginInput
  ): Promise<{ success: boolean; user: UserProfile }> {
    const res = await apiClient("/admin/auth/login", {
      method: "POST",
      json: credentials,
    });
    return res as { success: boolean; user: UserProfile };
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const res = (await apiClient("/auth/me", { method: "GET" })) as {
        user: UserProfile | null;
      };
      return res.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await apiClient("/auth/logout", {
      method: "POST",
    });
    return res as { success: boolean };
  },
};
