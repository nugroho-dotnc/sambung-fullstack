"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>

      <span className="tabular-nums text-sm font-bold tracking-widest text-destructive uppercase mb-2">
        Kendala Aplikasi
      </span>

      <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
        Terjadi Gangguan Sementara
      </h1>

      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        Sistem mengalami kendala saat memproses tampilan ini. Anda dapat mencoba
        memuat ulang antarmuka atau kembali ke halaman utama.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="default"
          onClick={() => reset()}
          className="gap-2 text-xs font-bold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Coba Muat Ulang</span>
        </Button>

        <Button
          variant="outline"
          size="default"
          className="gap-2 text-xs font-semibold cursor-pointer"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Button>
      </div>
    </div>
  );
}
