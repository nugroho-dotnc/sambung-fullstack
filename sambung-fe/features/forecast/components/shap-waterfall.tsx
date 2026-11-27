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
  userRole,
}: {
  factors: ShapFactor[];
  userRole?: "petani" | "pembeli" | "admin";
}) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground leading-relaxed">
        Rincian faktor pendorong tidak ditampilkan untuk wilayah yang sedang menggunakan acuan harga pekan terakhir.
      </div>
    );
  }

  if (userRole === "admin") {
    return (
      <div className="rounded-lg divide-y divide-border overflow-hidden">
        {factors.map((factor, idx) => {
          const Icon = CATEGORY_ICONS[factor.category] || Sprout;
          const label = CATEGORY_LABELS[factor.category] || factor.category;
          const isPushUp = factor.impact > 0;
          const isNeutral = factor.impact === 0;

          return (
            <div
              key={idx}
              className="admin-field-row p-4 sm:p-5 bg-card space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-muted text-[var(--admin-gold-text)] shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-bold text-foreground leading-snug">
                      {factor.feature.replace(/\s*\(ERA5\/.*?\)/i, "")}
                    </h4>
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block mt-0.5">
                      {label}
                    </span>
                  </div>
                </div>

                <div
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md whitespace-nowrap tabular-nums inline-flex items-center gap-1 shrink-0 ${
                    isPushUp
                      ? "status-success"
                      : isNeutral
                        ? "bg-muted text-foreground"
                        : "status-warning"
                  }`}
                >
                  {isPushUp ? (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>+Rp{factor.impact}/kg</span>
                    </>
                  ) : isNeutral ? (
                    <>
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Stabil (Rp0/kg)</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>-Rp{Math.abs(factor.impact)}/kg</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                {factor.description}
              </p>
            </div>
          );
        })}
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
                      ? "bg-primary/15 text-primary"
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
                    ? "bg-primary/10 text-primary border-primary/25"
                    : isNeutral
                      ? "bg-muted text-muted-foreground border-border/80"
                      : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                {isPushUp ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-primary" />
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
