"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateData, aggregateMultipleMetrics } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface BarChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#3b82f6",
  "#f97316",
];

export function BarChartComponent({ config, data }: BarChartProps) {
  if (!config.xAxis) return null;

  const metrics = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : [];

  if (metrics.length === 0) return null;

  let chartData: Record<string, unknown>[];

  if (metrics.length === 1) {
    chartData = aggregateData(
      data,
      config.xAxis,
      metrics[0],
      config.aggregation || "sum"
    );
  } else {
    chartData = aggregateMultipleMetrics(
      data,
      config.xAxis,
      metrics,
      config.aggregation || "sum"
    );
  }

  // Apply sorting if configured
  if (config.sortBy) {
    chartData.sort((a, b) => {
      const aVal = a[config.sortBy as string] as number;
      const bVal = b[config.sortBy as string] as number;
      return config.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsBarChart data={chartData} margin={{ left: 0, right: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border opacity-50"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
              }
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
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              itemStyle={{ color: "hsl(var(--popover-foreground))" }}
            />
            {metrics.length > 1 && <Legend />}
            {metrics.map((metric, index) => (
              <Bar
                key={metric}
                dataKey={metrics.length === 1 ? "value" : metric}
                fill={config.colors?.[index] || COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
