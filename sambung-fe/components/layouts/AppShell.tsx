"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import TopBar from "./TopBar";
import AppSidebar from "./Sidebar";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { getDashboardRoute } from "@/features/auth/domain/role-routes";
import { Skeleton } from "@/components/ui/skeleton";

interface AppShellProps {
  children: ReactNode;
  allowedRoles?: Array<"petani" | "pembeli" | "admin">;
}

function AppShellSkeleton() {
  return (
    <div className="min-h-screen w-full bg-background flex">
      <div className="w-64 border-r border-border/80 p-4 space-y-4 hidden lg:block">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <div className="space-y-2 pt-6">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-border/80 px-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="p-8 space-y-6 max-w-6xl w-full mx-auto">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function AppShellInner({ children, allowedRoles }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !user) {
      const loginPath = pathname.startsWith("/admin") ? "/admin/masuk" : "/masuk";
      router.push(`${loginPath}?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Role Access Guard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <SidebarProvider>
        <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row">
          <AppSidebar role={user.role} />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-6 sm:p-8 flex items-center justify-center">
              <div className="max-w-md w-full rounded-2xl border border-border/80 bg-card p-6 text-center space-y-4 shadow-sm">
                <h2 className="text-lg font-bold text-foreground">Akses Ruang Terbatas</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Akun Anda terdaftar sebagai <strong className="capitalize text-foreground">{user.role}</strong> dan tidak memiliki wewenang untuk membuka ruang kerja ini.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(getDashboardRoute(user.role))}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-colors cursor-pointer"
                >
                  Kembali ke Ruang Anda
                </button>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <SidebarProvider>
      <div
        className={`min-h-screen w-full bg-background flex flex-col lg:flex-row print:block print:bg-white ${
          isAdmin ? "admin-panel" : ""
        }`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-[#0D5907] focus:text-white focus:text-xs focus:font-semibold"
        >
          Lewati ke konten utama
        </a>
        <div className="print:hidden">
          <AppSidebar role={user.role} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 print:block">
          <div className="print:hidden">
            <TopBar />
          </div>
          <main
            id="main-content"
            tabIndex={-1}
            className={`flex-1 min-w-0 transition-colors focus:outline-none print:bg-white print:p-0 print:m-0 ${
              isAdmin
                ? "bg-[var(--admin-canvas)]"
                : "bg-slate-50/70 dark:bg-[#070D09]"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppShellInner {...props} />
    </Suspense>
  );
}
