"use client";

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AsyncBoundaryProps {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  emptyFallback?: ReactNode;
  children: ReactNode;
}

export function AsyncBoundary({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyFallback,
  children,
}: AsyncBoundaryProps) {
  // Keadaan K1: Sedang Memuat (Skeleton)
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <div className="space-y-4 py-8">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // Keadaan K3: Gagal / Error dengan opsi coba lagi
  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4 my-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Gagal Memuat Informasi</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error?.message || "Terjadi kendala saat menghubungkan ke layanan. Silakan coba lagi."}
          </p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="min-h-11 px-5 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Muat Ulang
          </Button>
        )}
      </div>
    );
  }

  // Keadaan K2: Kosong (Empty State)
  if (isEmpty) {
    if (emptyFallback) return <>{emptyFallback}</>;
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-3 my-4">
        <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Belum Ada Data</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Belum ada informasi yang dapat ditampilkan pada bagian ini.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
