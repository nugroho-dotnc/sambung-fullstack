"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import TopBar from "./TopBar";
import AppSidebar from "./Sidebar";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
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
      router.push(`/masuk?redirect=${encodeURIComponent(pathname)}`);
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
                  onClick={() => router.push(user.role === "petani" ? "/petani" : user.role === "pembeli" ? "/pembeli" : "/admin")}
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

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row">
        <AppSidebar role={user.role} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 min-w-0 bg-slate-50/70 dark:bg-[#070D09] transition-colors">
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
