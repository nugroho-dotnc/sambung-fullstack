"use client";

import { memo, useMemo, type ComponentProps } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { HistoricalTrendPoint } from "../domain/price-chain";
import { formatRupiah } from "@/features/offers/components/offer-summary";

interface PriceChainChartProps {
  data: HistoricalTrendPoint[];
}

const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const chartConfig = {
  retailPrice: {
    label: "Eceran Konsumen",
    color: "#2563eb",
  },
  millerPrice: {
    label: "Penggilingan Padi",
    color: "#f59e0b",
  },
  farmerPrice: {
    label: "Petani (Setara Beras)",
    color: "#10b981",
  },
  predictedMillerSeries: {
    label: "Prediksi AI (Penggilingan)",
    color: "#d97706",
  },
  predictedFarmerSeries: {
    label: "Prediksi AI (Petani Setara Beras)",
    color: "#059669",
  },
} satisfies ChartConfig;

type TooltipContentProps = ComponentProps<typeof ChartTooltipContent>;
type TooltipLabelFormatter = NonNullable<TooltipContentProps["labelFormatter"]>;
type TooltipFormatter = NonNullable<TooltipContentProps["formatter"]>;

const formatTooltipLabel: TooltipLabelFormatter = (label, payload) => {
  const first = payload?.[0]?.payload as HistoricalTrendPoint | undefined;
  return first?.week || String(label ?? "");
};

const formatTooltipValue: TooltipFormatter = (value, name, item) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return (
    <div className="flex w-full items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <div
          className="h-2 w-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-muted-foreground">
          {chartConfig[item.dataKey as keyof typeof chartConfig]?.label || name}
        </span>
      </div>
      <span className="font-semibold tabular-nums text-foreground">
        {formatRupiah(num)}
      </span>
    </div>
  );
};

function formatYAxisTick(value: unknown): string {
  return `Rp${(Number(value) / 1000).toFixed(0)}k`;
}

function formatCompactAxisLabel(point: HistoricalTrendPoint, stretched: boolean): string {
  if (!stretched || !point.weekStart) {
    return point.week;
  }
  const [yearStr, monthStr] = point.weekStart.split("-");
  const monthIdx = Number(monthStr) - 1;
  const monthLabel = MONTH_SHORT_ID[monthIdx] ?? monthStr;
  return `${monthLabel} ${yearStr.slice(-2)}`;
}

export const PriceChainChart = memo(function PriceChainChart({ data }: PriceChainChartProps) {
  const isStretched = data.length > 26;
  const showDots = !isStretched;
  const lineType = isStretched ? "linear" : "monotone";
  const animateLines = !isStretched;

  const { chartData, hasPredictedSeries } = useMemo(() => {
    let lastActualIdx = -1;
    for (let i = 0; i < data.length; i += 1) {
      if (data[i].millerPrice !== null || data[i].farmerPrice !== null) {
        lastActualIdx = i;
      }
    }

    const hasFuturePredictions = data.some(
      (pt, idx) =>
        idx > lastActualIdx &&
        pt.predictedMillerPrice !== null &&
        pt.predictedMillerPrice !== undefined
    );

    const anyPredicted = data.some(
      (pt) =>
        pt.predictedMillerPrice !== null && pt.predictedMillerPrice !== undefined
    );

    const mapped = data.map((point, idx) => {
      const isAnchor = hasFuturePredictions && idx === lastActualIdx;
      const predictedMillerSeries =
        point.predictedMillerPrice !== null && point.predictedMillerPrice !== undefined
          ? point.predictedMillerPrice
          : isAnchor
          ? point.millerPrice
          : null;
      const predictedFarmerSeries =
        point.predictedFarmerPrice !== null && point.predictedFarmerPrice !== undefined
          ? point.predictedFarmerPrice
          : isAnchor
          ? point.farmerPrice
          : null;

      return {
        ...point,
        axisLabel: formatCompactAxisLabel(point, isStretched),
        predictedMillerSeries,
        predictedFarmerSeries,
      };
    });

    return { chartData: mapped, hasPredictedSeries: anyPredicted };
  }, [data, isStretched]);

  return (
    <ChartContainer config={chartConfig} className="w-full h-72 sm:h-80 pt-2">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="axisLabel"
          minTickGap={isStretched ? 40 : 12}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          domain={["dataMin - 500", "dataMax + 500"]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={formatYAxisTick}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={formatTooltipLabel}
              formatter={formatTooltipValue}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="top" height={38} />
        <Line
          type={lineType}
          dataKey="retailPrice"
          stroke="var(--color-retailPrice)"
          strokeWidth={2.5}
          connectNulls
          dot={showDots ? { r: 3 } : false}
          activeDot={{ r: 5 }}
          isAnimationActive={animateLines}
          animationDuration={300}
        />
        <Line
          type={lineType}
          dataKey="millerPrice"
          stroke="var(--color-millerPrice)"
          strokeWidth={2}
          connectNulls
          dot={showDots ? { r: 3 } : false}
          activeDot={{ r: 4 }}
          isAnimationActive={animateLines}
          animationDuration={300}
        />
        <Line
          type={lineType}
          dataKey="farmerPrice"
          stroke="var(--color-farmerPrice)"
          strokeWidth={2.5}
          connectNulls
          dot={showDots ? { r: 3 } : false}
          activeDot={{ r: 5 }}
          isAnimationActive={animateLines}
          animationDuration={300}
        />
        {hasPredictedSeries && (
          <Line
            type="monotone"
            dataKey="predictedMillerSeries"
            stroke="var(--color-predictedMillerSeries)"
            strokeWidth={2}
            strokeDasharray="5 5"
            connectNulls
            dot={{ r: 4 }}
            activeDot={{ r: 5 }}
            isAnimationActive={animateLines}
            animationDuration={300}
          />
        )}
        {hasPredictedSeries && (
          <Line
            type="monotone"
            dataKey="predictedFarmerSeries"
            stroke="var(--color-predictedFarmerSeries)"
            strokeWidth={2}
            strokeDasharray="5 5"
            connectNulls
            dot={{ r: 4 }}
            activeDot={{ r: 5 }}
            isAnimationActive={animateLines}
            animationDuration={300}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
});
