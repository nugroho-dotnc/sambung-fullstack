"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminTableScroll } from "@/features/admin/components/admin-table-scroll";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
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
import { Search } from "lucide-react";

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
      <AdminPageHeader
        section="Pemantauan Pasokan"
        title="Pemantauan Pasokan Gabah Terdaftar"
        description="Daftar seluruh pasokan panen yang terdaftar di SAMBUNG beserta volume yang sedang dicadangkan otomatis agar tidak dipesan ganda dan harga minta petani."
      />

      {/* Table Container with Integrated Toolbar (Gestalt Common Region) */}
      <Card className="rounded-2xl p-0 gap-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-bold text-foreground">
              Daftar Pasokan Gabah Terdaftar
            </h2>
            <span
              aria-live="polite"
              className="text-xs font-semibold text-price-caution tabular-nums"
            >
              Total {filteredOffers.length} entri
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <label htmlFor="admin-catalog-search" className="sr-only">
                Cari petani, kabupaten, atau ID tawaran
              </label>
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admin-catalog-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari petani, kabupaten, atau ID..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              />
            </div>

            <Select
              items={COMMODITY_FILTER_OPTIONS}
              value={commodityFilter}
              onValueChange={(val) => {
                if (val) setCommodityFilter(val);
              }}
            >
              <SelectTrigger
                aria-label="Filter jenis komoditas"
                className="h-10 min-w-48 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground"
              >
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

        <AdminTableScroll label="Daftar pasokan gabah">
          <table className="admin-table w-full text-left border-collapse text-[13px]">
            <caption className="sr-only">
              Daftar pasokan gabah terdaftar beserta volume kuota, volume tersedia, volume dicadangkan, dan harga minta
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">ID &amp; Tanggal</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Petani / Poktan</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Lokasi Panen</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Komoditas</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Total Kuota</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Tersedia</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Dicadangkan</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Harga Minta</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableRowsSkeleton columns={9} />
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-xs text-muted-foreground">
                    Tidak ditemukan data tawaran pasokan.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                      <span className="font-bold text-foreground">#{offer.id}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {offer.availableOn || "Tersedia langsung"}
                      </p>
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-foreground whitespace-nowrap">
                      {offer.farmerName}
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground whitespace-nowrap text-xs">
                      Kec. {offer.district}, Kab. {offer.regency}
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-foreground">
                        {offer.quality !== null && offer.quality !== undefined
                          ? `${offer.grainType} (${offer.quality}%)`
                          : offer.grainType}
                      </span>
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-semibold text-foreground whitespace-nowrap tabular-nums">
                      {(offer.totalVolumeKg || 0).toLocaleString("id-ID")} kg
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-primary whitespace-nowrap tabular-nums">
                      {(offer.availableVolumeKg || 0).toLocaleString("id-ID")} kg
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-price-caution whitespace-nowrap tabular-nums">
                      {(offer.reservedVolumeKg || 0).toLocaleString("id-ID")} kg
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-foreground whitespace-nowrap tabular-nums">
                      {formatRupiah(offer.askPrice)}
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          offer.status === "published"
                            ? "status-success"
                            : "bg-muted text-foreground border-transparent"
                        }`}
                      >
                        {offer.status === "published" ? "Terbit" : offer.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </PageContainer>
  );
}
