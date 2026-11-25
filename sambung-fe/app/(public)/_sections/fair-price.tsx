"use client";

import { Badge } from "@/components/ui/badge";
import { FairPriceSimulator } from "@/features/fair-price/components/fair-price-simulator";

export default function FairPriceSection() {
  return (
    <section id="harga-wajar" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 scroll-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Kalkulator Transparan
            </span>
            <Badge variant="outline" className="text-xs font-bold">
              Acuan Harga Wajar
            </Badge>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Simulasi Hitung Batas Bawah & Batas Atas Gabah
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Eksplorasi batas kewajaran harga jual gabah berdasarkan rendemen konversi giling dan kadar air panen.
          </p>
        </div>
      </div>

      <FairPriceSimulator />
    </section>
  );
}
