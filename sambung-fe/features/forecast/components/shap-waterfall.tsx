"use client";

import { CloudRain, Sprout, Landmark, Compass, TrendingUp } from "lucide-react";
import type { ShapFactor, ShapCategory } from "../domain/forecast-data";

const CATEGORY_ICONS: Record<ShapCategory, typeof Sprout> = {
  cuaca: CloudRain,
  pasokan: Sprout,
  kebijakan: Landmark,
  sentra: Compass,
  harga_lokal: TrendingUp,
};

const CATEGORY_LABELS: Record<ShapCategory, string> = {
  cuaca: "Cuaca & Iklim",
  pasokan: "Panen & Pasokan",
  kebijakan: "HPP & Musiman",
  sentra: "Sentra Produsen",
  harga_lokal: "Dinamika Pasar",
};

export function ShapWaterfall({ factors }: { factors: ShapFactor[] }) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/30 text-xs text-muted-foreground leading-relaxed">
        Rincian faktor pendorong tidak ditampilkan untuk wilayah yang sedang menggunakan acuan harga pekan terakhir.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {factors.map((factor, idx) => {
        const Icon = CATEGORY_ICONS[factor.category] || Sprout;
        const label = CATEGORY_LABELS[factor.category] || factor.category;
        const isPushUp = factor.impact > 0;

        return (
          <div
            key={idx}
            className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-2xs hover:border-foreground/20 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isPushUp
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {factor.feature}
                  </h4>
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    Kategori: {label}
                  </span>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap tabular-nums ${
                  isPushUp
                    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                }`}
              >
                {isPushUp ? `+Rp${factor.impact}` : `-Rp${Math.abs(factor.impact)}`} / kg
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
              {factor.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
