"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Wheat,
  MapPin,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { PriceReferenceService, evaluatePriceLight } from "@/features/price-check";
import { useMobile } from "@/hooks/use-mobile";
import type { CatalogItem } from "@/features/catalog/schemas";

const REGENCY_OPTIONS = [
  { value: "Semua", label: "Semua Kabupaten" },
  { value: "Subang", label: "Kabupaten Subang" },
  { value: "Karawang", label: "Kabupaten Karawang" },
  { value: "Indramayu", label: "Kabupaten Indramayu" },
];

const GRAIN_TAB_OPTIONS = [
  { value: "ALL", label: "Semua Komoditas" },
  { value: "GKP", label: "Gabah Kering Panen (GKP)" },
  { value: "GKG", label: "Gabah Kering Giling (GKG)" },
];

export default function BuyerCatalogPage() {
  const isMobile = useMobile();
  const [selectedGrain, setSelectedGrain] = useState<"ALL" | "GKP" | "GKG">("ALL");
  const [selectedRegency, setSelectedRegency] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: items = [], isLoading, isError, error, refetch } = useCatalog();

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedGrain !== "ALL" && item.grainType !== selectedGrain) return false;
      if (selectedRegency !== "Semua" && item.regency !== selectedRegency) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.farmerName || "").toLowerCase().includes(q);
        const matchesBusiness = (item.farmerBusiness || "").toLowerCase().includes(q);
        const matchesDistrict = (item.district || item.districtId || "").toLowerCase().includes(q);
        return matchesName || matchesBusiness || matchesDistrict;
      }

      return true;
    });
  }, [items, selectedGrain, selectedRegency, searchQuery]);

  // Aggregate supply summary
  const totalAvailableKg = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + curr.availableVolumeKg, 0);
  }, [filteredItems]);

  // CSV Export Function (PR-07)
  function handleExportCsv() {
    if (filteredItems.length === 0) return;

    const headers = [
      "ID Pasokan",
      "Komoditas",
      "Kelompok Tani / Petani",
      "Kecamatan",
      "Kabupaten",
      "Volume Tersedia (kg)",
      "Harga Minta (Rp/kg)",
      "Estimasi Tanggal Panen",
    ];

    const rows = filteredItems.map((item) => [
      item.id,
      item.grainType,
      item.farmerBusiness || item.farmerName || "Petani",
      item.district || item.districtId,
      item.regency || "Subang",
      item.availableVolumeKg,
      item.askPrice,
      item.availableOn || "Langsung",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `rekap-pasokan-gabah-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Katalog Pasokan Gabah Petani"
        description="Jelajahi ketersediaan pasokan panen riil langsung dari petani dan kelompok tani mitra terdaftar."
        actions={
          <Button
            variant="outline"
            className="min-h-10 text-xs gap-1.5"
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Rekap Pasokan (CSV)
          </Button>
        }
      />

      {/* Aggregate Volume Header Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Wheat className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Pasokan Siap Dipesan
            </span>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {totalAvailableKg.toLocaleString("id-ID")}{" "}
              <span className="text-sm font-normal text-muted-foreground font-sans">
                kg ({(totalAvailableKg / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} ton)
              </span>
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Komitmen pasokan langsung dari petani di wilayah Jawa Barat.</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Mobile Filter: Select Dropdown */}
          <div className="sm:hidden w-full">
            <Select
              items={GRAIN_TAB_OPTIONS}
              value={selectedGrain}
              onValueChange={(val) => {
                if (val) setSelectedGrain(val as "ALL" | "GKP" | "GKG");
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium shadow-2xs">
                <SelectValue placeholder="Pilih komoditas" />
              </SelectTrigger>
              <SelectContent>
                {GRAIN_TAB_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tablet & Desktop: Tabs */}
          <Tabs
            value={selectedGrain}
            onValueChange={(val) => setSelectedGrain(val as "ALL" | "GKP" | "GKG")}
            className="hidden sm:block w-full sm:w-auto"
          >
            <TabsList className="bg-muted/80 p-1 rounded-xl h-auto flex flex-wrap gap-1">
              <TabsTrigger value="ALL" className="px-3 text-xs rounded-lg">
                Semua Komoditas
              </TabsTrigger>
              <TabsTrigger value="GKP" className="px-3 text-xs rounded-lg">
                Gabah Kering Panen (GKP)
              </TabsTrigger>
              <TabsTrigger value="GKG" className="px-3 text-xs rounded-lg">
                Gabah Kering Giling (GKG)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select
              items={REGENCY_OPTIONS}
              value={selectedRegency}
              onValueChange={(val) => {
                if (val) setSelectedRegency(val);
              }}
            >
              <SelectTrigger className="w-full sm:w-auto h-10 min-w-44 rounded-xl border border-input bg-background px-3 text-xs shadow-2xs">
                <SelectValue placeholder="Pilih kabupaten" />
              </SelectTrigger>
              <SelectContent>
                {REGENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari petani, poktan, kecamatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Cards Grid */}
      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={filteredItems.length === 0}
        emptyFallback={
          <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3 my-4">
            <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Wheat className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Belum Ada Pasokan yang Sesuai
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Tidak ditemukan pasokan gabah untuk filter atau kata kunci pencarian Anda. Coba sesuaikan pilihan komoditas atau wilayah.
            </p>
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const priceRef = PriceReferenceService.getReference(
              item.grainType,
              item.regency || "Subang"
            );
            const evaluation = evaluatePriceLight({
              price: item.askPrice,
              lowerBound: priceRef.lowerBound,
              upperBound: priceRef.upperBound,
            });

            return (
              <Card
                key={item.id}
                className="rounded-2xl border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      Gabah {item.grainType}
                    </span>

                    {/* Friendly Copywriting Badge with Tooltip Notice */}
                    <div
                      className="group relative flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full cursor-help"
                      title="Data pasokan ini dicatat langsung oleh petani berdasarkan hasil panen di lapangan, bukan stok fisik di gudang aplikasi."
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Penawaran Petani</span>
                    </div>
                  </div>

                  {/* Title & Farmer Info */}
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      {item.farmerBusiness || item.farmerName}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Kec. {item.district || item.districtId}, {item.regency || "Subang"}
                        {item.notes?.match(/^\[Lokasi:\s*([^\]]+)\]/) && ` · ${item.notes.match(/^\[Lokasi:\s*([^\]]+)\]/)?.[1].trim()}`}
                      </span>
                    </p>
                  </div>

                  {/* Price & Value Details */}
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Harga Minta</span>
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {formatRupiah(item.askPrice)}{" "}
                        <span className="text-xs font-normal text-muted-foreground font-sans">
                          / kg
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Status Harga:</span>
                      <span
                        className={`font-semibold ${
                          evaluation.status === "HIJAU"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {evaluation.label}
                      </span>
                    </div>
                  </div>

                  {/* Volume Availability */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between tabular-nums">
                      <span className="text-muted-foreground">Tersedia untuk dipesan:</span>
                      <strong className="text-foreground">
                        {item.availableVolumeKg.toLocaleString("id-ID")} kg
                      </strong>
                    </div>
                    {item.availableOn && (
                      <div className="flex justify-between text-muted-foreground text-xs">
                        <span>Perkiraan panen:</span>
                        <span>
                          {new Date(item.availableOn).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-3 border-t border-border/60">
                  <Button
                    className="w-full min-h-10 text-xs font-semibold justify-between"
                    render={
                      <Link href={`/pembeli/katalog/${item.id}`}>
                        {isMobile ? "Pesan Pasokan" : "Pesan Pasokan Ini"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    }
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </AsyncBoundary>
    </PageContainer>
  );
}
