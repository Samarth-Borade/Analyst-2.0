"use client";

import {
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTimeSeriesData, aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface LineChartProps {
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

export function LineChartComponent({ config, data }: LineChartProps) {
  if (!config.xAxis) return null;

  const metrics = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : [];

  if (metrics.length === 0) return null;

  // Try to use time series if x-axis looks like a date
  const isDateColumn =
    data.length > 0 &&
    typeof data[0][config.xAxis] === "string" &&
    !isNaN(Date.parse(data[0][config.xAxis] as string));

  let chartData: Record<string, unknown>[];

  if (isDateColumn) {
    chartData = getTimeSeriesData(
      data,
      config.xAxis,
      metrics[0],
      config.aggregation || "sum"
    ).map((d) => ({ name: d.date, value: d.value }));
  } else {
    chartData = aggregateData(
      data,
      config.xAxis,
      metrics[0],
      config.aggregation || "sum"
    );
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
          <RechartsLineChart data={chartData} margin={{ left: 0, right: 0 }}>
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
              <Line
                key={metric}
                type="monotone"
                dataKey={metrics.length === 1 ? "value" : metric}
                stroke={config.colors?.[index] || COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: config.colors?.[index] || COLORS[index % COLORS.length] }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
