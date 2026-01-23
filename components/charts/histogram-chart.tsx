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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ left: 0, right: 0 }}>
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
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
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
    </Card>
  );
}
