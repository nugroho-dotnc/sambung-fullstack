"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { getDashboardRoute } from "@/features/auth/domain/role-routes";
import type { Role } from "@/features/auth/schemas";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex-1 p-6 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full rounded-2xl border border-border/80 bg-card p-6 text-center space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Akses Ruang Terbatas</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun Anda terdaftar sebagai{" "}
            <strong className="capitalize text-foreground">{user.role}</strong> dan tidak memiliki wewenang untuk membuka ruang kerja ini.
          </p>
          <button
            type="button"
            onClick={() => router.push(getDashboardRoute(user.role))}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-colors cursor-pointer"
          >
            Kembali ke Ruang Anda
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
