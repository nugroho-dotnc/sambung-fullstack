"use client";

import { useState, useMemo } from "react";
import { Calendar, Info, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  SEED_FORECASTS,
  ACTIVE_AI_PROVINCES,
  ALL_FORECAST_PROVINCES,
  FORECAST_META,
  ForecastRecord,
} from "@/features/forecast/domain/forecast-data";
import { ForecastChart } from "@/features/forecast/components/forecast-chart";
import { ShapWaterfall } from "@/features/forecast/components/shap-waterfall";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useForecast, useForecastMeta } from "@/features/forecast/hooks/use-forecast";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";

const QUICK_PROVINCES =
  ACTIVE_AI_PROVINCES.length > 0 ? ACTIVE_AI_PROVINCES : ["Jawa Timur", "Jawa Tengah"];

export default function ForecastPage() {
  const { data: user } = useCurrentUser();
  const isFarmer = user?.role === "petani";

  const [horizon, setHorizon] = useState<2 | 4>(2);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const userProvince = user?.province;

  const defaultProvince = useMemo(() => {
    if (userProvince) {
      const userProvNorm = userProvince.trim().toLowerCase();
      const matched = ALL_FORECAST_PROVINCES.find(
        (p) => p.toLowerCase() === userProvNorm
      );
      if (matched) return matched;
    }
    return QUICK_PROVINCES[0] || "Jawa Timur";
  }, [userProvince]);

  const province = selectedProvince ?? defaultProvince;

  const { data: forecastData } = useForecast(province, horizon);
  const { data: forecastMetaData } = useForecastMeta();

  const provinceOptions = useMemo(() => {
    const activeList = forecastMetaData?.activeProvinces || ACTIVE_AI_PROVINCES;
    const allList = forecastMetaData?.allProvinces || ALL_FORECAST_PROVINCES;
    const activeSet = new Set(activeList);
    return allList.map((prov) => ({
      value: prov,
      label: activeSet.has(prov) ? `${prov} (Prakiraan AI Aktif)` : `${prov} (Acuan Pekan Terakhir)`,
    }));
  }, [forecastMetaData]);

  const activeForecast = useMemo<ForecastRecord>(() => {
    if (forecastData?.records && forecastData.records.length > 0) {
      return forecastData.records[0];
    }
    const found = SEED_FORECASTS.find(
      (f) => f.horizonWeeks === horizon && f.province === province
    );
    return found || SEED_FORECASTS[0];
  }, [forecastData, horizon, province]);

  const rGkp = forecastData?.meta?.derivedConversion?.rGkp ?? FORECAST_META.derivedConversion.rGkp;
  const rGkg = forecastData?.meta?.derivedConversion?.rGkg ?? FORECAST_META.derivedConversion.rGkg;
  const rGkpPct = (rGkp * 100).toFixed(2);
  const rGkgPct = (rGkg * 100).toFixed(2);
  const latestObservation =
    forecastData?.meta?.latestObservationWeek ||
    forecastMetaData?.latestObservationWeek ||
    FORECAST_META.latestObservationWeek;

  return (
    <PageContainer>
      <PageHeader
        title={
          isFarmer
            ? "Prakiraan Tren Harga Gabah & Pasar AI"
            : "Prakiraan Tren Harga Beras & Pasar AI"
        }
        description={
          isFarmer
            ? `Estimasi harga gabah petani (GKP & GKG) dan tren pasar untuk 2 hingga 4 pekan ke depan di wilayah ${province} (pembaruan data: ${latestObservation}).`
            : `Proyeksi harga beras produsen (Medium I) dan estimasi acuan bahan baku gabah untuk 2 hingga 4 pekan ke depan (pembaruan data: ${latestObservation}).`
        }
        actions={
          <div className="flex items-center bg-muted/80 p-1 rounded-lg border border-border/80 shadow-2xs">
            <Button
              variant={horizon === 2 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHorizon(2)}
              className="px-3 text-xs font-semibold gap-1.5 rounded-md"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horizon 2 Pekan</span>
            </Button>
            <Button
              variant={horizon === 4 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHorizon(4)}
              className="px-3 text-xs font-semibold gap-1.5 rounded-md"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horizon 4 Pekan</span>
            </Button>
          </div>
        }
      />

      {/* Province Picker: Quick Chips + Full 25-Province Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
            Sentra AI Aktif:
          </span>
          {QUICK_PROVINCES.map((prov) => (
            <Button
              key={prov}
              size="sm"
              variant={province === prov ? "default" : "outline"}
              onClick={() => setSelectedProvince(prov)}
              className="min-h-8 text-xs font-semibold rounded-lg shrink-0"
            >
              {prov}
            </Button>
          ))}
        </div>

        <div className="w-full md:w-72 shrink-0">
          <Select
            items={provinceOptions}
            value={province}
            onValueChange={(val) => {
              if (val) setSelectedProvince(val);
            }}
          >
            <SelectTrigger className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs">
              <SelectValue placeholder="Pilih dari 25 Provinsi" />
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
      </div>

      {/* Main Grid: Forecast Metric & Chart vs Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
        {/* Left Column: Adaptive AI Prediction & Interactive Chart */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-7 rounded-2xl bg-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-primary">
                    Sasaran: {activeForecast.province} • {activeForecast.targetDate}
                  </span>
                  <Badge
                    variant={activeForecast.isFallback ? "secondary" : "default"}
                    className="text-[11px] font-bold"
                  >
                    {activeForecast.isFallback ? "Acuan Pekan Terakhir" : "Prakiraan AI"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-bold bg-primary/10 text-primary border-primary/25"
                  >
                    {isFarmer ? "Fokus Petani: Gabah" : "Fokus Penggilingan: Beras"}
                  </Badge>
                </div>
                <h2 className="type-subheading text-foreground font-bold">
                  {isFarmer
                    ? "Estimasi Nilai Gabah Petani"
                    : "Estimasi Nilai Beras Produsen"}
                </h2>
              </div>
              <Popover>
                <PopoverTrigger
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                  aria-label="Penjelasan Proyeksi Nilai Pasar"
                >
                  <Info className="w-4 h-4" />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                  <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    Tentang Proyeksi Harga
                  </PopoverTitle>
                  <PopoverDescription className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                    <p>
                      Proyeksi disusun dari tren harga mingguan PIHPS Bank Indonesia, pasokan panen BPS, data Bapanas, dan kondisi cuaca daerah.
                    </p>
                    <p className="pt-1.5 border-t border-border/50 text-[11px]">
                      {isFarmer
                        ? "Angka GKP dan GKG dihitung menggunakan rasio rendemen giling standar resmi BPS & Bapanas terhadap proyeksi harga beras produsen."
                        : "Rentang wajar (80%) menunjukkan batas deviasi harga yang paling wajar terjadi di tingkat penggilingan/produsen."}
                    </p>
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            </div>

            {/* ADAPTIVE HERO DISPLAY */}
            {isFarmer ? (
              /* Petani Focus: GKP is Hero Number */
              <div className="space-y-3.5">
                <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
                      Estimasi Gabah Kering Panen (GKP) Utama
                    </span>
                    <span className="text-[11px] bg-background px-2.5 py-0.5 rounded-md border border-border/60 font-semibold tabular-nums text-foreground">
                      Rendemen Standar {rGkpPct}%
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <p className="text-3xl sm:text-4xl font-extrabold font-display tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(activeForecast.gkpEstimate)}
                      <span className="text-xs font-normal text-muted-foreground font-sans ml-1.5">
                        / kg gabah
                      </span>
                    </p>
                    <div className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border/70">
                      GKG Siap Giling:{" "}
                      <strong className="text-foreground tabular-nums font-bold">
                        {formatRupiah(activeForecast.gkgEstimate)} / kg
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Secondary Reference Bar for Farmer */}
                <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Acuan Beras Produsen (Medium I)</span>
                    <span className="font-bold text-foreground text-sm tabular-nums">
                      {formatRupiah(activeForecast.riceProducerPrice)} / kg
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-muted-foreground block text-[11px]">Rentang Wajar Pasar (80%)</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(activeForecast.confidenceInterval80[0])} – {formatRupiah(activeForecast.confidenceInterval80[1])}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Buyer/Penggilingan Focus: Rice Producer Price is Hero Number */
              <div className="space-y-3.5">
                <div className="p-5 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      {activeForecast.isFallback ? "Acuan Harga Pekan Terakhir" : "Perkiraan Harga Utama Beras"}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      Rentang Wajar Pasar (80%)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <p className="text-3xl sm:text-4xl font-extrabold font-display tabular-nums text-foreground">
                      {formatRupiah(activeForecast.riceProducerPrice)}
                      <span className="text-xs font-normal text-muted-foreground font-sans ml-1.5">
                        / kg beras
                      </span>
                    </p>
                    <span className="text-xs font-bold text-foreground bg-background px-3 py-1.5 rounded-md border border-border/70 tabular-nums shadow-2xs">
                      {formatRupiah(activeForecast.confidenceInterval80[0])} – {formatRupiah(activeForecast.confidenceInterval80[1])}
                    </span>
                  </div>
                </div>

                {/* Sub-cards: Input Cost References for Buyer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Acuan Beli GKP</span>
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded tabular-nums font-semibold">
                        Rendemen {rGkpPct}%
                      </span>
                    </div>
                    <p className="text-xl font-bold font-display tabular-nums text-foreground">
                      {formatRupiah(activeForecast.gkpEstimate)}{" "}
                      <span className="text-xs font-normal text-muted-foreground font-sans">/ kg</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Acuan Beli GKG</span>
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded tabular-nums font-semibold">
                        Rendemen {rGkgPct}%
                      </span>
                    </div>
                    <p className="text-xl font-bold font-display tabular-nums text-foreground">
                      {formatRupiah(activeForecast.gkgEstimate)}{" "}
                      <span className="text-xs font-normal text-muted-foreground font-sans">/ kg</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Clean Single Conversion Notice */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {isFarmer
                    ? "Taksiran resmi BPS & Bapanas tanpa potongan rafaksi (HPP Aktif 2026)."
                    : "Rasio konversi bahan baku mengacu pada standar resmi BPS & Bapanas."}
                </span>
              </div>
              <span className="font-medium text-primary shrink-0 hidden sm:inline">
                {activeForecast.province}
              </span>
            </div>

            {/* Trend Chart */}
            <div className="pt-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Lintasan Tren Historis Aktual &amp; Proyeksi ({horizon} Pekan ke Depan)
              </p>
              <ForecastChart series={activeForecast.historicalSeries} />
            </div>
          </Card>
        </div>

        {/* Right Column: Explanatory Price Drivers */}
        <div className="lg:col-span-5">
          <Card className="p-6 sm:p-7 rounded-2xl bg-card space-y-4">
            <div className="border-b border-border/60 pb-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <span>Transparansi AI Pasar</span>
                </div>
                <h3 className="type-subheading text-foreground font-bold mt-0.5">
                  Faktor Penggerak Harga
                </h3>
              </div>
              <Popover>
                <PopoverTrigger
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                  aria-label="Penjelasan Faktor Penggerak"
                >
                  <Info className="w-4 h-4" />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                  <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    Tentang Faktor Penggerak
                  </PopoverTitle>
                  <PopoverDescription className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                    <p>
                      Rincian ini menguraikan bagaimana kondisi cuaca, musim panen &amp; pasokan daerah, acuan HPP, pergerakan sentra produsen, dan tren pasar berkontribusi pada prakiraan harga beras.
                    </p>
                    <p className="pt-1.5 border-t border-border/50 text-[11px]">
                      Angka ini merupakan gambaran keterkaitan data statistik, bukan jaminan kepastian kondisi di lapangan.
                    </p>
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            </div>

            {activeForecast.isFallback ? (
              <div className="p-5 rounded-xl border border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Rincian Faktor Belum Tersedia</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Untuk menjaga keakuratan informasi, uraian faktor pendorong tidak ditampilkan karena wilayah {activeForecast.province} saat ini memakai <strong>Acuan Pekan Terakhir</strong> (harga pasar cenderung datar atau belum lolos uji kelayakan AI).
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Pilih provinsi sentra AI aktif seperti <strong>Jawa Timur</strong>, <strong>Jawa Tengah</strong>, <strong>Gorontalo</strong>, <strong>Sulawesi Tengah</strong>, atau <strong>Sumatera Barat</strong> di atas untuk melihat uraian lengkapnya.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Faktor penentu tren: tanda (↑) mendorong penguatan harga, sedangkan (↓) menahan kenaikan harga pasar.
                </p>
                <ShapWaterfall
                  factors={activeForecast.shapContributions}
                  userRole={user?.role}
                />
                <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sumber: PIHPS BI, BPS, Bapanas, dan BMKG/ERA5.</span>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
