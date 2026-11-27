"use client";

import { useCurrentUser } from "./use-auth";
import { IS_MOCK_DATA } from "@/lib/config/fe-mode";

/**
 * Hook sesi pengguna untuk seluruh aplikasi SAMBUNG.
 * Terintegrasi langsung dengan TanStack Query dan authService.
 */
export function useSession() {
  const { data: user, isLoading } = useCurrentUser();

  return {
    user: user ?? null,
    isPending: isLoading,
    isDemo: IS_MOCK_DATA,
  };
}
