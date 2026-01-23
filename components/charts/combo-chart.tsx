"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface ComboChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
];

export function ComboChartComponent({ config, data }: ComboChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetrics = Array.isArray(config.yAxis) ? config.yAxis : [config.yAxis];
  const barMetric = yMetrics[0];
  const lineMetric = yMetrics[1] || yMetrics[0];

  // Aggregate data for each metric
  const barData = aggregateData(
    data,
    config.xAxis,
    barMetric,
    config.aggregation || "sum"
  );

  const lineData = aggregateData(
    data,
    config.xAxis,
    lineMetric,
    config.aggregation || "sum"
  );

  // Merge data
  const chartData = barData.map((item) => {
    const lineItem = lineData.find((l) => l.name === item.name);
    return {
      name: item.name,
      [barMetric]: item.value,
      [lineMetric]: lineItem?.value || 0,
    };
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
          <ComposedChart data={chartData} margin={{ left: 0, right: 0 }}>
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
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
              }
              className="text-muted-foreground fill-muted-foreground"
            />
            {barMetric !== lineMetric && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
                className="text-muted-foreground fill-muted-foreground"
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name,
              ]}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey={barMetric}
              fill={config.colors?.[0] || COLORS[0]}
              radius={[4, 4, 0, 0]}
              name={barMetric}
            />
            <Line
              yAxisId={barMetric !== lineMetric ? "right" : "left"}
              type="monotone"
              dataKey={lineMetric}
              stroke={config.colors?.[1] || COLORS[1]}
              strokeWidth={2}
              dot={{ fill: config.colors?.[1] || COLORS[1], strokeWidth: 0, r: 3 }}
              name={lineMetric}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
