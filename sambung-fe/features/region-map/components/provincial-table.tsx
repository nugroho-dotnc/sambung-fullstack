"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { ProvincialPriceComparison } from "../domain/map-types";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import {
  canUserExportCsv,
  canUserUpgradeToPro,
} from "@/features/subscription/domain/permissions";
import { Search, Download, ArrowUpDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProvincialTableProps {
  data: ProvincialPriceComparison[];
  selectedProvince?: string;
  onSelectProvince?: (province: string) => void;
}

type SortField = "province" | "price" | "percentageDiff" | "sampleCount";
type SortOrder = "asc" | "desc";

export function ProvincialTable({
  data,
  selectedProvince,
  onSelectProvince,
}: ProvincialTableProps) {
  const { data: user } = useCurrentUser();
  const canExportCsv = canUserExportCsv(user);
  const canUpgradeToPro = canUserUpgradeToPro(user);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("percentageDiff");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const filteredAndSortedData = useMemo(() => {
    const result = data.filter((item) =>
      item.province.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "province") {
        comparison = a.province.localeCompare(b.province);
      } else if (sortField === "price") {
        comparison = a.price - b.price;
      } else if (sortField === "percentageDiff") {
        comparison = a.percentageDiff - b.percentageDiff;
      } else if (sortField === "sampleCount") {
        comparison = a.sampleCount - b.sampleCount;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [data, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExportCsv = () => {
    if (!canExportCsv || filteredAndSortedData.length === 0) return;
    const headers = [
      "Provinsi",
      "Komoditas",
      "Harga Acuan (Rp/kg)",
      "Median Nasional (Rp/kg)",
      "Deviasi Persentase (%)",
      "Jumlah Titik Sampel",
      "Kategori",
    ];

    const rows = filteredAndSortedData.map((item) => [
      `"${item.province}"`,
      `"${item.grainType}"`,
      item.price,
      item.medianPrice,
      item.percentageDiff.toFixed(2),
      item.sampleCount,
      `"${item.percentageDiff < -3.5 ? "Surplus / Rendah" : item.percentageDiff > 5 ? "Defisit / Tinggi" : "Normal"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `disparitas-harga-provinsi-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari provinsi..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {canExportCsv ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={filteredAndSortedData.length === 0}
              onClick={handleExportCsv}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Unduh CSV</span>
            </Button>
          ) : canUpgradeToPro ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/langganan" />}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Unduh CSV (Pro)</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title="Fitur ekspor CSV hanya tersedia untuk akun Pembeli Pro dan Pengawas."
              className="text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>Unduh CSV (Pro)</span>
            </Button>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredAndSortedData.length} provinsi
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-border/80 rounded-2xl bg-card shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60 border-b border-border/80">
            <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="p-3.5 w-12 text-center">No</th>
              <th
                className="p-3.5 cursor-pointer hover:text-foreground select-none"
                onClick={() => toggleSort("province")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Provinsi</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="p-3.5 text-right cursor-pointer hover:text-foreground select-none"
                onClick={() => toggleSort("price")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Harga Rata-rata</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="p-3.5 text-right cursor-pointer hover:text-foreground select-none"
                onClick={() => toggleSort("percentageDiff")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Selisih vs Median</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3.5 text-center">Status Wilayah</th>
              <th
                className="p-3.5 text-right cursor-pointer hover:text-foreground select-none hidden md:table-cell"
                onClick={() => toggleSort("sampleCount")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Titik Sampel</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                  Tidak ditemukan provinsi dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((item, index) => {
                const isSelected =
                  selectedProvince?.toLowerCase() === item.province.toLowerCase();

                return (
                  <tr
                    key={item.province}
                    onClick={() => onSelectProvince?.(item.province)}
                    className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10"
                        : ""
                    }`}
                  >
                    <td className="p-3.5 text-center text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </td>
                    <td className="p-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span>{item.province}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-bold text-foreground tabular-nums">
                      {formatRupiah(item.price)}
                      <span className="text-xs font-normal text-muted-foreground">
                        /kg
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold tabular-nums">
                      <span
                        className={
                          item.percentageDiff < 0
                            ? "text-primary"
                            : item.percentageDiff > 0
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }
                      >
                        {item.percentageDiff > 0
                          ? `+${item.percentageDiff.toFixed(2)}%`
                          : `${item.percentageDiff.toFixed(2)}%`}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          item.percentageDiff < -3.5
                            ? "bg-primary/15 text-primary"
                            : item.percentageDiff > 5.0
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                            : item.percentageDiff > 1.5
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {item.percentageDiff < -3.5
                          ? "Surplus (Murah)"
                          : item.percentageDiff > 5.0
                          ? "Defisit Tinggi"
                          : item.percentageDiff > 1.5
                          ? "Diatas Rata-rata"
                          : "Seimbang / Normal"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {item.sampleCount} titik
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
