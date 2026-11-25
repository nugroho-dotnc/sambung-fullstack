"use client";

import {
  ComposedChart,
  Line,
  Area,
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
import { formatRupiah } from "@/features/offers/components/offer-summary";

interface ForecastChartProps {
  series: {
    week: string;
    actualPrice?: number;
    forecastPrice?: number;
    lowerCi?: number;
    upperCi?: number;
  }[];
}

const chartConfig = {
  actualPrice: {
    label: "Harga Historis Aktual",
    color: "#2563eb",
  },
  ciRange: {
    label: "Pita Keyakinan 80%",
    color: "#10b981",
  },
  forecastPrice: {
    label: "Prediksi Model AI",
    color: "#10b981",
  },
} satisfies ChartConfig;

export function ForecastChart({ series }: ForecastChartProps) {
  const chartData = series.map((point) => ({
    ...point,
    ciRange:
      typeof point.lowerCi === "number" && typeof point.upperCi === "number"
        ? ([point.lowerCi, point.upperCi] as [number, number])
        : undefined,
  }));

  const numericValues = series.flatMap((point) =>
    [point.actualPrice, point.forecastPrice, point.lowerCi, point.upperCi].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    )
  );

  const yDomain: [number, number] = (() => {
    if (numericValues.length === 0) {
      return [0, 20000];
    }
    const rawMin = Math.min(...numericValues);
    const rawMax = Math.max(...numericValues);
    const span = rawMax - rawMin;
    const pad = Math.max(span * 0.25, 450);
    const yMin = Math.max(0, Math.floor((rawMin - pad) / 500) * 500);
    const yMax = Math.ceil((rawMax + pad) / 500) * 500;
    return [yMin, yMax];
  })();

  return (
    <ChartContainer config={chartConfig} className="w-full h-72 sm:h-80 pt-2">
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          domain={yDomain}
          width={72}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(val) => formatRupiah(Math.round(Number(val)))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                const formattedValue = Array.isArray(value)
                  ? (() => {
                      const [low, high] = value.map(Number);
                      return low === high
                        ? formatRupiah(low)
                        : `${formatRupiah(low)} – ${formatRupiah(high)}`;
                    })()
                  : formatRupiah(Number(value));

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
                    <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                      {formattedValue}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="top" height={36} />

        {/* Shaded 80% Confidence Band */}
        <Area
          type="monotone"
          dataKey="ciRange"
          fill="var(--color-ciRange)"
          fillOpacity={0.18}
          stroke="var(--color-ciRange)"
          strokeOpacity={0.35}
          strokeWidth={1}
          activeDot={false}
        />

        {/* Historical Actual Price */}
        <Line
          type="monotone"
          dataKey="actualPrice"
          stroke="var(--color-actualPrice)"
          strokeWidth={2.5}
          dot={{ r: 4 }}
        />

        {/* Forecasted Price */}
        <Line
          type="monotone"
          dataKey="forecastPrice"
          stroke="var(--color-forecastPrice)"
          strokeWidth={2.5}
          strokeDasharray="4 4"
          dot={{ r: 4, strokeWidth: 2 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
