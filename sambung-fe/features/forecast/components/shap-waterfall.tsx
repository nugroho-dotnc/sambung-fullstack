"use client";

import {
  CloudRain,
  Sprout,
  Landmark,
  Compass,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
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

export function ShapWaterfall({
  factors,
}: {
  factors: ShapFactor[];
  userRole?: "petani" | "pembeli" | "admin";
}) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/30 text-xs text-muted-foreground leading-relaxed">
        Rincian faktor pendorong tidak ditampilkan untuk wilayah yang sedang menggunakan acuan harga pekan terakhir.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {factors.map((factor, idx) => {
        const Icon = CATEGORY_ICONS[factor.category] || Sprout;
        const label = CATEGORY_LABELS[factor.category] || factor.category;
        const isPushUp = factor.impact > 0;
        const isNeutral = factor.impact === 0;

        return (
          <div
            key={idx}
            className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isPushUp
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : isNeutral
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground leading-snug">
                    {factor.feature.replace(/\s*\(ERA5\/.*?\)/i, "")}
                  </h4>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block mt-0.5">
                    {label}
                  </span>
                </div>
              </div>

              <div
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap tabular-nums flex items-center gap-1 shrink-0 ${
                  isPushUp
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : isNeutral
                      ? "bg-muted text-muted-foreground border-border/80"
                      : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                {isPushUp ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                    <span>+Rp{factor.impact}/kg</span>
                  </>
                ) : isNeutral ? (
                  <>
                    <Minus className="w-3 h-3 text-muted-foreground" />
                    <span>Stabil (Rp0/kg)</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3 text-amber-600" />
                    <span>-Rp{Math.abs(factor.impact)}/kg</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">
              {factor.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
