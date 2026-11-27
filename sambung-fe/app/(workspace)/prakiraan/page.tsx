"use client";

import { useMemo, useState } from "react";
import { Calendar, Info, ShieldCheck, AlertTriangle, Lock, Crown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import type { ForecastRecord } from "@/features/forecast/domain/forecast-data";
import { ForecastChart } from "@/features/forecast/components/forecast-chart";
import { ShapWaterfall } from "@/features/forecast/components/shap-waterfall";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useForecast, useForecastMeta } from "@/features/forecast/hooks/use-forecast";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";

export default function ForecastPage() {
  const { data: user } = useCurrentUser();
  const isFarmer = user?.role === "petani";
  const isFreeBuyer = user?.role === "pembeli" && !user?.isPro;

  const [horizon, setHorizon] = useState<2 | 4>(2);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const metaQuery = useForecastMeta();
  const forecastMetaData = metaQuery.data;

  const activeProvinces = useMemo(
    () => forecastMetaData?.activeProvinces ?? [],
    [forecastMetaData?.activeProvinces],
  );
  const allProvinces = useMemo(
    () => forecastMetaData?.allProvinces ?? [],
    [forecastMetaData?.allProvinces],
  );

  const userProvince = user?.province;

  const defaultProvince = useMemo(() => {
    if (userProvince && allProvinces.length > 0) {
      const userProvNorm = userProvince.trim().toLowerCase();
      const matched = allProvinces.find((p) => p.toLowerCase() === userProvNorm);
      if (matched) return matched;
    }
    return activeProvinces[0] || allProvinces[0] || "";
  }, [userProvince, allProvinces, activeProvinces]);

  const province = isFreeBuyer ? defaultProvince : (selectedProvince ?? defaultProvince);

  const forecastQuery = useForecast(province, horizon, {
    enabled: Boolean(province),
  });
  const forecastData = forecastQuery.data;

  const provinceOptions = useMemo(() => {
    const activeSet = new Set(activeProvinces);
    return allProvinces.map((prov) => ({
      value: prov,
      label: activeSet.has(prov)
        ? `${prov} (Prakiraan AI Aktif)`
        : `${prov} (Acuan Pekan Terakhir)`,
    }));
  }, [activeProvinces, allProvinces]);

  const activeForecast: ForecastRecord | undefined = forecastData?.records?.[0];

  const rGkp =
    forecastData?.meta?.derivedConversion?.rGkp ??
    forecastMetaData?.derivedConversion?.rGkp ??
    0.5338;
  const rGkg =
    forecastData?.meta?.derivedConversion?.rGkg ??
    forecastMetaData?.derivedConversion?.rGkg ??
    0.6274;
  const rGkpPct = (rGkp * 100).toFixed(2);
  const rGkgPct = (rGkg * 100).toFixed(2);
  const latestObservation =
    forecastData?.meta?.latestObservationWeek ||
    forecastMetaData?.latestObservationWeek ||
    "Pekan Terbaru";

  const isLoading = metaQuery.isLoading || (Boolean(province) && forecastQuery.isLoading);
  const combinedError = metaQuery.error || forecastQuery.error;
  const isError = metaQuery.isError || forecastQuery.isError;
  const isEmpty = !isLoading && !isError && !activeForecast;

  function handleRetry() {
    if (metaQuery.isError) {
      void metaQuery.refetch();
    } else {
      void forecastQuery.refetch();
    }
  }

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
            ? `Estimasi harga gabah petani (GKP & GKG) dan tren pasar untuk 2 hingga 4 pekan ke depan di wilayah ${province || "Indonesia"} (pembaruan data: ${latestObservation}).`
            : `Proyeksi harga beras produsen (Medium I) dan estimasi acuan bahan baku gabah untuk 2 hingga 4 pekan ke depan (pembaruan data: ${latestObservation}).`
        }
        actions={
          <div className="flex items-center bg-muted/80 p-1 rounded-lg border border-border/80 shadow-2xs">
            <Button
              variant={horizon === 2 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHorizon(2)}
              className="px-3 text-xs font-semibold gap-1.5 rounded-md cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horizon 2 Pekan</span>
            </Button>
            <Button
              variant={horizon === 4 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHorizon(4)}
              className="px-3 text-xs font-semibold gap-1.5 rounded-md cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horizon 4 Pekan</span>
            </Button>
          </div>
        }
      />

      {/* Province Picker: Full Dropdown (or Locked Domicile Strip for Free Buyers) */}
      {allProvinces.length > 0 &&
        (isFreeBuyer ? (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50/70 dark:border-amber-800/70 dark:bg-amber-950/30 px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-950 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Wilayah Asal Anda:{" "}
                <strong className="font-bold">{province || "Indonesia"}</strong> ·
                Paket Gratis hanya menampilkan 1 wilayah.
              </span>
            </div>
            <ButtonLink
              href="/langganan?from=%2Fprakiraan"
              size="sm"
              className="min-h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 mr-1.5" />
              Lihat Semua Provinsi (Pro)
            </ButtonLink>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 mb-6">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Pilih Wilayah Provinsi:
            </span>

            <div className="w-full sm:w-80 shrink-0">
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
                  placeholder={`Pilih dari ${allProvinces.length} Provinsi`}
                  className="w-full h-9 rounded-lg bg-background text-xs font-semibold text-foreground shadow-2xs"
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
          </div>
        ))}

      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        error={combinedError}
        isEmpty={isEmpty}
        onRetry={handleRetry}
      >
        {activeForecast && (
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
                      {isFarmer ? "Estimasi Nilai Gabah Petani" : "Estimasi Nilai Beras Produsen"}
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
                  <div className="space-y-3.5">
                    <div className="p-5 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-primary font-bold uppercase tracking-wider">
                          Estimasi Gabah Kering Panen (GKP) Utama
                        </span>
                        <span className="text-[11px] bg-background px-2.5 py-0.5 rounded-md border border-border/60 font-semibold tabular-nums text-foreground">
                          Rendemen Standar {rGkpPct}%
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                        <p className="text-3xl sm:text-4xl font-extrabold font-display tabular-nums text-primary">
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

                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Acuan Beras Produsen (Medium I)
                        </span>
                        <span className="font-bold text-foreground text-sm tabular-nums">
                          {formatRupiah(activeForecast.riceProducerPrice)} / kg
                        </span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-muted-foreground block text-[11px]">
                          Rentang Wajar Pasar (80%)
                        </span>
                        <span className="font-semibold text-primary tabular-nums">
                          {formatRupiah(activeForecast.confidenceInterval80[0])} –{" "}
                          {formatRupiah(activeForecast.confidenceInterval80[1])}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="p-5 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          {activeForecast.isFallback
                            ? "Acuan Harga Pekan Terakhir"
                            : "Perkiraan Harga Utama Beras"}
                        </span>
                        <span className="text-primary font-semibold">
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
                          {formatRupiah(activeForecast.confidenceInterval80[0])} –{" "}
                          {formatRupiah(activeForecast.confidenceInterval80[1])}
                        </span>
                      </div>
                    </div>

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
                          <span className="text-xs font-normal text-muted-foreground font-sans">
                            / kg
                          </span>
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
                          <span className="text-xs font-normal text-muted-foreground font-sans">
                            / kg
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
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

                {isFreeBuyer ? (
                  <div className="p-5 rounded-xl border border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Penyebab Naik-Turunnya Harga Tersedia di Produsen Pro</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Paket Gratis hanya menampilkan perkiraan angka harga di wilayah asal Anda. Aktifkan Produsen Pro untuk melihat penyebab pergerakan harga (cuaca, musim panen, wilayah sentra lain, dan HPP) di seluruh Indonesia.
                    </p>
                    <ButtonLink
                      href="/langganan?from=%2Fprakiraan"
                      size="sm"
                      className="w-full min-h-9 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 mr-1.5" />
                      Aktifkan Produsen Pro — Rp99.000/30 hari
                    </ButtonLink>
                  </div>
                ) : activeForecast.isFallback ? (
                  <div className="p-5 rounded-xl border border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Rincian Faktor Belum Tersedia</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Untuk menjaga keakuratan informasi, uraian faktor pendorong tidak ditampilkan karena wilayah {activeForecast.province} saat ini memakai <strong>Acuan Pekan Terakhir</strong> (harga pasar cenderung datar atau belum lolos uji kelayakan AI).
                    </p>
                    {activeProvinces.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Pilih provinsi bertanda <strong>Prakiraan AI Aktif</strong> pada daftar wilayah di atas untuk melihat uraian faktor penggeraknya.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Faktor penentu tren: tanda (
                      <ArrowUpRight className="inline w-3.5 h-3.5 text-primary align-text-bottom" aria-hidden="true" />
                      <span className="sr-only">naik</span>) mendorong penguatan harga, sedangkan (
                      <ArrowDownRight className="inline w-3.5 h-3.5 text-amber-600 align-text-bottom" aria-hidden="true" />
                      <span className="sr-only">turun</span>) menahan kenaikan harga pasar.
                    </p>
                    <ShapWaterfall factors={activeForecast.shapContributions} userRole={user?.role} />
                    <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Sumber: PIHPS BI, BPS, Bapanas, dan BMKG/ERA5.</span>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </PageContainer>
  );
}
