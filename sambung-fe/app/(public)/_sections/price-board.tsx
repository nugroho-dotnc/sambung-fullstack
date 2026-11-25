"use client";

import { useState, useMemo } from "react";
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
import {
  PriceBoardService,
  AVAILABLE_BOARD_REGIONS,
  PRICE_BOARD_META,
} from "@/features/price-board/services/price-board.service";
import type { SupplyChainLevel } from "@/features/price-board/domain/price-chain";

const COMMODITY_OPTIONS = [
  { value: "Beras Medium I", label: "Beras Medium I (Standar PIHPS)" },
  { value: "Beras Premium", label: "Beras Premium (Estimasi)" },
  { value: "Gabah Kering Panen (GKP)", label: "Gabah Kering Panen (GKP)" },
];

const REGION_OPTIONS = AVAILABLE_BOARD_REGIONS.map((prov) => ({
  value: prov,
  label: prov === "Nasional" ? "Rata-rata Nasional (PIHPS)" : prov,
}));

const PERIOD_OPTIONS = [
  { value: "Pekan Berjalan", label: `Pekan Berjalan (${PRICE_BOARD_META.updatedAt})` },
  { value: "Rata-rata 30 Hari", label: "Rata-rata 30 Hari Terakhir" },
];

export default function PriceBoardSection() {
  const [commodity, setCommodity] = useState("Beras Medium I");
  const [region, setRegion] = useState("Jawa Timur");
  const [period, setPeriod] = useState("Pekan Berjalan");

  const comparison = useMemo(() => {
    return PriceBoardService.getSupplyChainComparison(commodity, region, period);
  }, [commodity, region, period]);

  return (
    <section id="rantai-harga" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 scroll-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Transparansi Rantai Pasok
            </span>
            <Badge variant="outline" className="text-xs font-bold">
              PIHPS {PRICE_BOARD_META.updatedAt}
            </Badge>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Transmisi Harga dari Petani hingga Eceran
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pantau pembagian nilai tambah (<em>farmer&apos;s share</em>) dan marjin antar mata rantai gabah dan beras.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Komoditas Acuan
            </label>
            <Select
              items={COMMODITY_OPTIONS}
              value={commodity}
              onValueChange={(val) => {
                if (val) setCommodity(val);
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground shadow-2xs">
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
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Wilayah Pengamatan
            </label>
            <Select
              items={REGION_OPTIONS}
              value={region}
              onValueChange={(val) => {
                if (val) setRegion(val);
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih wilayah" />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Periode Snapshot
            </label>
            <Select
              items={PERIOD_OPTIONS}
              value={period}
              onValueChange={(val) => {
                if (val) setPeriod(val);
              }}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground shadow-2xs">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 2-Side Table & Share Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-8 p-0 border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/80">
            <h3 className="font-display font-bold text-base text-foreground">
              Rincian Transmisi Harga 4 Tingkat di {region}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nilai acuan PIHPS BI per kilogram komoditas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border/80">
                <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-3.5">Tingkat Rantai Pasok</th>
                  <th className="p-3.5 text-right">Harga Acuan</th>
                  <th className="p-3.5 text-right">Selisih Penambahan</th>
                  <th className="p-3.5">Catatan Teknis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {comparison.levels.map((item: SupplyChainLevel, index: number) => {
                  const prevPrice = index > 0 ? comparison.levels[index - 1].price : item.price;
                  const diff = item.price - prevPrice;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        {item.level}
                      </td>
                      <td className="p-3.5 text-right font-bold text-foreground tabular-nums">
                        {formatRupiah(item.price)}
                        <span className="text-xs font-normal text-muted-foreground">/kg</span>
                      </td>
                      <td className="p-3.5 text-right font-semibold tabular-nums">
                        {diff > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400">
                            +{formatRupiah(diff)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Dasar</span>
                        )}
                      </td>
                      <td className="p-3.5 text-muted-foreground text-xs">
                        {item.note}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bagian Petani (Farmer&apos;s Share)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums font-display">
                {comparison.farmerSharePercent.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                dari harga eceran
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dari setiap Rp1.000 yang dibayarkan konsumen di pasar eceran, nilai setara petani adalah sekitar{" "}
              <strong className="text-foreground">
                Rp{Math.round(comparison.farmerSharePercent * 10)}
              </strong>.
            </p>
          </Card>

          <Card className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Selisih Rantai Pasok
            </span>
            <p className="text-2xl font-black text-foreground tabular-nums">
              {formatRupiah(comparison.marginAmount)}
              <span className="text-xs font-normal text-muted-foreground">/kg</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Mencakup biaya penggilingan, susut bobot alami, dan marjin perdagangan grosir hingga eceran.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
