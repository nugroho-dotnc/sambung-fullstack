"use client";

import { useCurrentUser } from "./use-auth";

/**
 * Hook sesi pengguna untuk seluruh aplikasi SAMBUNG.
 * Terintegrasi langsung dengan TanStack Query dan authService.
 */
export function useSession() {
  const { data: user, isLoading } = useCurrentUser();
  const isDemo = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  return {
    user: user ?? null,
    isPending: isLoading,
    isDemo,
  };
}
