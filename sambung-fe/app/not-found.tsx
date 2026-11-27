"use client";

import { ButtonLink } from "@/components/ui/button";
import { Sprout, Home, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-xs">
        <Sprout className="w-8 h-8" />
      </div>

      <span className="tabular-nums text-sm font-bold tracking-widest text-primary uppercase mb-2">
        Error 404
      </span>

      <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
        Halaman Tidak Ditemukan
      </h1>

      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        Halaman atau rute pasar yang Anda tuju tidak tersedia, telah dipindahkan, atau
        tautan yang Anda gunakan keliru.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink
          size="default"
          className="gap-2 text-xs font-bold cursor-pointer"
          href="/"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </ButtonLink>

        <ButtonLink
          variant="outline"
          size="default"
          className="gap-2 text-xs font-semibold cursor-pointer"
          href="/bantuan"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Pusat Bantuan & Glosarium</span>
        </ButtonLink>
      </div>
    </div>
  );
}
