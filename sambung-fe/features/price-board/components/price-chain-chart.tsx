"use client";

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
} satisfies ChartConfig;

export function PriceChainChart({ data }: PriceChainChartProps) {
  return (
    <ChartContainer config={chartConfig} className="w-full h-72 sm:h-80 pt-2">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          domain={["dataMin - 500", "dataMax + 500"]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
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
                    {formatRupiah(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="top" height={36} />
        <Line
          type="monotone"
          dataKey="retailPrice"
          stroke="var(--color-retailPrice)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="millerPrice"
          stroke="var(--color-millerPrice)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="farmerPrice"
          stroke="var(--color-farmerPrice)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
