"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProvincialPriceComparison } from "@/features/region-map/domain/map-types";
import { useSpatialDisparity } from "@/features/region-map/hooks/use-spatial-disparity";
import { IndonesiaSvgMap } from "@/features/region-map/components/indonesia-svg-map";
import { ProvincialTable } from "@/features/region-map/components/provincial-table";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useMobile } from "@/hooks/use-mobile";
import { PageContainer } from "@/components/shared/page-container";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Map as MapIcon, Table as TableIcon, ArrowRight, Info } from "lucide-react";

const COMMODITY_OPTIONS = [
  { value: "Beras Medium I", label: "Beras Medium I (Pasar Tradisional PIHPS)" },
  { value: "Gabah Kering Panen (GKP - Turunan)", label: "GKP (Estimasi Turunan SKGB)" },
  { value: "Gabah Kering Giling (GKG - Turunan)", label: "GKG (Estimasi Turunan SKGB)" },
];

const COVERAGE_OPTIONS = [
  { value: "Seluruh Indonesia", label: "Seluruh Indonesia (34 Provinsi)" },
  { value: "Pulau Jawa", label: "Pulau Jawa (Sentra Utama)" },
  { value: "Luar Jawa", label: "Luar Jawa" },
];

const JAVA_PROVINCES = new Set([
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Banten",
]);

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default function PetaDisparitasPage() {
  const isMobile = useMobile();
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [selectedCommodity, setSelectedCommodity] = useState("Beras Medium I");
  const [selectedCoverage, setSelectedCoverage] = useState("Seluruh Indonesia");
  const [selectedTime, setSelectedTime] = useState("Snapshot Terkini");
  const [selectedProvince, setSelectedProvince] = useState<string>("Jawa Timur");

  const spatialQuery = useSpatialDisparity();
  const spatialData = spatialQuery.data;

  const timeOptions = useMemo(
    () => [
      {
        value: "Snapshot Terkini",
        label: `Snapshot Terkini (${spatialData?.snapshotLabel || "Terbaru"})`,
      },
      { value: "Rata-rata 30 Hari", label: "Rata-rata 30 Hari Terakhir (4 Pekan)" },
    ],
    [spatialData?.snapshotLabel],
  );

  const fullCommodityData = useMemo<ProvincialPriceComparison[]>(() => {
    const rawProvinces = spatialData?.provinces ?? [];
    if (rawProvinces.length === 0) return [];

    const is30d = selectedTime === "Rata-rata 30 Hari";
    const baseList = rawProvinces.map((item) => {
      let price = is30d && item.price30d ? item.price30d : item.price;
      let grainLabel = "Beras Medium I";
      if (selectedCommodity.includes("GKP") && item.gkpDerivedPrice) {
        price = item.gkpDerivedPrice;
        grainLabel = "GKP (Turunan)";
      } else if (selectedCommodity.includes("GKG") && item.gkgDerivedPrice) {
        price = item.gkgDerivedPrice;
        grainLabel = "GKG (Turunan)";
      }
      return { ...item, price, grainType: grainLabel };
    });

    const natMedian = computeMedian(baseList.map((i) => i.price));
    return baseList.map((item) => {
      const pct = natMedian > 0 ? Math.round(((item.price - natMedian) / natMedian) * 10000) / 100 : 0;
      const status: "above" | "below" | "normal" =
        pct > 1.5 ? "above" : pct < -1.5 ? "below" : "normal";
      return {
        ...item,
        medianPrice: natMedian,
        percentageDiff: pct,
        status,
      };
    });
  }, [spatialData?.provinces, selectedCommodity, selectedTime]);

  const displayData = useMemo(() => {
    if (selectedCoverage === "Pulau Jawa") {
      return fullCommodityData.filter((p) => JAVA_PROVINCES.has(p.province));
    }
    if (selectedCoverage === "Luar Jawa") {
      return fullCommodityData.filter((p) => !JAVA_PROVINCES.has(p.province));
    }
    return fullCommodityData;
  }, [fullCommodityData, selectedCoverage]);

  const minPriceItem = useMemo(() => {
    if (displayData.length === 0) return undefined;
    return displayData.reduce(
      (prev, curr) => (curr.price < prev.price ? curr : prev),
      displayData[0],
    );
  }, [displayData]);

  const maxPriceItem = useMemo(() => {
    if (displayData.length === 0) return undefined;
    return displayData.reduce(
      (prev, curr) => (curr.price > prev.price ? curr : prev),
      displayData[0],
    );
  }, [displayData]);

  const disparityPercent = useMemo(() => {
    if (!minPriceItem || !maxPriceItem || minPriceItem.price === 0) return "0.0";
    return (((maxPriceItem.price - minPriceItem.price) / minPriceItem.price) * 100).toFixed(1);
  }, [minPriceItem, maxPriceItem]);

  const activeProvinceItem = useMemo(() => {
    return (
      displayData.find((p) => p.province.toLowerCase() === selectedProvince.toLowerCase()) ||
      fullCommodityData.find((p) => p.province.toLowerCase() === selectedProvince.toLowerCase()) ||
      displayData[0]
    );
  }, [displayData, fullCommodityData, selectedProvince]);

  const activeFactors = activeProvinceItem?.spatialFactors || [];

  return (
    <PageContainer>
      {/* Header & Breadcrumb */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
        >
          <Link href="/" className="hover:text-foreground font-semibold">
            SAMBUNG
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">Peta Disparitas Harga Regional</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Peta Sebaran &amp; Perbedaan Harga di 34 Provinsi
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Bandingkan harga Pasar Tradisional Beras Medium I (PIHPS BI) per{" "}
              <strong>{spatialData?.snapshotLabel || "Snapshot Terbaru"}</strong> terhadap harga tengah nasional beserta faktor pendorong harga di tiap wilayah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "map" ? "table" : "map")}
              className="gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              {viewMode === "map" ? (
                <>
                  <TableIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{isMobile ? "Tabel" : "Tampilan Tabel"}</span>
                </>
              ) : (
                <>
                  <MapIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{isMobile ? "Peta" : "Tampilan Peta"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 sm:p-5 bg-card rounded-2xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Komoditas Acuan
            </label>
            <Select
              items={COMMODITY_OPTIONS}
              value={selectedCommodity}
              onValueChange={(val) => {
                if (val) setSelectedCommodity(val);
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih komoditas" />
              </SelectTrigger>
              <SelectContent>
                {COMMODITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Cakupan Wilayah
            </label>
            <Select
              items={COVERAGE_OPTIONS}
              value={selectedCoverage}
              onValueChange={(val) => {
                if (val) setSelectedCoverage(val);
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih cakupan" />
              </SelectTrigger>
              <SelectContent>
                {COVERAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Snapshot Waktu
            </label>
            <Select
              items={timeOptions}
              value={selectedTime}
              onValueChange={(val) => {
                if (val) setSelectedTime(val);
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih snapshot" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <AsyncBoundary
        isLoading={spatialQuery.isLoading}
        isError={spatialQuery.isError}
        error={spatialQuery.error}
        isEmpty={!spatialQuery.isLoading && !spatialQuery.isError && displayData.length === 0}
        onRetry={() => void spatialQuery.refetch()}
      >
        {activeProvinceItem && (
          <>
            {/* Main Map or Table Container */}
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl bg-card mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div>
                  <h2 className="type-subheading font-bold text-foreground">
                    {viewMode === "map"
                      ? "Peta Sebaran Harga Antarwilayah"
                      : "Tabel Peringkat Harga Antarwilayah"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sumber resmi PIHPS Bank Indonesia (Pasar Tradisional Medium I) di 34 provinsi.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/40">
                    {selectedCoverage}
                  </Badge>
                  <Popover>
                    <PopoverTrigger
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      aria-label="Penjelasan Sumber Data Peta"
                    >
                      <Info className="w-4 h-4" />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                      <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                        Metodologi Sebaran Wilayah
                      </PopoverTitle>
                      <PopoverDescription className="text-muted-foreground text-xs leading-relaxed">
                        Menampilkan perbandingan harga antarprovinsi terhadap harga tengah nasional menggunakan gradasi warna berpusat di 0%.
                      </PopoverDescription>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {viewMode === "map" ? (
                <div>
                  <IndonesiaSvgMap
                    data={displayData}
                    selectedProvince={selectedProvince}
                    onSelectProvince={(prov) => setSelectedProvince(prov)}
                  />
                </div>
              ) : (
                <ProvincialTable
                  data={displayData}
                  selectedProvince={selectedProvince}
                  onSelectProvince={(prov) => setSelectedProvince(prov)}
                />
              )}

              {/* 3 Summary Metrics */}
              <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-4 rounded-lg bg-muted/40 border border-border/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <p className="text-xs font-bold tracking-wider">
                      Harga Terendah ({minPriceItem?.grainType})
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{minPriceItem?.province}</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-display tabular-nums">
                    {formatRupiah(minPriceItem?.price || 0)}
                    <span className="text-xs font-normal text-muted-foreground">/kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deviasi: {minPriceItem?.percentageDiff.toFixed(2)}% dari median nasional
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/40 border border-border/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <p className="text-xs font-bold tracking-wider">
                      Harga Tertinggi ({maxPriceItem?.grainType})
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{maxPriceItem?.province}</p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-400 font-display tabular-nums">
                    {formatRupiah(maxPriceItem?.price || 0)}
                    <span className="text-xs font-normal text-muted-foreground">/kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deviasi: +{maxPriceItem?.percentageDiff.toFixed(2)}% di atas median
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/40 border border-border/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <p className="text-xs font-bold tracking-wider text-muted-foreground">
                      Rentang Disparitas Nasional
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    Selisih Titik Terendah vs Tertinggi
                  </p>
                  <p className="text-2xl font-black text-foreground font-display tabular-nums">
                    {disparityPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Berasosiasi dengan neraca pasokan, struktur pasar grosir, &amp; kondisi cuaca daerah
                  </p>
                </div>
              </div>
            </Card>

            {/* Selected Province Context & Dynamic Regional Price Factors */}
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Wilayah Terpilih
                    </span>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {activeProvinceItem.province}
                    </Badge>
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mt-1">
                    Konteks Harga &amp; Faktor Pendorong di {activeProvinceItem.province}
                  </h3>
                </div>
                <Popover>
                  <PopoverTrigger
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                    aria-label="Penjelasan Faktor Penjelas Disparitas"
                  >
                    <Info className="w-4 h-4" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                    <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                      Faktor Penjelas Perbedaan Harga
                    </PopoverTitle>
                    <PopoverDescription className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                      <p>
                        Nilai dampak dihitung dinamis dari data pasokan daerah BPS, selisih harga pasar grosir, kondisi cuaca, serta acuan HPP terhadap perbedaan harga dari nilai tengah nasional.
                      </p>
                      <p className="pt-1.5 border-t border-border/50 text-[11px]">
                        Hasil mencerminkan gambaran keterkaitan data pasar, bukan bukti sebab-akibat mutlak.
                      </p>
                    </PopoverDescription>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Dynamic Price Drivers Table */}
                <div className="lg:col-span-8 space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2 font-display">
                      <span>Faktor Penjelas Perbedaan Harga Regional</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Kontribusi neraca pasokan daerah, pasar grosir, kondisi cuaca, dan sentra produsen terhadap selisih harga di {activeProvinceItem.province} dibanding harga tengah nasional.
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-border/80 rounded-lg bg-background">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60">
                        <tr className="border-b border-border/80 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="p-3">Faktor Pengaruh</th>
                          <th className="p-3">Kondisi Data Terkini</th>
                          <th className="p-3 text-right">Pengaruh Terhadap Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {activeFactors.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-muted-foreground">
                              Rincian faktor penjelas belum tersedia untuk wilayah ini.
                            </td>
                          </tr>
                        ) : (
                          activeFactors.map((sf, idx) => {
                            const isUp = sf.impactRp > 0;
                            const isDown = sf.impactRp < 0;
                            return (
                              <tr key={idx}>
                                <td className="p-3 font-semibold text-foreground">{sf.variable}</td>
                                <td className="p-3 text-muted-foreground tabular-nums text-xs">
                                  {sf.condition}
                                </td>
                                <td
                                  className={`p-3 text-right font-bold tabular-nums ${
                                    isUp
                                      ? "text-amber-700 dark:text-amber-400"
                                      : isDown
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {isUp
                                    ? `+Rp${sf.impactRp}`
                                    : isDown
                                      ? `-Rp${Math.abs(sf.impactRp)}`
                                      : "Rp0"}
                                  /kg ({sf.direction})
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sidebar Summary Card */}
                <div className="lg:col-span-4 space-y-4 p-5 rounded-lg bg-card border border-border/70 shadow-xs">
                  <div>
                    <span className="text-xs font-semibold text-primary block">
                      Ringkasan Wilayah
                    </span>
                    <h3 className="type-subheading text-foreground font-bold mt-0.5">
                      {activeProvinceItem.province}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">
                        Harga Acuan ({activeProvinceItem.grainType}):
                      </span>
                      <span className="font-bold text-foreground text-sm tabular-nums">
                        {formatRupiah(activeProvinceItem.price)}/kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">Median Acuan Nasional:</span>
                      <span className="font-bold text-foreground text-sm tabular-nums">
                        {formatRupiah(activeProvinceItem.medianPrice)}/kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">Deviasi vs Median:</span>
                      <span
                        className={`font-black text-sm tabular-nums ${
                          activeProvinceItem.percentageDiff < 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {activeProvinceItem.percentageDiff > 0
                          ? `+${activeProvinceItem.percentageDiff.toFixed(2)}%`
                          : `${activeProvinceItem.percentageDiff.toFixed(2)}%`}
                      </span>
                    </div>
                    {activeProvinceItem.surplusRatio !== undefined && (
                      <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                        <span className="text-muted-foreground">Neraca Surplus/Defisit BPS:</span>
                        <span className="font-semibold text-foreground text-xs tabular-nums">
                          {activeProvinceItem.surplusRatio.toFixed(2)}x konsumsi
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-muted-foreground">Pekan Observasi PIHPS:</span>
                      <span className="font-semibold text-foreground text-xs tabular-nums">
                        {activeProvinceItem.sampleCount} pekan
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      size="sm"
                      className="w-full text-xs font-bold justify-between cursor-pointer rounded-lg"
                      render={<Link href="/pembeli/katalog" />}
                    >
                      <span>
                        {isMobile
                          ? `Cari di ${activeProvinceItem.province}`
                          : `Cari Pasokan di ${activeProvinceItem.province}`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold justify-between cursor-pointer rounded-lg"
                      render={<Link href="/petani/jual" />}
                    >
                      <span>{isMobile ? "Jual Gabah" : "Jual Gabah di Wilayah Ini"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </AsyncBoundary>
    </PageContainer>
  );
}
