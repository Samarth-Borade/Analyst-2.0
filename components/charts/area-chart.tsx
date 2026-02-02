"use client";

import {
  Area,
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { getTimeSeriesData, aggregateData, aggregateMultipleMetrics } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface AreaChartProps {
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

export function AreaChartComponent({ config, data }: AreaChartProps) {
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

  if (isDateColumn && metrics.length === 1) {
    chartData = getTimeSeriesData(
      data,
      config.xAxis,
      metrics[0],
      config.aggregation || "sum"
    ).map((d) => ({ name: d.date, value: d.value }));
  } else if (metrics.length > 1) {
    chartData = aggregateMultipleMetrics(
      data,
      config.xAxis,
      metrics,
      config.aggregation || "sum"
    );
  } else {
    chartData = aggregateData(
      data,
      config.xAxis,
      metrics[0],
      config.aggregation || "sum"
    );
  }

  const isStacked = config.type === "stacked-area";
  const titlePosition = config.titlePosition || "top";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsAreaChart data={chartData} margin={{ left: 0, right: 10, top: 20, bottom: 5 }}>
            <defs>
              {metrics.map((metric, index) => (
                <linearGradient
                  key={metric}
                  id={`gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={config.colors?.[index] || COLORS[index % COLORS.length]}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={config.colors?.[index] || COLORS[index % COLORS.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
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
              domain={[0, 'dataMax + 10%']}
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
              <Area
                key={metric}
                type="monotone"
                dataKey={metrics.length === 1 ? "value" : metric}
                stroke={config.colors?.[index] || COLORS[index % COLORS.length]}
                fill={`url(#gradient-${index})`}
                strokeWidth={2}
                stackId={isStacked ? "1" : undefined}
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
