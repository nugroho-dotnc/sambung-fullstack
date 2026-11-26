"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "./use-auth";
import { resolvePostAuthPath } from "../domain/role-routes";

/**
 * Redirects authenticated users away from auth screens back to their workspace.
 */
export function useRedirectAuthenticatedUser(requestedRedirect?: string | null) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(resolvePostAuthPath(user.role, requestedRedirect));
    }
  }, [isLoading, user, requestedRedirect, router]);

  return {
    user: user ?? null,
    isLoading,
    isRedirecting: Boolean(user),
  };
}
