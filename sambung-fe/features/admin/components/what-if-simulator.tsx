"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useForecastMeta } from "@/features/forecast/hooks/use-forecast";
import { useAdminLivePredict } from "@/features/admin/hooks/use-admin";
import type { AdminLivePredictOverrides } from "@/features/admin/domain/admin-types";
import { ShapWaterfall } from "@/features/forecast/components/shap-waterfall";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { ApiError } from "@/lib/api/errors";
import {
  AlertCircle,
  ArrowRight,
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
      <Card className="rounded-2xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-price-caution">
                Simulasi Stateless (Tanpa Mengubah Database)
              </span>
              <Badge
                variant="outline"
                className="rounded-md bg-muted text-foreground border-transparent px-2 py-0.5 text-xs font-semibold"
              >
                Mode Eksperimen Pengawas
              </Badge>
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mt-1.5">
              Simulasi Skenario Perubahan Harga &amp; Cuaca (<em>What-If</em>)
            </h2>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1 leading-relaxed">
              Uji sensitivitas prakiraan AI terhadap perubahan harga acuan, curah hujan, durasi harga datar, maupun guncangan pasar (<em>shock</em>) tanpa memengaruhi data aktif pengguna.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetOverrides}
            className="min-h-9 rounded-lg px-3.5 gap-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Input</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core Target Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="whatif-province"
                className="text-xs font-semibold text-foreground block"
              >
                Provinsi Produsen
              </label>
              <Combobox
                items={provinceOptions}
                value={provinceOptions.find((opt) => opt.value === province) ?? null}
                isItemEqualToValue={(item, val) => item.value === val.value}
                itemToStringLabel={(opt) => opt.label}
                onValueChange={(opt) => {
                  if (opt) setSelectedProvince(opt.value);
                }}
              >
                <ComboboxInput
                  id="whatif-province"
                  placeholder="Pilih atau cari provinsi..."
                  className="w-full h-10 rounded-lg border-input bg-background text-xs font-semibold"
                />
                <ComboboxContent>
                  <ComboboxEmpty>Provinsi tidak ditemukan.</ComboboxEmpty>
                  <ComboboxList>
                    {(opt: { value: string; label: string }) => (
                      <ComboboxItem key={opt.value} value={opt}>
                        {opt.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            <div className="space-y-1.5">
              <span
                id="whatif-horizon-label"
                className="text-xs font-semibold text-foreground block"
              >
                Horizon Prakiraan
              </span>
              <div
                role="group"
                aria-labelledby="whatif-horizon-label"
                className="grid grid-cols-2 gap-1.5 h-10 p-1 rounded-lg bg-muted"
              >
                <Button
                  type="button"
                  variant={horizonWeeks === 2 ? "default" : "outline"}
                  aria-pressed={horizonWeeks === 2}
                  onClick={() => setHorizonWeeks(2)}
                  className="min-h-10 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  2 Pekan
                </Button>
                <Button
                  type="button"
                  variant={horizonWeeks === 4 ? "default" : "outline"}
                  aria-pressed={horizonWeeks === 4}
                  onClick={() => setHorizonWeeks(4)}
                  className="min-h-10 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  4 Pekan
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="whatif-week"
                className="text-xs font-semibold text-foreground block"
              >
                Tanggal Patokan Pekan (Opsional)
              </label>
              <Input
                id="whatif-week"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="min-h-10 rounded-lg text-xs tabular-nums"
              />
            </div>
          </div>

          {/* Numeric Override Inputs (Grouped by Gestalt Proximity) */}
          <div className="space-y-6 pt-5 border-t border-border">
            <div className="space-y-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Kondisi Lokal &amp; Cuaca (Kosongkan untuk Nilai Default Aktual)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-current-price"
                    className="text-xs font-medium text-foreground block"
                  >
                    Harga Beras Saat Ini (Rp/kg)
                  </label>
                  <Input
                    id="whatif-current-price"
                    type="number"
                    min={8000}
                    max={35000}
                    step={50}
                    placeholder="8000 – 35000"
                    value={overrides.currentPrice}
                    onChange={(e) => updateOverride("currentPrice", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-precip-28d"
                    className="text-xs font-medium text-foreground block"
                  >
                    Curah Hujan 28 Hari (mm)
                  </label>
                  <Input
                    id="whatif-precip-28d"
                    type="number"
                    min={0}
                    max={1500}
                    step={1}
                    placeholder="0 – 1500"
                    value={overrides.precip28d}
                    onChange={(e) => updateOverride("precip28d", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-sticky-weeks"
                    className="text-xs font-medium text-foreground block"
                  >
                    Durasi Harga Datar (Pekan)
                  </label>
                  <Input
                    id="whatif-sticky-weeks"
                    type="number"
                    min={0}
                    max={64}
                    step={1}
                    placeholder="0 – 64"
                    value={overrides.stickyWeeks}
                    onChange={(e) => updateOverride("stickyWeeks", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label
                    htmlFor="whatif-force-ai"
                    className="flex items-center gap-2.5 min-h-10 px-3 rounded-lg hover:bg-muted/60 transition-colors text-xs font-medium text-foreground cursor-pointer select-none"
                  >
                    <Checkbox
                      id="whatif-force-ai"
                      checked={forceAi}
                      onCheckedChange={(checked) => setForceAi(Boolean(checked))}
                    />
                    <span>Paksa Mode AI (forceAi)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 pt-5 border-t border-border">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Skenario Guncangan Pasar (%)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-shock-grosir"
                    className="text-xs font-medium text-foreground block"
                  >
                    Shock Pasar Grosir (%)
                  </label>
                  <Input
                    id="whatif-shock-grosir"
                    type="number"
                    min={-40}
                    max={60}
                    step={1}
                    placeholder="-40 s/d +60"
                    value={overrides.shockGrosirPct}
                    onChange={(e) => updateOverride("shockGrosirPct", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-shock-trad"
                    className="text-xs font-medium text-foreground block"
                  >
                    Shock Pasar Tradisional (%)
                  </label>
                  <Input
                    id="whatif-shock-trad"
                    type="number"
                    min={-40}
                    max={60}
                    step={1}
                    placeholder="-40 s/d +60"
                    value={overrides.shockTradPct}
                    onChange={(e) => updateOverride("shockTradPct", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-shock-peer"
                    className="text-xs font-medium text-foreground block"
                  >
                    Shock Sentra Tetangga (%)
                  </label>
                  <Input
                    id="whatif-shock-peer"
                    type="number"
                    min={-40}
                    max={60}
                    step={1}
                    placeholder="-40 s/d +60"
                    value={overrides.shockPeerPct}
                    onChange={(e) => updateOverride("shockPeerPct", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="whatif-shock-bwh1"
                    className="text-xs font-medium text-foreground block"
                  >
                    Shock Beras Bawah I (%)
                  </label>
                  <Input
                    id="whatif-shock-bwh1"
                    type="number"
                    min={-40}
                    max={60}
                    step={1}
                    placeholder="-40 s/d +60"
                    value={overrides.shockBwh1Pct}
                    onChange={(e) => updateOverride("shockBwh1Pct", e.target.value)}
                    className="min-h-10 rounded-lg text-xs tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          {(validationError || errorMessage) && (
            <div
              role="alert"
              className="rounded-lg status-error px-4 py-3.5 text-xs font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{validationError || errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={predictMutation.isPending}
              className="min-h-11 rounded-md gap-2 text-sm font-semibold px-5 cursor-pointer"
            >
              {predictMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Menghitung Simulasi AI...</span>
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" aria-hidden="true" />
                  <span>Jalankan Simulasi Live</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          {/* Left: Simulated Forecast Output + Live Diagnostics */}
          <Card className="lg:col-span-6 rounded-2xl p-0 gap-0 overflow-hidden">
            <div className="px-4 sm:px-6 py-5 border-b border-border flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-price-caution" aria-hidden="true" />
                  <span className="text-xs font-bold text-price-caution uppercase tracking-wider">
                    Hasil Simulasi {result.province} ({result.horizonWeeks} Pekan)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Patokan: {result.referenceDate || result.referenceDateIso || "-"}{" "}
                  <ArrowRight className="inline w-3 h-3 mx-0.5 align-text-bottom" aria-hidden="true" />
                  <span className="sr-only">ke</span> Target: {result.targetDate}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  result.isFallback
                    ? "bg-muted text-foreground border-transparent"
                    : "status-success"
                }`}
              >
                {result.method}
              </Badge>
            </div>

            {/* Strip Proyeksi Beras & Gabah (Zero Nested Tinted Boxes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
              <div className="p-6 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Proyeksi Beras Produsen
                </span>
                <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                  {formatRupiah(result.riceProducerPrice)}
                  <span className="text-xs font-normal text-muted-foreground font-sans">/kg</span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Pita 80%: {formatRupiah(result.confidenceInterval80[0])} –{" "}
                  {formatRupiah(result.confidenceInterval80[1])}
                </p>
              </div>

              <div className="p-6 space-y-2.5">
                <span className="text-xs font-semibold text-muted-foreground block">
                  Estimasi Turunan Gabah
                </span>
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-muted-foreground">GKP</span>
                  <strong className="text-primary">
                    {formatRupiah(result.gkpEstimate)}/kg
                  </strong>
                </div>
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-muted-foreground">GKG</span>
                  <strong className="text-foreground">
                    {formatRupiah(result.gkgEstimate)}/kg
                  </strong>
                </div>
              </div>
            </div>

            {/* Live Diagnostics Hairline Ledger */}
            <div className="p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Diagnostik Inferensi Live (Stateless)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden text-xs">
                <div className="bg-card p-3.5 space-y-0.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground block">Peluang Naik</span>
                  <strong className="tabular-nums text-primary">
                    {(result.liveDiagnostics.probUp * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="bg-card p-3.5 space-y-0.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground block">Peluang Datar</span>
                  <strong className="tabular-nums text-foreground">
                    {(result.liveDiagnostics.probFlat * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="bg-card p-3.5 space-y-0.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground block">Peluang Turun</span>
                  <strong className="tabular-nums text-price-caution">
                    {(result.liveDiagnostics.probDown * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="bg-card p-3.5 space-y-0.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground block">Status Gerbang</span>
                  <strong className="text-foreground">
                    {result.liveDiagnostics.gateTriggered ? "Terpicu (Bergerak)" : "Menahan (Stabil)"}
                  </strong>
                </div>
                <div className="bg-card p-3.5 space-y-0.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground block">Kelompok Wilayah</span>
                  <strong className="text-foreground">
                    {result.liveDiagnostics.provinceGroup || "-"}
                  </strong>
                </div>
                <div className="bg-card p-3.5 space-y-0.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground block">Ambang Tau</span>
                  <strong className="tabular-nums text-foreground">
                    {result.liveDiagnostics.thresholdTau ?? "-"}
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Right: SHAP Contributions */}
          <Card className="lg:col-span-6 rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="font-display text-base font-bold text-foreground">
                Faktor Penggerak Simulasi
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
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
