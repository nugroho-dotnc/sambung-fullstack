"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useOffers } from "@/features/offers/hooks/use-offers";
import { Search, ShoppingBag } from "lucide-react";

const COMMODITY_FILTER_OPTIONS = [
  { value: "all", label: "Semua Komoditas" },
  { value: "GKP", label: "GKP (Gabah Kering Panen)" },
  { value: "GKG", label: "GKG (Gabah Kering Giling)" },
];

export default function AdminCatalogPage() {
  const { data: offers, isLoading } = useOffers();
  const [searchQuery, setSearchQuery] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("all");

  const filteredOffers = useMemo(() => {
    let list = offers || [];

    if (commodityFilter !== "all") {
      list = list.filter((o) => o.grainType === commodityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.farmerName?.toLowerCase().includes(q) ||
          o.regency?.toLowerCase().includes(q) ||
          o.district?.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
      );
    }

    return list;
  }, [offers, commodityFilter, searchQuery]);

  return (
    <PageContainer>
      {/* Header & Breadcrumb */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
        >
          <Link href="/admin" className="hover:text-foreground font-semibold">
            Pengawas Sistem
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">Pemantauan Pasokan</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Pemantauan Pasokan Gabah Terdaftar
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Daftar seluruh pasokan panen yang terdaftar di SAMBUNG beserta volume yang sedang dicadangkan otomatis agar tidak dipesan ganda dan harga minta petani.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shrink-0">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="tabular-nums font-bold">
              {filteredOffers.length} Tawaran Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari petani, kabupaten, atau ID tawaran..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            items={COMMODITY_FILTER_OPTIONS}
            value={commodityFilter}
            onValueChange={(val) => {
              if (val) setCommodityFilter(val);
            }}
          >
            <SelectTrigger className="h-10 min-w-48 px-3 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground shadow-2xs">
              <SelectValue placeholder="Pilih komoditas" />
            </SelectTrigger>
            <SelectContent>
              {COMMODITY_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Container */}
      <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card">
        <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">
            Daftar Pasokan Gabah Terdaftar
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            Total {filteredOffers.length} entri
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">ID & Tanggal</th>
                <th className="py-3 px-5">Petani / Poktan</th>
                <th className="py-3 px-5">Lokasi Panen</th>
                <th className="py-3 px-5">Komoditas</th>
                <th className="py-3 px-5 text-right">Total Kuota</th>
                <th className="py-3 px-5 text-right">Tersedia</th>
                <th className="py-3 px-5 text-right">Dicadangkan</th>
                <th className="py-3 px-5 text-right">Harga Minta</th>
                <th className="py-3 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <TableRowsSkeleton columns={9} />
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ditemukan data tawaran pasokan.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                      <span className="font-bold text-foreground">#{offer.id}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {offer.availableOn || "Tersedia langsung"}
                      </p>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-foreground whitespace-nowrap">
                      {offer.farmerName}
                    </td>
                    <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap text-xs">
                      Kec. {offer.district}, Kab. {offer.regency}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60">
                        {offer.quality !== null && offer.quality !== undefined
                          ? `${offer.grainType} (${offer.quality}%)`
                          : offer.grainType}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-foreground whitespace-nowrap tabular-nums">
                      {(offer.totalVolumeKg || 0).toLocaleString("id-ID")} kg
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                      {(offer.availableVolumeKg || 0).toLocaleString("id-ID")} kg
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap tabular-nums">
                      {(offer.reservedVolumeKg || 0).toLocaleString("id-ID")} kg
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-primary whitespace-nowrap tabular-nums">
                      {formatRupiah(offer.askPrice)}
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <Badge
                        variant={offer.status === "published" ? "default" : "secondary"}
                        className="text-xs font-bold uppercase"
                      >
                        {offer.status === "published" ? "Terbit" : offer.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
