"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import indonesiaGeoJson from "@/data/indonesia-provinces.json";
import type { ProvincialPriceComparison } from "../domain/map-types";
import { formatRupiah } from "@/features/offers/components/offer-summary";

interface IndonesiaSvgMapProps {
  data: ProvincialPriceComparison[];
  selectedProvince: string;
  onSelectProvince: (province: string) => void;
}

function normalizeProvinceName(geoName: string): string {
  const upper = (geoName || "").toUpperCase().trim();
  if (upper === "JAWA BARAT") return "Jawa Barat";
  if (upper === "JAWA TENGAH") return "Jawa Tengah";
  if (upper === "JAWA TIMUR") return "Jawa Timur";
  if (upper === "PROBANTEN") return "Banten";
  if (upper === "DKI JAKARTA") return "DKI Jakarta";
  if (upper === "DAERAH ISTIMEWA YOGYAKARTA") return "DI Yogyakarta";
  if (upper === "DI. ACEH") return "Aceh";
  if (upper === "SUMATERA UTARA") return "Sumatera Utara";
  if (upper === "SUMATERA BARAT") return "Sumatera Barat";
  if (upper === "SUMATERA SELATAN") return "Sumatera Selatan";
  if (upper === "RIAU") return "Riau";
  if (upper === "JAMBI") return "Jambi";
  if (upper === "BENGKULU") return "Bengkulu";
  if (upper === "LAMPUNG") return "Lampung";
  if (upper === "BANGKA BELITUNG") return "Kepulauan Bangka Belitung";
  if (upper === "BALI") return "Bali";
  if (upper === "NUSATENGGARA BARAT" || upper === "NUSA TENGGARA BARAT") return "Nusa Tenggara Barat";
  if (upper === "NUSA TENGGARA TIMUR") return "Nusa Tenggara Timur";
  if (upper === "KALIMANTAN BARAT") return "Kalimantan Barat";
  if (upper === "KALIMANTAN TENGAH") return "Kalimantan Tengah";
  if (upper === "KALIMANTAN SELATAN") return "Kalimantan Selatan";
  if (upper === "KALIMANTAN TIMUR") return "Kalimantan Timur";
  if (upper === "SULAWESI UTARA") return "Sulawesi Utara";
  if (upper === "SULAWESI TENGAH") return "Sulawesi Tengah";
  if (upper === "SULAWESI SELATAN") return "Sulawesi Selatan";
  if (upper === "SULAWESI TENGGARA") return "Sulawesi Tenggara";
  if (upper === "GORONTALO") return "Gorontalo";
  if (upper === "MALUKU") return "Maluku";
  if (upper === "MALUKU UTARA") return "Maluku Utara";
  if (upper.includes("IRIAN JAYA TIMUR") || upper.includes("PAPUA")) return "Papua";
  if (upper.includes("IRIAN JAYA BARAT")) return "Papua Barat";

  return geoName;
}

function interpolateRgb(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * clamped);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * clamped);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Continuous diverging color scale centered strictly at 0%.
 * Negative (below median) interpolates toward agrarian green (--prime-2); positive toward amber/orange.
 */
function divergingColor(diffPct: number): string {
  const LOW_GREEN: [number, number, number] = [47, 130, 8]; // #2f8208 (--prime-2)
  const MID_SLATE: [number, number, number] = [148, 163, 184]; // #94a3b8
  const HIGH_ORANGE: [number, number, number] = [234, 88, 12]; // #ea580c
  const MAX_ABS = 12.0;

  if (diffPct <= 0) {
    return interpolateRgb(MID_SLATE, LOW_GREEN, Math.abs(diffPct) / MAX_ABS);
  }
  return interpolateRgb(MID_SLATE, HIGH_ORANGE, Math.abs(diffPct) / MAX_ABS);
}

export function IndonesiaSvgMap({
  data,
  selectedProvince,
  onSelectProvince,
}: IndonesiaSvgMapProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const width = 960;
  const height = 400;

  const { paths } = useMemo(() => {
    type GeoArg = Parameters<ReturnType<typeof geoMercator>["fitSize"]>[1];
    type GeoFeat = Parameters<ReturnType<typeof geoPath>>[0];
    const geo = indonesiaGeoJson as unknown as {
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        properties?: { Propinsi?: string } | null;
        geometry: unknown;
      }>;
    };
    const projection = geoMercator().fitSize(
      [width - 40, height - 40],
      geo as unknown as GeoArg
    );
    const pathGenerator = geoPath().projection(projection);

    const generated = geo.features.map((feature, idx) => {
      const rawName = feature.properties?.Propinsi || "";
      const provName = normalizeProvinceName(rawName);
      const d = pathGenerator(feature as unknown as GeoFeat);
      return {
        id: idx,
        name: provName,
        path: d,
      };
    });

    return { paths: generated };
  }, []);

  function getColor(provName: string) {
    const item = data.find((d) => d.province.toLowerCase() === provName.toLowerCase());
    if (!item) return "#cbd5e1";
    return divergingColor(item.percentageDiff);
  }

  const activeItem = data.find(
    (d) => d.province.toLowerCase() === (hoveredProvince || selectedProvince).toLowerCase()
  );

  return (
    <div className="relative w-full rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-6 overflow-hidden">
      {/* Interactive Tooltip / Info Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Wilayah Terpilih:
          </span>
          <span className="text-sm font-bold text-foreground">
            {hoveredProvince || selectedProvince}
          </span>
          {activeItem && (
            <span
              className={`text-xs tabular-nums font-bold px-2 py-0.5 rounded-md ${
                activeItem.percentageDiff > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {activeItem.percentageDiff > 0
                ? `+${activeItem.percentageDiff.toFixed(2)}%`
                : `${activeItem.percentageDiff.toFixed(2)}%`}{" "}
              vs Median
            </span>
          )}
        </div>

        {activeItem && (
          <div className="text-xs text-muted-foreground tabular-nums">
            {activeItem.grainType}: <strong className="text-foreground">{formatRupiah(activeItem.price)}/kg</strong> ({activeItem.sampleCount} pekan observasi)
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="w-full aspect-[2.4/1] relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full max-h-[420px] select-none"
        >
          <g transform="translate(20, 20)">
            {paths.map((p) => {
              if (!p.path) return null;
              const isSelected = selectedProvince.toLowerCase() === p.name.toLowerCase();
              const isHovered = hoveredProvince?.toLowerCase() === p.name.toLowerCase();
              const fillColor = getColor(p.name);

              return (
                <path
                  key={p.id}
                  d={p.path}
                  fill={fillColor}
                  fillOpacity={isHovered ? 1 : isSelected ? 0.96 : 0.85}
                  stroke={isSelected ? "#000" : isHovered ? "#fff" : "rgba(255,255,255,0.45)"}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0.7}
                  className="cursor-pointer transition-all duration-150 outline-none"
                  onMouseEnter={() => setHoveredProvince(p.name)}
                  onMouseLeave={() => setHoveredProvince(null)}
                  onClick={() => onSelectProvince(p.name)}
                >
                  <title>{`${p.name}`}</title>
                </path>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Continuous Diverging Legend centered at 0% */}
      <div className="mt-4 pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Perbandingan vs Harga Tengah Nasional (0%):
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-primary tabular-nums">
              -12% (Lebih Rendah)
            </span>
            <div
              className="w-36 sm:w-48 h-2.5 rounded-full border border-border/60"
              style={{
                background: "linear-gradient(to right, #2f8208 0%, #94a3b8 50%, #ea580c 100%)",
              }}
              aria-label="Gradasi warna dari -12% hijau ke 0% abu-abu hingga +12% oranye"
            />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
              +12% (Lebih Tinggi)
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Klik provinsi pada peta untuk melihat rincian faktor pendorong harganya.
        </p>
      </div>
    </div>
  );
}
