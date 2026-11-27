"use client";

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, Inbox, Loader2, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";

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
    if (error instanceof ApiError && error.code === "AI_SERVICE_STARTING") {
      return (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg status-warning p-6 sm:p-8 text-center space-y-4 my-4"
        >
          <div className="w-11 h-11 rounded-lg bg-white/10 text-[#FFE4D2] flex items-center justify-center mx-auto">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[#FFE4D2]">
              Layanan AI Sedang Menyiapkan Model
            </h3>
            <p className="text-xs sm:text-sm text-[#FFE4D2]/90 max-w-md mx-auto leading-relaxed">
              Server kecerdasan buatan sedang menyala setelah tidak aktif (<em>cold start</em>, biasanya membutuhkan waktu sekitar 1–3 menit). Silakan tunggu sebentar lalu muat ulang.
            </p>
          </div>
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="min-h-10 px-5 rounded-lg bg-[#FFE4D2] text-[#3D1C11] hover:bg-white font-semibold border-transparent cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Coba Muat Ulang
            </Button>
          )}
        </div>
      );
    }

    if (
      error instanceof ApiError &&
      (error.code === "AI_SERVICE_UNAVAILABLE" ||
        error.code === "AI_NOT_CONFIGURED" ||
        error.code === "AI_AUTH_ERROR")
    ) {
      return (
        <div
          role="alert"
          className="rounded-lg status-error p-6 sm:p-8 text-center space-y-4 my-4"
        >
          <div className="w-11 h-11 rounded-lg bg-white/10 text-[#F5E5E5] flex items-center justify-center mx-auto">
            <ServerOff className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[#F5E5E5]">
              Layanan AI Belum Tersedia
            </h3>
            <p className="text-xs sm:text-sm text-[#F5E5E5]/90 max-w-md mx-auto leading-relaxed">
              {error.message || "Layanan analitik AI sementara tidak dapat dijangkau. Silakan coba kembali beberapa saat lagi."}
            </p>
          </div>
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="min-h-10 px-5 rounded-lg bg-[#F5E5E5] text-[#4A1010] hover:bg-white font-semibold border-transparent cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Coba Muat Ulang
            </Button>
          )}
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="rounded-lg status-error p-6 text-center space-y-4 my-4"
      >
        <div className="w-11 h-11 rounded-lg bg-white/10 text-[#F5E5E5] flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#F5E5E5]">Gagal Memuat Informasi</h3>
          <p className="text-sm text-[#F5E5E5]/90 max-w-md mx-auto">
            {error?.message || "Terjadi kendala saat menghubungkan ke layanan. Silakan coba lagi."}
          </p>
        </div>
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            className="min-h-10 px-5 rounded-lg bg-[#F5E5E5] text-[#4A1010] hover:bg-white font-semibold border-transparent cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
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
      <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3 my-4">
        <div className="w-11 h-11 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
          <Inbox className="w-5 h-5" aria-hidden="true" />
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
