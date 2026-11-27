"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Info, Calculator, Loader2, AlertCircle, RefreshCw, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { sortFairPriceProvinces } from "../domain/calculate-fair-price";
import { useFairPriceCalculation, useFairPriceParams } from "../hooks/use-fair-price";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { PriceRangeSlider } from "@/features/price-check";

const GRAIN_TYPE_OPTIONS = [
  { value: "GKP", label: "Gabah Kering Panen (GKP)" },
  { value: "GKG", label: "Gabah Kering Giling (GKG)" },
];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function FairPriceSimulator() {
  const searchParams = useSearchParams();
  const urlProvinceParam = searchParams.get("province");

  const paramsQuery = useFairPriceParams();
  const params = paramsQuery.data;

  const [grainType, setGrainType] = useState<"GKP" | "GKG" | "">("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [customRicePrice, setCustomRicePrice] = useState<number | "" | null>(null);
  const [moisture, setMoisture] = useState<number>(20);

  const provinceList = useMemo(
    () => sortFairPriceProvinces(params?.provinces),
    [params?.provinces],
  );

  const regionOptions = useMemo(
    () =>
      provinceList.map((p) => ({
        value: p,
        label: p === "Nasional" ? "Rata-rata Nasional (PIHPS)" : p,
      })),
    [provinceList],
  );

  const matchedUrlProvince = useMemo(() => {
    if (!urlProvinceParam || provinceList.length === 0) return "";
    const norm = urlProvinceParam.trim().toLowerCase();
    return provinceList.find((p) => p.toLowerCase() === norm) ?? "";
  }, [urlProvinceParam, provinceList]);

  const region = selectedRegion ?? matchedUrlProvince;

  const effectiveRicePrice: number | "" =
    customRicePrice !== null
      ? customRicePrice
      : region && params?.provinces[region]
        ? params.provinces[region].riceReferencePrice
        : "";

  const riceOutOfRange =
    typeof effectiveRicePrice === "number" &&
    (!Number.isFinite(effectiveRicePrice) ||
      effectiveRicePrice < 8000 ||
      effectiveRicePrice > 40000);

  const debouncedRicePrice = useDebouncedValue(
    effectiveRicePrice,
    customRicePrice === null ? 0 : 250,
  );
  const debouncedMoisture = useDebouncedValue(moisture, 200);

  const calcInput = useMemo(() => {
    if (
      !grainType ||
      !region ||
      typeof debouncedRicePrice !== "number" ||
      !Number.isFinite(debouncedRicePrice) ||
      debouncedRicePrice < 8000 ||
      debouncedRicePrice > 40000
    ) {
      return null;
    }
    return {
      grainType,
      region,
      ricePrice: debouncedRicePrice,
      moisturePercent: debouncedMoisture,
    };
  }, [grainType, region, debouncedRicePrice, debouncedMoisture]);

  const calcQuery = useFairPriceCalculation(calcInput);
  const result = calcQuery.data;

  function handleRegionChange(newRegion: string) {
    setSelectedRegion(newRegion);
    setCustomRicePrice(null);
  }

  const isReady = Boolean(
    grainType &&
      region &&
      typeof effectiveRicePrice === "number" &&
      effectiveRicePrice >= 8000 &&
      effectiveRicePrice <= 40000,
  );
  const isAboveHpp = result ? result.medianPrice >= result.hppGovernment : false;
  const regulationLabel =
    params?.hppActive2026.regulation ?? "Inpres No. 4/2026 & Kepbadan No. 2/2025";

  return (
    <AsyncBoundary
      isLoading={paramsQuery.isLoading}
      isError={paramsQuery.isError}
      error={paramsQuery.error}
      onRetry={() => void paramsQuery.refetch()}
    >
      <div className="space-y-6">
        {/* Control Card */}
        <Card className="p-6 rounded-2xl bg-card space-y-5">
          <div className="border-b border-border/60 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="type-subheading text-foreground font-bold">
                Atur Parameter Acuan Gabah ({params?.updatedAt || "Terkini"})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hitungan resmi berbasis harga Beras Medium I (PIHPS), rendemen giling BPS, dan data historis Bapanas ({result?.empiricalParams.samplePairs ?? params?.empiricalParams.GKP.samplePairs ?? 689} pasangan pengamatan).
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
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
                value={grainType || null}
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
              <Combobox
                items={regionOptions}
                value={regionOptions.find((opt) => opt.value === region) ?? null}
                isItemEqualToValue={(item, val) => item.value === val.value}
                itemToStringLabel={(opt) => opt.label}
                onValueChange={(opt) => {
                  if (opt) handleRegionChange(opt.value);
                }}
              >
                <ComboboxInput
                  placeholder="Pilih atau cari provinsi..."
                  className="w-full h-11 rounded-lg bg-background text-xs font-semibold text-foreground shadow-2xs"
                />
                <ComboboxContent>
                  <ComboboxEmpty>Wilayah tidak ditemukan.</ComboboxEmpty>
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
              <label className="text-xs font-medium text-muted-foreground block">
                Harga Beras Acuan (Rp/kg)
              </label>
              <input
                type="number"
                disabled={!region}
                value={effectiveRicePrice === "" ? "" : effectiveRicePrice}
                onChange={(e) =>
                  setCustomRicePrice(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder={region ? "Contoh: 13500" : "Pilih wilayah terlebih dahulu"}
                step={50}
                min={8000}
                max={40000}
                className={`w-full h-11 rounded-lg border px-3 text-xs tabular-nums font-bold shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  !region
                    ? "border-input/50 bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
                    : riceOutOfRange
                      ? "border-destructive bg-background text-foreground"
                      : "border-input bg-background text-foreground"
                }`}
              />
              <span
                className={`text-[11px] block ${
                  riceOutOfRange ? "text-destructive font-semibold" : "text-muted-foreground"
                }`}
              >
                {riceOutOfRange
                  ? "Harga beras acuan harus antara Rp8.000 – Rp40.000/kg."
                  : region
                    ? "Harga acuan beras produsen terisi otomatis."
                    : "Otomatis terisi setelah memilih wilayah."}
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
                className="w-full cursor-pointer accent-primary mt-2"
              />
              <p className="text-[11px] text-muted-foreground">
                Catatan kondisi panen (non-rafaksi).
              </p>
            </div>
          </div>
        </Card>

        {/* Empty State vs Calculation Loading/Error vs Result Cards Grid */}
        {!isReady ? (
          <Card className="p-8 sm:p-12 text-center rounded-2xl bg-card border-border/80 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Calculator className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base sm:text-lg font-bold text-foreground">
                Pilih Komoditas dan Wilayah untuk Memulai Simulasi
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {!grainType &&
                  !region &&
                  "Tentukan jenis komoditas gabah (GKP/GKG) dan wilayah provinsi pengamatan pada formulir di atas untuk melihat estimasi rentang harga wajar, batas HPP pemerintah, dan rincian komponen harga."}
                {grainType &&
                  !region &&
                  "Pilih wilayah provinsi pengamatan untuk memuat acuan harga beras produsen dan rentang wajar pasar setempat."}
                {!grainType &&
                  region &&
                  "Pilih jenis komoditas gabah (GKP atau GKG) untuk menghitung rendemen konversi giling dan harga wajarnya."}
                {grainType &&
                  region &&
                  riceOutOfRange &&
                  "Sesuaikan nominal harga beras acuan ke rentang Rp8.000 – Rp40.000/kg untuk menghitung ulang."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[
                {
                  active: Boolean(grainType),
                  activeText: `Komoditas: ${grainType}`,
                  idleText: "1. Pilih Komoditas",
                },
                {
                  active: Boolean(region),
                  activeText: `Wilayah: ${region}`,
                  idleText: "2. Pilih Wilayah",
                },
              ].map((pill) => (
                <span
                  key={pill.idleText}
                  className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-colors ${
                    pill.active
                      ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                      : "bg-muted/50 text-muted-foreground border-border/80"
                  }`}
                >
                  {pill.active ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{pill.activeText}</span>
                    </>
                  ) : (
                    pill.idleText
                  )}
                </span>
              ))}
            </div>
          </Card>
        ) : calcQuery.isError ? (
          <Card className="p-6 sm:p-8 text-center rounded-2xl border-destructive/30 bg-destructive/5 space-y-3">
            <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Gagal Menghitung Harga Wajar</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {calcQuery.error instanceof Error
                  ? calcQuery.error.message
                  : "Terjadi gangguan saat menghubungi layanan kalkulasi harga wajar."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void calcQuery.refetch()}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Hitung Ulang
            </Button>
          </Card>
        ) : !result ? (
          <Card className="p-8 text-center rounded-2xl bg-card border-border/80 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Menghitung rincian harga wajar...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Fair Price Range Display */}
            <Card className="lg:col-span-7 p-6 sm:p-7 space-y-6 rounded-2xl bg-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary block">
                      Rentang Harga Wajar Rekomendasi
                    </span>
                    {calcQuery.isFetching && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl sm:text-4xl font-extrabold font-display tabular-nums text-primary">
                      Rp{result.lowerBound.toLocaleString("id-ID")} – Rp
                      {result.upperBound.toLocaleString("id-ID")}
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
                  toleranceDelta={params?.toleranceDelta ?? 0.03}
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
                    HPP Pemerintah Aktif ({regulationLabel})
                  </span>
                  <span className="font-bold text-foreground">
                    Rp{result.hppGovernment.toLocaleString("id-ID")} / kg ({result.grainType}, tanpa rafaksi)
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    isAboveHpp
                      ? "text-primary bg-primary/10 border-primary/20"
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
                  <span className="text-muted-foreground">2. Batas Bawah Acuan Pasar</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {formatRupiah(result.lowerBound)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">3. Batas Atas Acuan Pasar</span>
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
                  <span className="tabular-nums text-base font-extrabold text-primary">
                    {formatRupiah(result.medianPrice)} / kg
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AsyncBoundary>
  );
}
