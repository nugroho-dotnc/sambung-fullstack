"use client";

import { useId, type ChangeEvent } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluatePriceLight } from "../domain/evaluate-price-light";

interface PriceRangeSliderProps {
  value: number;
  min?: number;
  max?: number;
  lowerBound: number;
  upperBound: number;
  toleranceDelta?: number;
  onChange: (value: number) => void;
  label?: string;
  description?: string;
  unitLabel?: string;
  showDirectInput?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PriceRangeSlider({
  value,
  min = 5000,
  max = 10000,
  lowerBound,
  upperBound,
  toleranceDelta = 0.03,
  onChange,
  label = "Harga Gabah per Kilogram",
  description = "Sesuaikan nominal harga atau gunakan geseran untuk melihat posisi harga terhadap acuan pasar.",
  unitLabel = "Rp/kg",
  showDirectInput = true,
  disabled = false,
  className,
}: PriceRangeSliderProps) {
  const id = useId();
  const evaluation = evaluatePriceLight({
    price: value,
    lowerBound,
    upperBound,
    toleranceDelta,
  });

  const clampedValue = Math.min(max, Math.max(min, value || min));

  // Percentage position calculator (clamped 0 - 100%)
  const calcPercent = (val: number) => {
    if (max <= min) return 0;
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  };

  const currentPercent = calcPercent(clampedValue);
  const redEndPercent = calcPercent(evaluation.redThreshold);
  const lowerBoundPercent = calcPercent(lowerBound);
  const upperBoundPercent = calcPercent(upperBound);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/\D/g, "");
    const parsed = Number(raw);
    onChange(Number.isFinite(parsed) ? parsed : 0);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 transition-shadow",
        evaluation.isRedAlert && "border-red-500/50 dark:border-red-500/30",
        className
      )}
    >
      {/* Header & Direct Input Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <label htmlFor={id} className="text-sm font-semibold text-foreground">
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {showDirectInput && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                disabled={disabled}
                value={value ? value.toLocaleString("id-ID") : ""}
                onChange={handleInputChange}
                placeholder="0"
                aria-label="Ketik langsung nominal harga per kg"
                className="w-36 h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-right text-base font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              / kg
            </span>
          </div>
        )}
      </div>

      {/* 4-Zone Spectrum Slider Track */}
      <div className="relative pt-2 pb-1 px-1">
        <div className="price-slider-track h-3 rounded-full overflow-hidden relative bg-muted" aria-hidden="true">
          {/* Zona 1: Merah (Di bawah toleransi) */}
          <span
            className="price-slider-zone bg-red-500 dark:bg-red-600"
            style={{ left: "0%", width: `${redEndPercent}%` }}
            title="Zona Merah: Jauh di bawah batas toleransi"
          />
          {/* Zona 2: Kuning Bawah (Antara toleransi & batas bawah) */}
          <span
            className="price-slider-zone bg-amber-400 dark:bg-amber-500"
            style={{
              left: `${redEndPercent}%`,
              width: `${Math.max(0, lowerBoundPercent - redEndPercent)}%`,
            }}
            title="Zona Kuning Bawah: Di bawah rentang normal"
          />
          {/* Zona 3: Hijau (Rentang Wajar Normal) */}
          <span
            className="price-slider-zone bg-emerald-500 dark:bg-emerald-400"
            style={{
              left: `${lowerBoundPercent}%`,
              width: `${Math.max(0, upperBoundPercent - lowerBoundPercent)}%`,
            }}
            title="Zona Hijau: Rentang harga wajar"
          />
          {/* Zona 4: Kuning Atas (Di atas batas atas) */}
          <span
            className="price-slider-zone bg-amber-400 dark:bg-amber-500"
            style={{
              left: `${upperBoundPercent}%`,
              width: `${Math.max(0, 100 - upperBoundPercent)}%`,
            }}
            title="Zona Kuning Atas: Di atas rentang normal"
          />
        </div>

        {/* Real Interactive Range Input */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={50}
          value={clampedValue}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={clampedValue}
          aria-valuetext={`Rp${clampedValue.toLocaleString("id-ID")} per kilogram, status: ${evaluation.label}`}
          className="price-slider-input w-full cursor-pointer appearance-none bg-transparent relative z-10"
        />

        {/* Visual Boundary Markers */}
        <span
          className="price-slider-marker w-0.5 h-4.5 bg-foreground/70 rounded-full"
          style={{ left: `${lowerBoundPercent}%` }}
          aria-hidden="true"
          title={`Batas Bawah Acuan: Rp${lowerBound.toLocaleString("id-ID")}`}
        />
        <span
          className="price-slider-marker w-0.5 h-4.5 bg-foreground/70 rounded-full"
          style={{ left: `${upperBoundPercent}%` }}
          aria-hidden="true"
          title={`Batas Atas Acuan: Rp${upperBound.toLocaleString("id-ID")}`}
        />
      </div>

      {/* Marker Subtitles / Bounds */}
      <div className="grid grid-cols-3 items-start text-xs tabular-nums text-muted-foreground pt-1">
        <span>Rp{min.toLocaleString("id-ID")}</span>
        <div className="text-center font-sans">
          <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground block">
            Acuan Rentang Wajar
          </span>
          <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
            Rp{lowerBound.toLocaleString("id-ID")} – Rp{upperBound.toLocaleString("id-ID")}
          </span>
        </div>
        <span className="text-right">Rp{max.toLocaleString("id-ID")}</span>
      </div>

      {/* Live Status Pill & Copywriting Note */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl p-3.5 text-xs border transition-colors",
          evaluation.status === "HIJAU" &&
            "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200",
          (evaluation.status === "KUNING_BAWAH" || evaluation.status === "KUNING_ATAS") &&
            "bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200",
          evaluation.status === "MERAH" &&
            "bg-red-50/90 border-red-300 text-red-950 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200",
          evaluation.status === "TIDAK_TERSEDIA" &&
            "bg-muted/70 border-border text-muted-foreground"
        )}
      >
        <div className="mt-0.5 shrink-0">
          {evaluation.status === "HIJAU" && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          {(evaluation.status === "KUNING_BAWAH" || evaluation.status === "KUNING_ATAS") && (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
          {evaluation.status === "MERAH" && (
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          {evaluation.status === "TIDAK_TERSEDIA" && (
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-xs leading-none">
            {evaluation.label}
          </p>
          <p className="text-xs opacity-90 leading-relaxed font-normal">
            {evaluation.description}
          </p>
        </div>
      </div>
    </div>
  );
}
