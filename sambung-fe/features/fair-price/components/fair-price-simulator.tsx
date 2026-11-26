"use client";

import { useState, useMemo } from "react";
import { Info, Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateFairPriceBreakdown,
  FAIR_PRICE_PROVINCES,
  FAIR_PRICE_META,
  getProvinceReferenceRicePrice,
} from "../domain/calculate-fair-price";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { PriceRangeSlider } from "@/features/price-check";

const GRAIN_TYPE_OPTIONS = [
  { value: "GKP", label: "Gabah Kering Panen (GKP)" },
  { value: "GKG", label: "Gabah Kering Giling (GKG)" },
];

const REGION_OPTIONS = FAIR_PRICE_PROVINCES.map((p) => ({
  value: p,
  label: p === "Nasional" ? "Rata-rata Nasional (PIHPS)" : p,
}));

export function FairPriceSimulator() {
  const [grainType, setGrainType] = useState<"GKP" | "GKG" | "">("");
  const [region, setRegion] = useState<string>("");
  const [ricePrice, setRicePrice] = useState<number | "">("");
  const [moisture, setMoisture] = useState<number>(20);

  function handleRegionChange(newRegion: string) {
    setRegion(newRegion);
    if (newRegion) {
      setRicePrice(getProvinceReferenceRicePrice(newRegion));
    } else {
      setRicePrice("");
    }
  }

  const isReady = Boolean(grainType && region && typeof ricePrice === "number" && ricePrice > 0);

  const result = useMemo(() => {
    if (!isReady || !grainType || !region || typeof ricePrice !== "number") return null;
    return calculateFairPriceBreakdown({
      grainType,
      region,
      ricePrice,
      moisturePercent: moisture,
    });
  }, [isReady, grainType, region, ricePrice, moisture]);

  const isAboveHpp = result ? result.medianPrice >= result.hppGovernment : false;

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <Card className="p-6 rounded-2xl bg-card space-y-5">
        <div className="border-b border-border/60 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="type-subheading text-foreground font-bold">
              Atur Parameter Acuan Gabah ({FAIR_PRICE_META.updatedAt})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hitungan resmi berbasis harga Beras Medium I (PIHPS), rendemen giling BPS, dan data historis Bapanas ({result?.empiricalParams.samplePairs ?? 689} pasangan pengamatan).
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Rumus Transparan
            </span>
            <Popover>
              <PopoverTrigger
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                aria-label="Penjelasan Parameter Mutu"
              >
                <Info className="w-4 h-4" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  Cara Hitung Harga Wajar
                </PopoverTitle>
                <PopoverDescription className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                  <p>
                    Batas wajar dihitung langsung dari harga beras produsen dikalikan rendemen giling standar dan rasio historis harga gabah terhadap beras di pasar.
                  </p>
                  <p className="pt-1.5 border-t border-border/50 text-[11px]">
                    Sesuai kebijakan HPP 2026 tanpa potongan rafaksi, angka kadar air di samping hanya sebagai catatan kondisi panen dan tidak memotong rentang harga wajar secara otomatis.
                  </p>
                </PopoverDescription>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Komoditas Gabah <span className="text-destructive">*</span>
            </label>
            <Select
              items={GRAIN_TYPE_OPTIONS}
              value={grainType || undefined}
              onValueChange={(val) => {
                if (val === "GKP" || val === "GKG") {
                  setGrainType(val);
                  setMoisture(val === "GKP" ? 22 : 14);
                }
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih jenis gabah" />
              </SelectTrigger>
              <SelectContent>
                {GRAIN_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Wilayah Pengamatan (34 Provinsi) <span className="text-destructive">*</span>
            </label>
            <Select
              items={REGION_OPTIONS}
              value={region || undefined}
              onValueChange={(val) => {
                if (val) handleRegionChange(val);
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih wilayah provinsi" />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Harga Beras Acuan (Rp/kg)
            </label>
            <input
              type="number"
              disabled={!region}
              value={ricePrice === "" ? "" : ricePrice}
              onChange={(e) => setRicePrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={region ? "Contoh: 13500" : "Pilih wilayah terlebih dahulu"}
              step={50}
              min={8000}
              className={`w-full h-11 rounded-lg border px-3 text-xs tabular-nums font-bold shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                !region
                  ? "border-input/50 bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
                  : "border-input bg-background text-foreground"
              }`}
            />
            <span className="text-[11px] text-muted-foreground block">
              {region ? "Harga acuan beras produsen terisi otomatis." : "Otomatis terisi setelah memilih wilayah."}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-muted-foreground">
                Catatan Kadar Air (Info Mutu)
              </label>
              <span className="tabular-nums text-xs font-bold text-foreground">{moisture}%</span>
            </div>
            <input
              type="range"
              min={12}
              max={28}
              step={0.5}
              value={moisture}
              onChange={(e) => setMoisture(Number(e.target.value))}
              className="w-full cursor-pointer accent-emerald-600 mt-2"
            />
            <p className="text-[11px] text-muted-foreground">
              Catatan kondisi panen (non-rafaksi).
            </p>
          </div>
        </div>
      </Card>

      {/* Empty State vs Result Cards Grid */}
      {!isReady || !result ? (
        <Card className="p-8 sm:p-12 text-center rounded-2xl bg-card border-border/80 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/40">
            <Calculator className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold text-foreground">
              Pilih Komoditas dan Wilayah untuk Memulai Simulasi
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {!grainType && !region && "Tentukan jenis komoditas gabah (GKP/GKG) dan wilayah provinsi pengamatan pada formulir di atas untuk melihat estimasi rentang harga wajar, batas HPP pemerintah, dan rincian komponen harga."}
              {grainType && !region && "Pilih wilayah provinsi pengamatan untuk memuat acuan harga beras produsen dan rentang wajar pasar setempat."}
              {!grainType && region && "Pilih jenis komoditas gabah (GKP atau GKG) untuk menghitung rendemen konversi giling dan harga wajarnya."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                grainType
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 font-semibold"
                  : "bg-muted/50 text-muted-foreground border-border/80"
              }`}
            >
              {grainType ? `✓ Komoditas: ${grainType}` : "1. Pilih Komoditas"}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                region
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 font-semibold"
                  : "bg-muted/50 text-muted-foreground border-border/80"
              }`}
            >
              {region ? `✓ Wilayah: ${region}` : "2. Pilih Wilayah"}
            </span>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Fair Price Range Display */}
          <Card className="lg:col-span-7 p-6 sm:p-7 space-y-6 rounded-2xl bg-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 block">
                  Rentang Harga Wajar Rekomendasi
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl sm:text-4xl font-extrabold font-display tabular-nums text-emerald-700 dark:text-emerald-400">
                    Rp{result.lowerBound.toLocaleString("id-ID")} – Rp{result.upperBound.toLocaleString("id-ID")}
                  </p>
                  <span className="text-sm font-normal text-muted-foreground font-sans">/ kg</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Acuan {result.grainType} di {result.region}. Sumber: {result.referenceSource}.
                </p>
              </div>
              <Popover>
                <PopoverTrigger
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                  aria-label="Penjelasan Rentang Wajar"
                >
                  <Info className="w-4 h-4" />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                  <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    Rentang Harga Wajar Historis
                  </PopoverTitle>
                  <PopoverDescription className="text-muted-foreground text-xs leading-relaxed">
                    Rentang batas bawah hingga batas atas dihitung dari sebaran rasio harga gabah terhadap nilai ekuivalen berasnya pada catatan pasar resmi Bapanas.
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            </div>

            {/* Interactive Preview Slider */}
            <div className="pt-1">
              <PriceRangeSlider
                value={result.medianPrice}
                lowerBound={result.lowerBound}
                upperBound={result.upperBound}
                onChange={() => {}}
                disabled
                showDirectInput={false}
                label="Titik Tengah terhadap Rentang Wajar"
                description="Tawaran di dalam rentang ini bertanda Lampu Hijau."
              />
            </div>

            {/* Government HPP Floor Reference */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-xs">
                  HPP Pemerintah Aktif ({FAIR_PRICE_META.hppActive2026.regulation})
                </span>
                <span className="font-bold text-foreground">
                  Rp{result.hppGovernment.toLocaleString("id-ID")} / kg ({result.grainType}, tanpa rafaksi)
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                  isAboveHpp
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                }`}
              >
                {isAboveHpp ? "Nilai Tengah di Atas HPP" : "Di Bawah HPP Acuan"}
              </span>
            </div>
          </Card>

          {/* Right Column: Transparent Formula Breakdown */}
          <Card className="lg:col-span-5 p-6 sm:p-7 space-y-5 rounded-2xl bg-card">
            <div className="border-b border-border/60 pb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-primary">
                  Rincian Perhitungan Transparan
                </span>
                <h3 className="type-subheading text-foreground font-bold mt-0.5">
                  Komponen Harga Wajar {result.grainType}
                </h3>
              </div>
              <Popover>
                <PopoverTrigger
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                  aria-label="Penjelasan Rincian Perhitungan"
                >
                  <Info className="w-4 h-4" />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                  <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    Rincian Konversi Standar Giling
                  </PopoverTitle>
                  <PopoverDescription className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                    <p>
                      Dengan rendemen giling standar {(result.rendemen * 100).toFixed(2)}%, setiap 1 kg {result.grainType} setara {result.rendemen.toFixed(4)} kg beras (ekuivalen kotor {formatRupiah(result.explanation.grossValue)}).
                    </p>
                    <p className="pt-1.5 border-t border-border/50 text-[11px]">
                      Hitungan ini menggunakan rumus resmi berbasis pengamatan harga pasar, bukan perkiraan AI.
                    </p>
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">
                  1. Nilai Ekuivalen Beras (Rendemen {(result.rendemen * 100).toFixed(2)}%)
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatRupiah(result.explanation.grossValue)}
                </span>
              </div>

              <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">
                  2. Batas Bawah Acuan Pasar
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatRupiah(result.lowerBound)}
                </span>
              </div>

              <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">
                  3. Batas Atas Acuan Pasar
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatRupiah(result.upperBound)}
                </span>
              </div>

              <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">
                  4. Selisih Pengolahan vs Nilai Beras
                </span>
                <span className="tabular-nums font-semibold text-muted-foreground">
                  - {formatRupiah(result.millingMarginAmount)}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <span className="font-bold text-foreground">Nilai Tengah Harga Wajar</span>
                <span className="tabular-nums text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(result.medianPrice)} / kg
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
