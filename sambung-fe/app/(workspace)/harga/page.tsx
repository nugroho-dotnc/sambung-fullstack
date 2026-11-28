"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
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
import { ApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { ProUpgradeBanner } from "@/features/subscription/components/pro-upgrade-banner";
import {
  canUserExportCsv,
  canUserUpgradeToPro,
} from "@/features/subscription/domain/permissions";
import {
  PRICE_HISTORY_RANGE_OPTIONS,
  mapHistoryRangeToBoardPeriod,
  type PriceHistoryRange,
  type PriceHistoryStatusFilter,
} from "@/features/price-board/services/price-board.service";
import {
  usePriceBoard,
  usePriceHistory,
} from "@/features/price-board/hooks/use-price-board";
import type { HistoricalTrendPoint } from "@/features/price-board/domain/price-chain";
import { PriceChainChart } from "@/features/price-board/components/price-chain-chart";
import { PriceHistoryTable } from "@/features/price-board/components/price-history-table";

const FREE_BUYER_HISTORY_RANGES = new Set<PriceHistoryRange>(["4w", "8w", "12w"]);

export default function PriceBoardPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const isFreeBuyer = user?.role === "pembeli" && !user?.isPro;

  const [region, setRegion] = useState<string>("Jawa Timur");
  const [range, setRange] = useState<PriceHistoryRange>("12w");
  const [statusFilter, setStatusFilter] = useState<PriceHistoryStatusFilter>("all");
  const [showProUpgradeNotice, setShowProUpgradeNotice] = useState(false);

  const effectiveRange: PriceHistoryRange =
    isFreeBuyer && !FREE_BUYER_HISTORY_RANGES.has(range) ? "12w" : range;

  const boardPeriod = mapHistoryRangeToBoardPeriod(effectiveRange);
  const boardQuery = usePriceBoard(region, boardPeriod);
  const historyQuery = usePriceHistory(region, effectiveRange, "all");
  const data = boardQuery.data;
  const availableRegions = data?.availableRegions?.length
    ? data.availableRegions
    : historyQuery.data?.coveredRegions;

  const rangeOptions = useMemo(
    () =>
      PRICE_HISTORY_RANGE_OPTIONS.map((opt) => ({
        value: opt.value,
        label:
          isFreeBuyer && !FREE_BUYER_HISTORY_RANGES.has(opt.value)
            ? `${opt.label} (Pro)`
            : opt.label,
      })),
    [isFreeBuyer],
  );

  const activeRangeLabel = useMemo(
    () =>
      PRICE_HISTORY_RANGE_OPTIONS.find((opt) => opt.value === effectiveRange)?.label ??
      boardPeriod,
    [effectiveRange, boardPeriod],
  );

  const chartData: HistoricalTrendPoint[] = useMemo(() => {
    const historyRows = historyQuery.data?.rows ?? [];
    if (historyRows.length > 0) {
      return historyRows.map((row) => ({
        week: row.weekLabel,
        weekStart: row.weekStart,
        farmerPrice: row.farmerPrice,
        millerPrice: row.millerPrice,
        wholesalePrice: row.wholesalePrice,
        retailPrice: row.retailPrice,
        predictedFarmerPrice: row.predictedFarmerPrice,
        predictedMillerPrice: row.predictedMillerPrice,
        rowStatus: row.rowStatus,
      }));
    }
    return data?.historicalTrends ?? [];
  }, [historyQuery.data?.rows, data?.historicalTrends]);

  const regionOptions = useMemo(() => {
    const rawRegions = availableRegions?.length ? availableRegions : [region];
    const unique = Array.from(new Set(rawRegions)).sort((a, b) => {
      if (a === "Nasional") return -1;
      if (b === "Nasional") return 1;
      return a.localeCompare(b, "id");
    });
    return unique.map((prov) => ({
      value: prov,
      label: prov === "Nasional" ? "Rata-rata Nasional (PIHPS)" : prov,
    }));
  }, [availableRegions, region]);

  return (
    <PageContainer>
      <PageHeader
        title="Papan Rantai Harga 2 Sisi"
        description={`Ikuti pembentukan nilai komoditas Beras Medium I dari petani gabah hingga pasar konsumen eceran di 34 provinsi + Nasional (data PIHPS BI${data?.updatedAt ? ` per ${data.updatedAt}` : ""}).`}
      />

      {/* Filter Bar (3 Columns) */}
      <Card className="p-4 sm:p-5 bg-card rounded-2xl mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Komoditas Acuan Resmi
            </label>
            <div className="w-full h-11 rounded-lg border border-input/70 bg-muted/40 px-3 flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Beras Medium I (PIHPS BI)</span>
              <span className="text-[11px] font-medium text-muted-foreground">Standar</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Wilayah Pembanding (34 Provinsi)
            </label>
            <Combobox
              items={regionOptions}
              value={regionOptions.find((opt) => opt.value === region) ?? null}
              isItemEqualToValue={(item, val) => item.value === val.value}
              itemToStringLabel={(opt) => opt.label}
              onValueChange={(opt) => {
                if (opt) setRegion(opt.value);
              }}
            >
              <ComboboxInput
                placeholder="Pilih atau cari wilayah..."
                className="w-full h-11 rounded-lg bg-background text-xs font-semibold text-foreground"
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
              Rentang Pengamatan
            </label>
            <Select
              items={rangeOptions}
              value={effectiveRange}
              onValueChange={(val) => {
                if (!val) return;
                const next = val as PriceHistoryRange;
                if (isFreeBuyer && !FREE_BUYER_HISTORY_RANGES.has(next)) {
                  setShowProUpgradeNotice(true);
                  return;
                }
                setShowProUpgradeNotice(false);
                setRange(next);
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-lg bg-background px-3 text-xs font-semibold text-foreground">
                <SelectValue placeholder="Pilih rentang" />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isFreeBuyer && showProUpgradeNotice && (
        <div className="mb-8">
          <ProUpgradeBanner
            title="Riwayat Harga Sejak 2019 & Unduh Data Khusus Produsen Pro"
            description="Paket Gratis hanya menampilkan data 4, 8, dan 12 minggu terakhir. Aktifkan Produsen Pro (Rp99.000/30 hari) untuk membuka data 1 tahun hingga arsip sejak 2019 di 35 wilayah serta tombol unduh data (CSV)."
            fromPath="/harga"
          />
        </div>
      )}

      {historyQuery.isError && chartData.length > 0 && (
        historyQuery.error instanceof ApiError &&
        historyQuery.error.code === "SUBSCRIPTION_REQUIRED" ? (
          <div className="mb-6">
            <ProUpgradeBanner
              title="Akses Riwayat & Prakiraan Terbatas pada Paket Gratis"
              description={historyQuery.error.message}
              fromPath="/harga"
            />
          </div>
        ) : (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex flex-wrap items-center justify-between gap-3"
          >
            <span>
              {historyQuery.error?.message ||
                "Riwayat harga mingguan belum dapat dimuat. Grafik menampilkan ringkasan papan harga sementara."}
            </span>
            <button
              type="button"
              onClick={() => void historyQuery.refetch()}
              className="px-3 py-1.5 rounded-lg border border-destructive/40 font-semibold hover:bg-destructive/10 cursor-pointer"
            >
              Coba Muat Ulang
            </button>
          </div>
        )
      )}

      <AsyncBoundary
        isLoading={historyQuery.isLoading || (chartData.length === 0 && boardQuery.isLoading)}
        isError={historyQuery.isError && chartData.length === 0}
        error={historyQuery.error}
        isEmpty={!historyQuery.isLoading && !boardQuery.isLoading && chartData.length === 0}
        onRetry={() => {
          void historyQuery.refetch();
          void boardQuery.refetch();
        }}
      >
        {chartData.length > 0 && (
          <Card className="p-6 sm:p-7 space-y-4 rounded-2xl bg-card mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3.5">
              <div>
                <h2 className="type-subheading text-foreground font-bold">
                  Pergerakan Harga Rantai Pasok ({activeRangeLabel})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transmisi pergerakan harga aktual PIHPS dari tingkat setara petani, penggilingan padi, hingga pasar konsumen di {region} beserta lanjutan garis putus-putus Prediksi AI.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary tabular-nums font-semibold">
                  {chartData.length.toLocaleString("id-ID")} pekan
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground tabular-nums font-semibold">
                  Satuan: Rp/kg
                </span>
                <Popover>
                  <PopoverTrigger
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                    aria-label="Penjelasan Tren Rantai Pasok"
                  >
                    <Info className="w-4 h-4" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 text-xs space-y-2 p-3.5">
                    <PopoverTitle className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                      Tentang Data Historis &amp; Prediksi
                    </PopoverTitle>
                    <PopoverDescription className="text-muted-foreground text-xs leading-relaxed">
                      Grafik memanjang otomatis mengikuti rentang pengamatan yang dipilih (hingga seluruh riwayat 2019–sekarang). Garis putus-putus menandakan titik prakiraan resmi model Sambung Predict.
                    </PopoverDescription>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <PriceChainChart data={chartData} />
          </Card>
        )}
      </AsyncBoundary>

      <PriceHistoryTable
        region={region}
        range={effectiveRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        canExportCsv={Boolean(user) && !isFreeBuyer}
        data={historyQuery.data}
        isLoading={isUserLoading || historyQuery.isLoading}
        isError={historyQuery.isError}
        error={historyQuery.error}
        onRetry={() => void historyQuery.refetch()}
      />
    </PageContainer>
  );
}
