"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  geoMercator,
  geoPath,
  type GeoGeometryObjects,
  type GeoPermissibleObjects,
} from "d3-geo";
import indonesiaGeoJson from "@/data/indonesia-provinces.json";
import { useSpatialDisparity } from "@/features/region-map/hooks/use-spatial-disparity";
import { usePriceBoard } from "@/features/price-board/hooks/use-price-board";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Minus,
  RotateCcw,
  ArrowRight,
  MapPin,
  X,
  Layers,
  Calendar,
  Building2,
  Store,
  ShoppingCart,
  Wheat,
  Percent,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ProvinceFeature {
  type: string;
  properties?: {
    Propinsi?: string;
  };
  geometry: GeoGeometryObjects;
}

interface ProvinceGeoJson {
  type: string;
  features: ProvinceFeature[];
}

interface ProvincePathItem {
  id: number;
  name: string;
  path: string | null;
}

const COMMODITY_OPTIONS = [
  { value: "Beras Medium I", label: "Beras Medium I (Pasar Tradisional)" },
  { value: "Gabah Kering Panen (GKP)", label: "Gabah Kering Panen (GKP)" },
  { value: "Gabah Kering Giling (GKG)", label: "Gabah Kering Giling (GKG)" },
];

const PERIOD_OPTIONS = [
  { value: "Pekan Berjalan (Terkini)", label: "Pekan Berjalan (Terkini)" },
  { value: "Rata-rata 30 Hari", label: "Rata-rata 30 Hari" },
];

function computeMedian(values: Array<number | undefined>): number {
  const valid = values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 1
    ? valid[mid]
    : Math.round((valid[mid - 1] + valid[mid]) / 2);
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
  if (upper === "NUSATENGGARA BARAT" || upper === "NUSA TENGGARA BARAT")
    return "Nusa Tenggara Barat";
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

export default function FullPriceMap() {
  const { data: currentUser } = useCurrentUser();
  const [selectedProvince, setSelectedProvince] = useState<string>("Jawa Barat");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Stats visibility state (can be collapsed to the side)
  const [isDesktopStatsOpen, setIsDesktopStatsOpen] = useState<boolean>(true);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState<boolean>(true);

  // Filters inside the side panel
  const [commodity, setCommodity] = useState<string>("Beras Medium I");
  const [period, setPeriod] = useState<string>("Pekan Berjalan (Terkini)");

  // Map Pan and Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const spatialQuery = useSpatialDisparity();
  const spatialData = spatialQuery.data;
  const provincialData = useMemo(
    () => spatialData?.provinces ?? [],
    [spatialData?.provinces],
  );

  const nationalGkpMedian = useMemo(
    () => computeMedian(provincialData.map((d) => d.gkpDerivedPrice)),
    [provincialData],
  );
  const nationalGkgMedian = useMemo(
    () => computeMedian(provincialData.map((d) => d.gkgDerivedPrice)),
    [provincialData],
  );

  // Compute highest, lowest, disparity statistics
  const stats = useMemo(() => {
    if (provincialData.length === 0) return null;
    const minItem = provincialData.reduce(
      (prev, curr) => (curr.price < prev.price ? curr : prev),
      provincialData[0],
    );

    const maxItem = provincialData.reduce(
      (prev, curr) => (curr.price > prev.price ? curr : prev),
      provincialData[0],
    );

    const disparityAmount = maxItem.price - minItem.price;
    const disparityPercent = Number(
      (((maxItem.price - minItem.price) / Math.max(1, minItem.price)) * 100).toFixed(1),
    );

    return {
      minItem,
      maxItem,
      disparityAmount,
      disparityPercent,
    };
  }, [provincialData]);

  const svgWidth = 1000;
  const svgHeight = 460;

  // Compute projection and path generator
  const paths: ProvincePathItem[] = useMemo(() => {
    const geo = indonesiaGeoJson as unknown as ProvinceGeoJson;
    const projection = geoMercator().fitSize(
      [svgWidth - 60, svgHeight - 60],
      geo as unknown as GeoPermissibleObjects,
    );
    const pathGenerator = geoPath().projection(projection);

    return geo.features.map((feature: ProvinceFeature, idx: number) => {
      const rawName = feature.properties?.Propinsi || "";
      const provName = normalizeProvinceName(rawName);
      const d = pathGenerator(feature as unknown as GeoPermissibleObjects);
      return {
        id: idx,
        name: provName,
        path: d,
      };
    });
  }, []);

  // Color mapper based on deviation vs median (Red to Green)
  const getColor = useCallback(
    (provName: string) => {
      const item = provincialData.find(
        (d) => d.province.toLowerCase() === provName.toLowerCase(),
      );
      if (!item) return "#94a3b8";

      const diff = item.percentageDiff;
      if (diff > 5.0) return "#ea580c";
      if (diff > 1.5) return "#f59e0b";
      if (diff >= -1.0) return "#64748b";
      if (diff >= -3.5) return "#10b981";
      return "#059669";
    },
    [provincialData],
  );

  // Active province data for hover and side panel
  const selectedItem = useMemo(() => {
    if (provincialData.length === 0) return undefined;
    return (
      provincialData.find(
        (d) => d.province.toLowerCase() === selectedProvince.toLowerCase(),
      ) || provincialData[0]
    );
  }, [provincialData, selectedProvince]);

  const hoveredItem = useMemo(() => {
    if (!hoveredProvince) return null;
    return (
      provincialData.find(
        (d) => d.province.toLowerCase() === hoveredProvince.toLowerCase(),
      ) || null
    );
  }, [hoveredProvince, provincialData]);

  const use30d = period.includes("30 Hari");
  const priceBoardPeriod = use30d ? "Rata-rata 30 Hari" : "12 Pekan Terakhir";
  const priceBoardQuery = usePriceBoard(selectedItem?.province, priceBoardPeriod, {
    enabled: isSidePanelOpen && Boolean(selectedItem?.province),
  });

  // Price calculations for the side panel based on live spatial disparity + price-board data
  const provincePriceData = useMemo(() => {
    if (!selectedItem || !spatialData) return null;

    const price30d = selectedItem.price30d ?? selectedItem.price;
    const periodScale =
      use30d && selectedItem.price > 0 ? price30d / selectedItem.price : 1.0;

    let calculatedPrice: number = use30d ? price30d : selectedItem.price;
    let medianBenchmark: number = use30d
      ? spatialData.nationalMedianPrice30d
      : spatialData.nationalMedianPrice;

    const gkpBase = selectedItem.gkpDerivedPrice ?? Math.round(selectedItem.price * 0.48);
    const gkgBase = selectedItem.gkgDerivedPrice ?? Math.round(selectedItem.price * 0.56);

    if (commodity.includes("GKP")) {
      calculatedPrice = Math.round(gkpBase * periodScale);
      medianBenchmark = Math.round(
        nationalGkpMedian *
          (use30d
            ? spatialData.nationalMedianPrice30d /
              Math.max(1, spatialData.nationalMedianPrice)
            : 1.0),
      );
    } else if (commodity.includes("GKG")) {
      calculatedPrice = Math.round(gkgBase * periodScale);
      medianBenchmark = Math.round(
        nationalGkgMedian *
          (use30d
            ? spatialData.nationalMedianPrice30d /
              Math.max(1, spatialData.nationalMedianPrice)
            : 1.0),
      );
    }

    const diffNominal = calculatedPrice - medianBenchmark;
    const percentageDiff = Number(
      (((calculatedPrice - medianBenchmark) / Math.max(1, medianBenchmark)) * 100).toFixed(1),
    );

    const board = priceBoardQuery.data?.comparison;
    const farmerPrice = board?.levels[0]?.price ?? gkpBase;
    const millerPrice = board?.levels[1]?.price ?? selectedItem.price;
    const wholesalePrice = board?.levels[2]?.price ?? selectedItem.price;
    const retailPrice = board?.levels[3]?.price ?? selectedItem.price;
    const farmerShare = board ? Math.round(board.farmerSharePercent) : 0;

    return {
      calculatedPrice,
      medianBenchmark,
      diffNominal,
      percentageDiff,
      farmerPrice,
      millerPrice,
      wholesalePrice,
      retailPrice,
      farmerShare,
      hasBoard: Boolean(board),
    };
  }, [
    selectedItem,
    spatialData,
    use30d,
    commodity,
    nationalGkpMedian,
    nationalGkgMedian,
    priceBoardQuery.data?.comparison,
  ]);

  // Zoom handlers
  const handleZoomIn = () =>
    setZoom((prev) => Math.min(Number((prev + 0.35).toFixed(2)), 3.2));
  const handleZoomOut = () =>
    setZoom((prev) => Math.max(Number((prev - 0.35).toFixed(2)), 0.8));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      hasMovedRef.current = false;
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 10) {
        hasMovedRef.current = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (spatialQuery.isLoading || spatialQuery.isError || !spatialData || !stats) {
    return (
      <div className="relative w-full h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6rem)] min-h-[580px] flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-xl">
          <AsyncBoundary
            isLoading={spatialQuery.isLoading}
            isError={spatialQuery.isError}
            error={spatialQuery.error}
            isEmpty={!spatialQuery.isLoading && !spatialQuery.isError && provincialData.length === 0}
            onRetry={() => void spatialQuery.refetch()}
          >
            <div />
          </AsyncBoundary>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6rem)] min-h-[580px] overflow-hidden bg-background select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Subtle Map Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top-Left Header */}
      <div className="absolute top-5 left-5 sm:top-7 sm:left-7 z-20 pointer-events-auto max-w-sm sm:max-w-md lg:max-w-lg space-y-2">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight leading-tight drop-shadow-xs">
          Peta Sebaran Harga Beras
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
          Pantau deviasi harga beras terhadap median nasional ({spatialData.snapshotLabel}). Klik wilayah pada peta untuk membuka papan harga dan transmisi rantai pasok.
        </p>

        {/* Mobile Stats */}
        <div className="sm:hidden pt-2 space-y-1.5">
          <button
            type="button"
            onClick={() => setIsMobileStatsOpen(!isMobileStatsOpen)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={isMobileStatsOpen ? "Sembunyikan statistik" : "Tampilkan statistik"}
          >
            <span>Ringkasan Pasar</span>
            {isMobileStatsOpen ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs transition-all duration-300 ${
              isMobileStatsOpen
                ? "opacity-100 max-h-24 translate-x-0"
                : "opacity-0 max-h-0 -translate-x-4 pointer-events-none overflow-hidden"
            }`}
          >
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Tertinggi ({stats.maxItem.province}):
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatRupiah(stats.maxItem.price)}/kg
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">
                Terendah ({stats.minItem.province}):
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatRupiah(stats.minItem.price)}/kg
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">Disparitas:</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatRupiah(stats.disparityAmount)}/kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Right Desktop Stats */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20 pointer-events-auto hidden sm:flex items-center gap-2">
        <div
          className={`flex items-center gap-6 text-right transition-all duration-300 ${
            isDesktopStatsOpen
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-8 pointer-events-none select-none max-w-0 overflow-hidden"
          }`}
        >
          <div className="space-y-0.5 whitespace-nowrap">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tertinggi ({stats.maxItem.province})
            </div>
            <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-display tabular-nums">
              {formatRupiah(stats.maxItem.price)}
              <span className="text-[10px] font-normal text-muted-foreground">/kg</span>
              <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80 ml-1">
                (+{stats.maxItem.percentageDiff.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="space-y-0.5 whitespace-nowrap">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Terendah ({stats.minItem.province})
            </div>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-display tabular-nums">
              {formatRupiah(stats.minItem.price)}
              <span className="text-[10px] font-normal text-muted-foreground">/kg</span>
              <span className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80 ml-1">
                ({stats.minItem.percentageDiff.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="space-y-0.5 whitespace-nowrap">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Disparitas
            </div>
            <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-display tabular-nums">
              {formatRupiah(stats.disparityAmount)}
              <span className="text-[10px] font-normal text-muted-foreground">/kg</span>
              <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 ml-1">
                ({stats.disparityPercent}%)
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDesktopStatsOpen(!isDesktopStatsOpen)}
          className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          title={isDesktopStatsOpen ? "Sembunyikan ke samping" : "Tampilkan statistik"}
          aria-label={isDesktopStatsOpen ? "Sembunyikan ke samping" : "Tampilkan statistik"}
        >
          {isDesktopStatsOpen ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Bottom-Left Legend */}
      <div className="absolute bottom-5 left-5 sm:bottom-7 sm:left-7 z-20 pointer-events-auto flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6 bg-background/60 backdrop-blur-xs p-2 rounded-xl sm:bg-transparent sm:backdrop-blur-none sm:p-0">
        <div className="flex flex-col space-y-1.5">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Deviasi vs Median Nasional
          </div>

          <div className="flex items-center text-[10px] font-bold">
            <span className="w-14 sm:w-16 text-center text-orange-600 dark:text-orange-400">
              &gt; +5.0%
            </span>
            <span className="w-14 sm:w-16 text-center text-amber-600 dark:text-amber-400">
              +1.5% s/d +5%
            </span>
            <span className="w-12 sm:w-14 text-center text-slate-600 dark:text-slate-400">
              Normal
            </span>
            <span className="w-14 sm:w-16 text-center text-emerald-600 dark:text-emerald-400">
              -1% s/d -3.5%
            </span>
            <span className="w-14 sm:w-16 text-center text-emerald-700 dark:text-emerald-500">
              &lt; -3.5%
            </span>
          </div>

          <div className="flex h-3.5 rounded-full overflow-hidden shadow-xs ring-1 ring-border/60">
            <div
              className="w-14 sm:w-16 bg-[#ea580c] transition-opacity hover:opacity-90"
              title="Defisit Kuat (> +5.0%)"
            />
            <div
              className="w-14 sm:w-16 bg-[#f59e0b] transition-opacity hover:opacity-90"
              title="Defisit (+1.5% s/d +5.0%)"
            />
            <div
              className="w-12 sm:w-14 bg-[#64748b] transition-opacity hover:opacity-90"
              title="Normal / Berimbang (±1.5%)"
            />
            <div
              className="w-14 sm:w-16 bg-[#10b981] transition-opacity hover:opacity-90"
              title="Surplus (-1.0% s/d -3.5%)"
            />
            <div
              className="w-14 sm:w-16 bg-[#059669] transition-opacity hover:opacity-90"
              title="Surplus Kuat (< -3.5%)"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pb-0.5 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-5">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Median Nasional (Beras)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-extrabold text-foreground font-display tabular-nums">
                {formatRupiah(spatialData.nationalMedianPrice)}
              </span>
              <span className="text-xs text-muted-foreground">/kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Zoom & Pan Controls */}
      <div className="absolute bottom-5 right-5 sm:bottom-7 sm:right-7 md:bottom-20 md:right-6 z-20 pointer-events-auto flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 rounded-xl bg-card/90 dark:bg-card/90 backdrop-blur-md border border-border/80 shadow-md hover:bg-muted cursor-pointer"
          onClick={handleZoomIn}
          title="Perbesar Peta"
          aria-label="Perbesar Peta"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 rounded-xl bg-card/90 dark:bg-card/90 backdrop-blur-md border border-border/80 shadow-md hover:bg-muted cursor-pointer"
          onClick={handleZoomOut}
          title="Perkecil Peta"
          aria-label="Perkecil Peta"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 rounded-xl bg-card/90 dark:bg-card/90 backdrop-blur-md border border-border/80 shadow-md hover:bg-muted cursor-pointer"
          onClick={handleResetView}
          title="Atur Ulang Posisi"
          aria-label="Atur Ulang Posisi"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-6">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-h-[82vh] select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <g
            transform={`translate(${svgWidth / 2 + pan.x}, ${
              svgHeight / 2 + pan.y
            }) scale(${zoom}) translate(${-svgWidth / 2}, ${-svgHeight / 2})`}
            className="transition-transform duration-75 ease-out"
          >
            {paths.map((p: ProvincePathItem) => {
              if (!p.path) return null;
              const isSelected = selectedProvince.toLowerCase() === p.name.toLowerCase();
              const isHovered = hoveredProvince?.toLowerCase() === p.name.toLowerCase();
              const fillColor = getColor(p.name);

              return (
                <path
                  key={p.id}
                  d={p.path}
                  fill={fillColor}
                  fillOpacity={isHovered ? 1 : isSelected ? 0.96 : 0.82}
                  stroke={
                    isSelected
                      ? "#09090b"
                      : isHovered
                        ? "#ffffff"
                        : "rgba(255,255,255,0.45)"
                  }
                  strokeWidth={isSelected ? 2.6 : isHovered ? 1.8 : 0.7}
                  className="cursor-pointer transition-[fill-opacity,stroke-width] duration-150 outline-none"
                  onMouseEnter={() => setHoveredProvince(p.name)}
                  onMouseLeave={() => setHoveredProvince(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasMovedRef.current) {
                      setSelectedProvince(p.name);
                      setIsSidePanelOpen(true);
                    }
                  }}
                >
                  <title>{`${p.name}`}</title>
                </path>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredProvince && tooltipPos && !isSidePanelOpen && (
        <div
          className="pointer-events-none absolute z-30 hidden sm:block -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 12}px`,
          }}
        >
          <div className="bg-popover/95 text-popover-foreground backdrop-blur-md border border-border/80 shadow-lg rounded-xl px-3 py-2 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getColor(hoveredProvince) }}
              />
              <span>{hoveredProvince}</span>
            </div>
            {hoveredItem && (
              <div className="flex items-center gap-2 text-[11px] tabular-nums">
                <span className="font-bold">{formatRupiah(hoveredItem.price)}/kg</span>
                <span className="text-muted-foreground">·</span>
                <span
                  className={
                    hoveredItem.percentageDiff > 0
                      ? "text-amber-600 font-semibold"
                      : "text-emerald-600 font-semibold"
                  }
                >
                  {hoveredItem.percentageDiff > 0 ? "+" : ""}
                  {hoveredItem.percentageDiff.toFixed(1)}% vs median
                </span>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground pt-0.5">
              Klik untuk melihat papan harga wilayah
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {isSidePanelOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 sm:hidden transition-opacity"
          onClick={() => setIsSidePanelOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Side Panel */}
      {selectedItem && provincePriceData && (
        <div
          className={`absolute z-40 bg-background/95 dark:bg-background/95 backdrop-blur-md shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pointer-events-auto
            inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t border-border
            sm:inset-y-0 sm:left-0 sm:right-auto sm:top-0 sm:w-[420px] lg:sm:w-[440px] sm:max-h-full sm:rounded-none sm:border-t-0 sm:border-r
            ${
              isSidePanelOpen
                ? "translate-y-0 sm:translate-x-0"
                : "translate-y-full sm:translate-y-0 sm:-translate-x-full pointer-events-none invisible sm:visible"
            }`}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

          {/* Panel Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-start justify-between gap-3 bg-muted/20">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-xl text-foreground tracking-tight">
                  {selectedItem.province}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {selectedItem.sampleCount} titik pantau
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setIsSidePanelOpen(false)}
              aria-label="Tutup panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Filters */}
            <div className="space-y-3.5 p-4 rounded-2xl bg-muted/30 border border-border/80">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Filter Papan Harga</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Komoditas Acuan
                  </label>
                  <Select
                    items={COMMODITY_OPTIONS}
                    value={commodity}
                    onValueChange={(val) => {
                      if (val) setCommodity(val);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-xs bg-background">
                      <SelectValue placeholder="Pilih komoditas" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMODITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Periode Snapshot
                  </label>
                  <Select
                    items={PERIOD_OPTIONS}
                    value={period}
                    onValueChange={(val) => {
                      if (val) setPeriod(val);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-xs bg-background">
                      <SelectValue placeholder="Pilih periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rangkuman Harga Utama */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Harga Acuan Wilayah (
                  {commodity.includes("(")
                    ? commodity.split("(")[1].replace(")", "")
                    : commodity}
                  ):
                </span>
                <span className="font-semibold text-foreground">
                  Median: {formatRupiah(provincePriceData.medianBenchmark)}/kg
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground font-display tabular-nums tracking-tight">
                  {formatRupiah(provincePriceData.calculatedPrice)}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">/kg</span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <span>Deviasi:</span>
                <strong
                  className={
                    provincePriceData.percentageDiff > 0
                      ? "text-amber-600 dark:text-amber-400 font-bold"
                      : "text-emerald-600 dark:text-emerald-400 font-bold"
                  }
                >
                  {provincePriceData.percentageDiff > 0 ? "+" : ""}
                  {provincePriceData.percentageDiff}% (
                  {provincePriceData.diffNominal > 0 ? "+" : ""}
                  {formatRupiah(provincePriceData.diffNominal)}/kg)
                </strong>
              </div>
            </div>

            {/* Transmisi Rantai Pasok Wilayah */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Transmisi Rantai Pasok</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Transmisi 1 kg setara Beras Medium I (petani → eceran)
                  </p>
                </div>
                {provincePriceData.hasBoard && (
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    Farmer&apos;s Share: {provincePriceData.farmerShare}%
                  </Badge>
                )}
              </div>

              {priceBoardQuery.isLoading ? (
                <div className="p-4 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Memuat transmisi rantai pasok wilayah...</span>
                </div>
              ) : priceBoardQuery.isError ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-destructive font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Gagal memuat rantai pasok wilayah</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void priceBoardQuery.refetch()}
                    className="h-7 text-xs cursor-pointer"
                  >
                    Coba Muat Ulang
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Tingkat Petani */}
                  <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Wheat className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Tingkat Petani (Setara Beras)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Nilai ±1,87 kg GKP setara 1 kg beras (rendemen 53,38%)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-foreground font-display tabular-nums">
                        {formatRupiah(provincePriceData.farmerPrice)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/kg</div>
                    </div>
                  </div>

                  {/* Tingkat Penggilingan */}
                  <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Penggilingan Padi</div>
                        <div className="text-[11px] text-muted-foreground">
                          Harga beras tingkat produsen (PIHPS BI)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-foreground font-display tabular-nums">
                        {formatRupiah(provincePriceData.millerPrice)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/kg</div>
                    </div>
                  </div>

                  {/* Tingkat Grosir / Pasar Induk */}
                  <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Pasar Grosir / Induk
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Harga beras pedagang besar (PIHPS BI)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-foreground font-display tabular-nums">
                        {formatRupiah(provincePriceData.wholesalePrice)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/kg</div>
                    </div>
                  </div>

                  {/* Tingkat Konsumen Eceran */}
                  <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Eceran Konsumen</div>
                        <div className="text-[11px] text-muted-foreground">
                          Pasar tradisional konsumen (PIHPS BI)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-foreground font-display tabular-nums">
                        {formatRupiah(provincePriceData.retailPrice)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/kg</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Indikator Marjin Petani */}
            {provincePriceData.hasBoard && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Porsi Nilai Petani:</span>
                </div>
                <span className="font-bold text-foreground font-display">
                  {provincePriceData.farmerShare}% dari harga konsumen
                </span>
              </div>
            )}
          </div>

          {/* Panel Footer Action */}
          <div className="p-4 border-t border-border/80 bg-background/90">
            {(() => {
              const fairPriceHref = `/harga-wajar?province=${encodeURIComponent(selectedItem.province)}`;
              const targetHref = currentUser
                ? fairPriceHref
                : `/masuk?redirect=${encodeURIComponent(fairPriceHref)}`;
              return (
                <Button
                  className="w-full gap-2 font-semibold text-xs h-10 cursor-pointer"
                  render={<Link href={targetHref} />}
                >
                  <span>
                    {currentUser
                      ? "Hitung Simulasi Harga Wajar"
                      : "Masuk untuk Simulasi Harga Wajar"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
