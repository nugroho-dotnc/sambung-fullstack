"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "../services/auth.service";
import type { RegisterProfileInput, AdminLoginInput, UserProfile } from "../schemas";

export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "currentUser"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 menit
    retry: false,
  });
}

export function useOtpMode() {
  return useQuery({
    queryKey: ["auth", "otpMode"] as const,
    queryFn: () => authService.getOtpMode(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) => authService.requestOtp(phone),
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phone, otpCode }: { phone: string; otpCode: string }) =>
      authService.verifyOtp(phone, otpCode),
    onSuccess: (data) => {
      if (!data.isNewUser && data.user) {
        queryClient.setQueryData(authKeys.currentUser(), data.user);
      }
    },
  });
}

export function useRegisterProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterProfileInput) => authService.registerProfile(input),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser(), data.user);
    },
  });
}

export function useAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: AdminLoginInput) => authService.adminLogin(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser(), data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem("otp-mode");
          for (const key of Object.keys(window.sessionStorage)) {
            if (key.startsWith("otp-hint:")) {
              window.sessionStorage.removeItem(key);
            }
          }
        } catch {
          // Ignore storage access errors in restricted contexts
        }
      }
      queryClient.setQueryData(authKeys.currentUser(), null);
      queryClient.clear();
      router.push("/");
    },
  });
}
