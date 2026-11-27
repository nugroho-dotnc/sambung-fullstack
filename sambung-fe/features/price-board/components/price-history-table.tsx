"use client";

import Link from "next/link";
import { memo, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Lock,
  MoreHorizontal,
  Sparkles,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import {
  generatePriceHistoryCsv,
  type PriceHistoryRow,
} from "../domain/price-chain";
import type {
  PriceHistoryRange,
  PriceHistoryResponse,
  PriceHistoryStatusFilter,
} from "../services/price-board.service";

interface PriceHistoryTableProps {
  region: string;
  range: PriceHistoryRange;
  statusFilter: PriceHistoryStatusFilter;
  onStatusFilterChange: (next: PriceHistoryStatusFilter) => void;
  canExportCsv?: boolean;
  canUpgradeToPro?: boolean;
  data?: PriceHistoryResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

const STATUS_OPTIONS: Array<{ value: PriceHistoryStatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "actual", label: "Aktual" },
  { value: "predicted", label: "Prediksi AI" },
];

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis-left" | "ellipsis-right"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = 4;
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  if (start > 2) items.push("ellipsis-left");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis-right");
  items.push(totalPages);
  return items;
}

function renderStatusBadge(row: PriceHistoryRow) {
  if (row.rowStatus === "predicted") {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60">
          <Sparkles className="w-3 h-3 shrink-0" />
          Prediksi AI (+{row.predictionHorizonWeeks ?? 2}w)
        </span>
        {row.predictionMethod && (
          <span className="block text-[10px] text-muted-foreground">
            {row.predictionMethod}
          </span>
        )}
      </div>
    );
  }

  if (row.rowStatus === "actual_with_prediction") {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/70 dark:border-blue-800/60">
          <Database className="w-3 h-3 shrink-0" />
          Aktual + Prediksi
        </span>
        <span className="block text-[10px] text-muted-foreground">
          {row.source === "admin_ingest" ? "Observasi Admin" : "PIHPS BI"}
        </span>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800/60">
      <Database className="w-3 h-3 shrink-0" />
      {row.source === "admin_ingest" ? "Observasi Admin" : "Aktual PIHPS"}
    </span>
  );
}

function renderDelta(deltaRp: number | null, deltaPct: number | null) {
  if (deltaRp === null || deltaRp === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="w-2.5 h-2.5" />
        Stabil
      </span>
    );
  }
  const isUp = deltaRp > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${
        isUp
          ? "text-amber-700 dark:text-amber-400"
          : "text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {isUp ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {isUp ? `+${formatRupiah(deltaRp)}` : formatRupiah(deltaRp)}
      {deltaPct !== null ? ` (${isUp ? "+" : ""}${deltaPct}%)` : ""}
    </span>
  );
}

export const PriceHistoryTable = memo(function PriceHistoryTable({
  region,
  range,
  statusFilter,
  onStatusFilterChange,
  canExportCsv = false,
  canUpgradeToPro = false,
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: PriceHistoryTableProps) {
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const filterKey = `${region}|${range}|${statusFilter}|${pageSize}`;
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: filterKey,
    page: 1,
  });

  const filteredChronologicalRows = useMemo(() => {
    const raw = data?.rows ?? [];
    if (statusFilter === "actual") {
      return raw.filter(
        (row) =>
          row.rowStatus === "actual" ||
          row.rowStatus === "actual_with_prediction",
      );
    }
    if (statusFilter === "predicted") {
      return raw.filter(
        (row) =>
          row.rowStatus === "predicted" ||
          row.rowStatus === "actual_with_prediction",
      );
    }
    return raw;
  }, [data?.rows, statusFilter]);

  const displayRows = useMemo(
    () => [...filteredChronologicalRows].reverse(),
    [filteredChronologicalRows],
  );

  const totalRows = displayRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const rawPage = pageState.key === filterKey ? pageState.page : 1;
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);

  const paginatedRows = useMemo(
    () => displayRows.slice(startIdx, endIdx),
    [displayRows, startIdx, endIdx],
  );

  const pageItems = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function goToPage(nextPage: number) {
    setPageState({
      key: filterKey,
      page: Math.min(Math.max(1, nextPage), totalPages),
    });
  }

  function handleExportCsv() {
    if (!canExportCsv || !filteredChronologicalRows.length) return;
    const csv = generatePriceHistoryCsv(region, filteredChronologicalRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeRegion = region.replace(/\s+/g, "_");
    link.setAttribute(
      "download",
      `SAMBUNG_Riwayat_Harga_${safeRegion}_${range}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-6 sm:p-7 space-y-4 rounded-2xl bg-card">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <span className="text-xs font-semibold text-primary">
            Arsip Historis &amp; Prakiraan Berkelanjutan
          </span>
          <h2 className="type-subheading text-foreground font-bold mt-0.5">
            Tabel Riwayat Harga Mingguan PIHPS BI (2019 – Sekarang)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Komoditas Beras Medium I di {region}. Baris pekan baru sesudah data aktual terakhir diisi prediksi resmi model Sambung Predict.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-1 gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusFilterChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === opt.value
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground tabular-nums font-semibold">
            {totalRows.toLocaleString("id-ID")} pekan
          </span>

          {canExportCsv ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 text-xs font-semibold gap-1.5 cursor-pointer"
              disabled={!filteredChronologicalRows.length}
              onClick={handleExportCsv}
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              Unduh CSV Riwayat
            </Button>
          ) : canUpgradeToPro ? (
            <Button
              variant="outline"
              size="sm"
              className="min-h-9 text-xs font-semibold gap-1.5 cursor-pointer"
              nativeButton={false}
              render={<Link href="/langganan" />}
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Unduh CSV (Pro)
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title="Fitur ekspor CSV hanya tersedia untuk akun Pembeli Pro dan Pengawas."
              className="min-h-9 text-xs font-semibold gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              Unduh CSV (Pro)
            </Button>
          )}
        </div>
      </div>

      {data && !data.hasFullHistory && (
        <div className="rounded-xl border border-border/80 bg-muted/35 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5 leading-relaxed">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            Arsip lengkap mingguan 2019–sekarang saat ini aktif untuk{" "}
            <strong className="text-foreground">
              {data.coveredRegions.length > 0
                ? data.coveredRegions.join(", ")
                : "Jawa Timur"}
            </strong>
            . Untuk wilayah {region}, sistem tetap menampilkan prediksi model AI serta pembaruan mingguan yang tercatat di database.
          </span>
        </div>
      )}

      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!isLoading && !isError && totalRows === 0}
        onRetry={onRetry}
        emptyFallback={
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            Belum ada data riwayat maupun prediksi tersimpan untuk kombinasi filter wilayah dan status ini.
          </div>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full min-w-[820px] text-left text-xs border-collapse">
            <thead className="bg-muted/60 border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Pekan</th>
                <th className="py-3 px-4 text-right">Petani (Setara Beras)</th>
                <th className="py-3 px-4 text-right">Penggilingan</th>
                <th className="py-3 px-4 text-right">Grosir</th>
                <th className="py-3 px-4 text-right">Eceran Konsumen</th>
                <th className="py-3 px-4 text-right">Prediksi AI (Penggilingan)</th>
                <th className="py-3 px-4 text-right">Farmer&apos;s Share</th>
                <th className="py-3 px-4">Status &amp; Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedRows.map((row) => {
                const isPredictedOnly = row.rowStatus === "predicted";
                const farmerDisplay = isPredictedOnly
                  ? row.predictedFarmerPrice
                  : row.farmerPrice;
                const millerDisplay = row.millerPrice;

                return (
                  <tr
                    key={row.weekStart}
                    className={`transition-colors hover:bg-muted/35 ${
                      isPredictedOnly
                        ? "bg-amber-50/40 dark:bg-amber-950/15"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-foreground block">
                        {row.weekLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {row.weekStart}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      {farmerDisplay !== null ? (
                        <div>
                          <span
                            className={`font-semibold ${
                              isPredictedOnly
                                ? "text-amber-800 dark:text-amber-300"
                                : "text-foreground"
                            }`}
                          >
                            {formatRupiah(farmerDisplay)}
                          </span>
                          {isPredictedOnly && (
                            <span className="block text-[10px] text-muted-foreground">
                              Estimasi model
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      {millerDisplay !== null ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">
                            {formatRupiah(millerDisplay)}
                          </span>
                          {renderDelta(row.millerChangeRp, row.millerChangePct)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      {row.wholesalePrice !== null ? (
                        <span className="font-medium text-foreground">
                          {formatRupiah(row.wholesalePrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      {row.retailPrice !== null ? (
                        <span className="font-medium text-foreground">
                          {formatRupiah(row.retailPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      {row.predictedMillerPrice !== null ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-amber-800 dark:text-amber-300 block">
                            {formatRupiah(row.predictedMillerPrice)}
                          </span>
                          {row.predictionLower80 !== null &&
                            row.predictionUpper80 !== null && (
                              <span className="block text-[10px] text-muted-foreground">
                                [{formatRupiah(row.predictionLower80)} –{" "}
                                {formatRupiah(row.predictionUpper80)}]
                              </span>
                            )}
                          {row.predictionErrorRp !== null && (
                            <span className="block text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                              Selisih:{" "}
                              {row.predictionErrorRp > 0
                                ? `+${formatRupiah(row.predictionErrorRp)}`
                                : row.predictionErrorRp === 0
                                ? "Tepat Rp0"
                                : formatRupiah(row.predictionErrorRp)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      {row.farmerSharePercent !== null ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {row.farmerSharePercent}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusBadge(row)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              Menampilkan{" "}
              <strong className="text-foreground">
                {totalRows > 0 ? (startIdx + 1).toLocaleString("id-ID") : 0}–
                {endIdx.toLocaleString("id-ID")}
              </strong>{" "}
              dari{" "}
              <strong className="text-foreground">
                {totalRows.toLocaleString("id-ID")}
              </strong>{" "}
              pekan
            </span>

            <div className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1">
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPageSize(opt)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                    pageSize === opt
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
              <span className="px-1.5 text-[11px]">/ halaman</span>
            </div>
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Navigasi halaman tabel riwayat harga"
              className="flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>

              <span className="sm:hidden px-2 text-xs font-semibold tabular-nums text-muted-foreground">
                Hal. {currentPage} / {totalPages}
              </span>

              <div className="hidden sm:flex items-center gap-1">
                {pageItems.map((item) =>
                  typeof item === "string" ? (
                    <span
                      key={item}
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </span>
                  ) : (
                    <Button
                      key={`page-${item}`}
                      type="button"
                      variant={item === currentPage ? "default" : "outline"}
                      size="sm"
                      className="min-w-8 h-8 px-2 text-xs font-semibold tabular-nums cursor-pointer"
                      aria-current={item === currentPage ? "page" : undefined}
                      aria-label={`Halaman ${item}`}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </Button>
                  ),
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                aria-label="Halaman berikutnya"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </nav>
          )}
        </div>
      </AsyncBoundary>
    </Card>
  );
});
