"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForecastMeta } from "@/features/forecast/hooks/use-forecast";
import { useAdminLivePredict } from "@/features/admin/hooks/use-admin";
import type { AdminLivePredictOverrides } from "@/features/admin/domain/admin-types";
import { ShapWaterfall } from "@/features/forecast/components/shap-waterfall";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { ApiError } from "@/lib/api/errors";
import {
  AlertCircle,
  FlaskConical,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface OverrideDraft {
  currentPrice: string;
  precip28d: string;
  stickyWeeks: string;
  shockGrosirPct: string;
  shockTradPct: string;
  shockPeerPct: string;
  shockBwh1Pct: string;
}

const EMPTY_OVERRIDES: OverrideDraft = {
  currentPrice: "",
  precip28d: "",
  stickyWeeks: "",
  shockGrosirPct: "",
  shockTradPct: "",
  shockPeerPct: "",
  shockBwh1Pct: "",
};

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
}

export function WhatIfSimulator() {
  const metaQuery = useForecastMeta();
  const predictMutation = useAdminLivePredict();

  const provinces = useMemo(
    () => metaQuery.data?.allProvinces ?? ["Jawa Timur", "Jawa Tengah", "Jawa Barat"],
    [metaQuery.data?.allProvinces],
  );

  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: p, label: p })),
    [provinces],
  );

  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [horizonWeeks, setHorizonWeeks] = useState<2 | 4>(2);
  const [weekStart, setWeekStart] = useState<string>("");
  const [forceAi, setForceAi] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<OverrideDraft>(EMPTY_OVERRIDES);
  const [validationError, setValidationError] = useState<string | null>(null);

  const province =
    selectedProvince ??
    (provinces.includes("Jawa Timur") ? "Jawa Timur" : provinces[0] || "Jawa Timur");

  function updateOverride(field: keyof OverrideDraft, value: string) {
    setOverrides((prev) => ({ ...prev, [field]: value }));
  }

  function handleResetOverrides() {
    setOverrides(EMPTY_OVERRIDES);
    setWeekStart("");
    setForceAi(false);
    setValidationError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!province || province.trim().length < 2) {
      setValidationError("Pilih provinsi terlebih dahulu.");
      return;
    }

    const builtOverrides: AdminLivePredictOverrides = {};

    const currentPrice = parseOptionalNumber(overrides.currentPrice);
    if (currentPrice !== undefined) {
      if (Number.isNaN(currentPrice) || currentPrice < 8000 || currentPrice > 35000) {
        setValidationError("Override harga beras saat ini harus antara Rp8.000 – Rp35.000/kg.");
        return;
      }
      builtOverrides.currentPrice = currentPrice;
    }

    const precip28d = parseOptionalNumber(overrides.precip28d);
    if (precip28d !== undefined) {
      if (Number.isNaN(precip28d) || precip28d < 0 || precip28d > 1500) {
        setValidationError("Curah hujan 28 hari harus berada di antara 0 – 1.500 mm.");
        return;
      }
      builtOverrides.precip28d = precip28d;
    }

    const stickyWeeks = parseOptionalNumber(overrides.stickyWeeks);
    if (stickyWeeks !== undefined) {
      if (Number.isNaN(stickyWeeks) || stickyWeeks < 0 || stickyWeeks > 64) {
        setValidationError("Durasi harga mendatar (stickyWeeks) harus antara 0 – 64 pekan.");
        return;
      }
      builtOverrides.stickyWeeks = stickyWeeks;
    }

    const shockFields: Array<[keyof OverrideDraft, keyof AdminLivePredictOverrides, string]> = [
      ["shockGrosirPct", "shockGrosirPct", "Shock Pasar Grosir (%)"],
      ["shockTradPct", "shockTradPct", "Shock Pasar Tradisional (%)"],
      ["shockPeerPct", "shockPeerPct", "Shock Sentra Tetangga (%)"],
      ["shockBwh1Pct", "shockBwh1Pct", "Shock Beras Bawah I (%)"],
    ];

    for (const [draftKey, apiKey, label] of shockFields) {
      const pct = parseOptionalNumber(overrides[draftKey]);
      if (pct !== undefined) {
        if (Number.isNaN(pct) || pct < -40 || pct > 60) {
          setValidationError(`${label} harus berada di rentang -40% hingga +60%.`);
          return;
        }
        builtOverrides[apiKey] = Number((pct / 100).toFixed(4));
      }
    }

    try {
      await predictMutation.mutateAsync({
        province,
        horizonWeeks,
        weekStart: weekStart.trim() || undefined,
        overrides: Object.keys(builtOverrides).length > 0 ? builtOverrides : undefined,
        forceAi: forceAi || undefined,
      });
    } catch {
      // Error surfaced cleanly via predictMutation.error
    }
  }

  const apiError = predictMutation.error;
  const errorMessage = useMemo(() => {
    if (!apiError) return null;
    if (apiError instanceof ApiError && apiError.code === "AI_RATE_LIMITED") {
      return apiError.retryAfterSeconds
        ? `Kuota simulasi cepat tercapai. Silakan tunggu sekitar ${apiError.retryAfterSeconds} detik sebelum mencoba kembali.`
        : apiError.message;
    }
    return apiError instanceof Error
      ? apiError.message
      : "Gagal menjalankan simulasi What-If AI.";
  }, [apiError]);

  const result = predictMutation.data;

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Simulasi Stateless (Tanpa Mengubah Database)
              </span>
              <Badge variant="outline" className="text-[11px] font-semibold">
                Mode Eksperimen Pengawas
              </Badge>
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mt-1">
              Simulasi Skenario Perubahan Harga &amp; Cuaca (*What-If*)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Uji sensitivitas prakiraan AI terhadap perubahan harga acuan, curah hujan, durasi harga datar, maupun guncangan pasar (*shock*) tanpa memengaruhi data aktif pengguna.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetOverrides}
            className="gap-1.5 text-xs self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Input
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Core Target Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Provinsi Produsen
              </label>
              <Select
                items={provinceOptions}
                value={province}
                onValueChange={(val) => {
                  if (val) setSelectedProvince(val);
                }}
              >
                <SelectTrigger className="w-full h-10 rounded-lg bg-background text-xs font-semibold">
                  <SelectValue placeholder="Pilih provinsi" />
                </SelectTrigger>
                <SelectContent>
                  {provinceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Horizon Prakiraan
              </label>
              <div className="grid grid-cols-2 gap-2 h-10 p-1 rounded-lg bg-muted/60 border border-border/70">
                <Button
                  type="button"
                  size="sm"
                  variant={horizonWeeks === 2 ? "default" : "ghost"}
                  onClick={() => setHorizonWeeks(2)}
                  className="h-full text-xs font-semibold cursor-pointer"
                >
                  2 Pekan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={horizonWeeks === 4 ? "default" : "ghost"}
                  onClick={() => setHorizonWeeks(4)}
                  className="h-full text-xs font-semibold cursor-pointer"
                >
                  4 Pekan
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="whatif-week" className="text-xs font-semibold text-foreground block">
                Tanggal Patokan Pekan (Opsional)
              </label>
              <Input
                id="whatif-week"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          {/* Numeric Override Inputs */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Parameter Override Opsional (Kosongkan Untuk Nilai Default Aktual)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Harga Beras Saat Ini (Rp/kg)
                </label>
                <Input
                  type="number"
                  min={8000}
                  max={35000}
                  step={50}
                  placeholder="8000 – 35000"
                  value={overrides.currentPrice}
                  onChange={(e) => updateOverride("currentPrice", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Curah Hujan 28 Hari (mm)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={1500}
                  step={1}
                  placeholder="0 – 1500"
                  value={overrides.precip28d}
                  onChange={(e) => updateOverride("precip28d", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Durasi Harga Datar (Pekan)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={64}
                  step={1}
                  placeholder="0 – 64"
                  value={overrides.stickyWeeks}
                  onChange={(e) => updateOverride("stickyWeeks", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Shock Pasar Grosir (%)
                </label>
                <Input
                  type="number"
                  min={-40}
                  max={60}
                  step={1}
                  placeholder="-40 s/d +60"
                  value={overrides.shockGrosirPct}
                  onChange={(e) => updateOverride("shockGrosirPct", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Shock Pasar Tradisional (%)
                </label>
                <Input
                  type="number"
                  min={-40}
                  max={60}
                  step={1}
                  placeholder="-40 s/d +60"
                  value={overrides.shockTradPct}
                  onChange={(e) => updateOverride("shockTradPct", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Shock Sentra Tetangga (%)
                </label>
                <Input
                  type="number"
                  min={-40}
                  max={60}
                  step={1}
                  placeholder="-40 s/d +60"
                  value={overrides.shockPeerPct}
                  onChange={(e) => updateOverride("shockPeerPct", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Shock Beras Bawah I (%)
                </label>
                <Input
                  type="number"
                  min={-40}
                  max={60}
                  step={1}
                  placeholder="-40 s/d +60"
                  value={overrides.shockBwh1Pct}
                  onChange={(e) => updateOverride("shockBwh1Pct", e.target.value)}
                  className="text-xs tabular-nums"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <Checkbox
                    checked={forceAi}
                    onCheckedChange={(checked) => setForceAi(Boolean(checked))}
                  />
                  <span>Paksa Mode AI (forceAi)</span>
                </label>
              </div>
            </div>
          </div>

          {(validationError || errorMessage) && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError || errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={predictMutation.isPending}
              className="gap-2 text-xs font-bold px-5 cursor-pointer"
            >
              {predictMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghitung Simulasi AI...</span>
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" />
                  <span>Jalankan Simulasi Live</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Simulated Forecast Output + Live Diagnostics */}
          <Card className="lg:col-span-6 p-6 rounded-2xl border border-border/80 bg-card space-y-5">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Hasil Simulasi {result.province} ({result.horizonWeeks} Pekan)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Patokan: {result.referenceDate || result.referenceDateIso || "-"} → Target:{" "}
                  {result.targetDate}
                </p>
              </div>
              <Badge variant={result.isFallback ? "secondary" : "default"} className="text-[11px]">
                {result.method}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Proyeksi Beras Produsen
                </span>
                <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                  {formatRupiah(result.riceProducerPrice)}
                  <span className="text-xs font-normal text-muted-foreground">/kg</span>
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  Pita 80%: {formatRupiah(result.confidenceInterval80[0])} –{" "}
                  {formatRupiah(result.confidenceInterval80[1])}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Estimasi Turunan Gabah
                </span>
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-muted-foreground">GKP:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(result.gkpEstimate)}/kg
                  </strong>
                </div>
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-muted-foreground">GKG:</span>
                  <strong className="text-foreground">
                    {formatRupiah(result.gkgEstimate)}/kg
                  </strong>
                </div>
              </div>
            </div>

            {/* Live Diagnostics */}
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Diagnostik Inferensi Live (Stateless)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Peluang Naik</span>
                  <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">
                    {(result.liveDiagnostics.probUp * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Peluang Datar</span>
                  <strong className="tabular-nums text-foreground">
                    {(result.liveDiagnostics.probFlat * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Peluang Turun</span>
                  <strong className="tabular-nums text-amber-700 dark:text-amber-400">
                    {(result.liveDiagnostics.probDown * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Status Gerbang</span>
                  <strong className="text-foreground">
                    {result.liveDiagnostics.gateTriggered ? "Terpicu (Bergerak)" : "Menahan (Stabil)"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Kelompok Wilayah</span>
                  <strong className="text-foreground">
                    {result.liveDiagnostics.provinceGroup || "-"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] text-muted-foreground block">Ambang Tau</span>
                  <strong className="tabular-nums text-foreground">
                    {result.liveDiagnostics.thresholdTau ?? "-"}
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Right: SHAP Contributions */}
          <Card className="lg:col-span-6 p-6 rounded-2xl border border-border/80 bg-card space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground">
                Faktor Penggerak Simulasi
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dampak setiap variabel skenario terhadap proyeksi harga produsen.
              </p>
            </div>
            <ShapWaterfall factors={result.shapContributions} userRole="admin" />
          </Card>
        </div>
      )}
    </div>
  );
}
