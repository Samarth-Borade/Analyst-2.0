"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import type { ChartConfig } from "@/lib/store";

interface HistogramChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

export function HistogramChartComponent({ config, data }: HistogramChartProps) {
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  
  if (!valueField) return null;

  const values = data
    .map((d) => Number(d[valueField]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = 10;
  const binWidth = (max - min) / binCount || 1;

  // Create bins
  const bins: { range: string; count: number; start: number; end: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    const start = min + i * binWidth;
    const end = min + (i + 1) * binWidth;
    bins.push({
      range: `${start.toFixed(0)}-${end.toFixed(0)}`,
      count: 0,
      start,
      end,
    });
  }

  // Count values in each bin
  values.forEach((val) => {
    const binIndex = Math.min(Math.floor((val - min) / binWidth), binCount - 1);
    if (bins[binIndex]) {
      bins[binIndex].count++;
    }
  });

  const titlePosition = config.titlePosition || "top";
  
  // Generate axis titles - for histogram, x-axis is the value range and y-axis is frequency
  const xAxisTitle = config.xAxisTitle || `${valueField} Range`;
  const yAxisTitle = config.yAxisTitle || "Frequency";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ left: 10, right: 10, top: 10, bottom: 45 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border opacity-50"
            />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground fill-muted-foreground"
              angle={-45}
              textAnchor="end"
              height={50}
              label={{ value: xAxisTitle, position: 'bottom', offset: 30, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground fill-muted-foreground"
              label={{ value: yAxisTitle, angle: -90, position: 'insideLeft', offset: 5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              itemStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: number) => [value, "Count"]}
              labelFormatter={(label) => `Range: ${label}`}
            />
            <Bar
              dataKey="count"
              fill={config.colors?.[0] || "#8b5cf6"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
