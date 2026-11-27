"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useSpatialDisparity } from "@/features/region-map/hooks/use-spatial-disparity";
import { IndonesiaSvgMap } from "@/features/region-map/components/indonesia-svg-map";

export default function PriceMapSection() {
  const [selectedProvince, setSelectedProvince] = useState<string>("Jawa Timur");
  const spatialQuery = useSpatialDisparity();
  const data = spatialQuery.data;
  const provinces = useMemo(() => data?.provinces ?? [], [data?.provinces]);

  const minPriceItem = useMemo(() => {
    if (provinces.length === 0) return undefined;
    return provinces.reduce(
      (prev, curr) => (curr.price < prev.price ? curr : prev),
      provinces[0],
    );
  }, [provinces]);

  const maxPriceItem = useMemo(() => {
    if (provinces.length === 0) return undefined;
    return provinces.reduce(
      (prev, curr) => (curr.price > prev.price ? curr : prev),
      provinces[0],
    );
  }, [provinces]);

  const disparityPercent = useMemo(() => {
    if (!minPriceItem || !maxPriceItem || minPriceItem.price === 0) return "0";
    return (((maxPriceItem.price - minPriceItem.price) / minPriceItem.price) * 100).toFixed(1);
  }, [minPriceItem, maxPriceItem]);

  return (
    <section
      id="peta-sebaran"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Geospasial Indonesia
            </span>
            <Badge variant="outline" className="text-xs font-bold">
              {data?.snapshotLabel ? `PIHPS ${data.snapshotLabel}` : "PIHPS BI Live"}
            </Badge>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Sebaran Harga Beras Medium I di 34 Provinsi
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Klik provinsi pada peta untuk melihat deviasi harga Pasar Tradisional terhadap median pasar nasional ({data ? `${formatRupiah(data.nationalMedianPrice)}/kg` : "..."}).
          </p>
        </div>
      </div>

      <AsyncBoundary
        isLoading={spatialQuery.isLoading}
        isError={spatialQuery.isError}
        error={spatialQuery.error}
        isEmpty={!spatialQuery.isLoading && !spatialQuery.isError && provinces.length === 0}
        onRetry={() => void spatialQuery.refetch()}
      >
        {minPriceItem && maxPriceItem && (
          <Card className="p-6 sm:p-7 space-y-6 rounded-2xl border border-border/80 bg-card shadow-xs">
            <IndonesiaSvgMap
              data={provinces}
              selectedProvince={selectedProvince}
              onSelectProvince={(prov) => setSelectedProvince(prov)}
            />

            {/* 3 Summary Metrics */}
            <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                <div className="flex items-center gap-1.5 text-primary">
                  <TrendingDown className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Harga Terendah (Sentra Surplus)
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">{minPriceItem.province}</p>
                <p className="text-2xl font-black text-primary font-display tabular-nums">
                  {formatRupiah(minPriceItem.price)}
                  <span className="text-xs font-normal text-muted-foreground">/kg</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Deviasi: {minPriceItem.percentageDiff.toFixed(1)}% di bawah median
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Harga Tertinggi (Wilayah Defisit)
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">{maxPriceItem.province}</p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400 font-display tabular-nums">
                  {formatRupiah(maxPriceItem.price)}
                  <span className="text-xs font-normal text-muted-foreground">/kg</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Deviasi: +{maxPriceItem.percentageDiff.toFixed(1)}% di atas median
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Scale className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Rentang Disparitas Nasional
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  Selisih Wilayah Terendah vs Tertinggi
                </p>
                <p className="text-2xl font-black text-foreground font-display tabular-nums">
                  {disparityPercent}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Dipengaruhi neraca pasokan daerah &amp; kondisi cuaca musiman
                </p>
              </div>
            </div>
          </Card>
        )}
      </AsyncBoundary>
    </section>
  );
}
