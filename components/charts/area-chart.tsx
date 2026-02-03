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
import { getTimeSeriesData, aggregateData, aggregateMultipleMetrics, aggregateDataWithFormula } from "@/lib/data-utils";
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

  // Allow formula-based charts without requiring yAxis
  if (metrics.length === 0 && !config.formula) return null;

  // Try to use time series if x-axis looks like a date
  const isDateColumn =
    data.length > 0 &&
    typeof data[0][config.xAxis] === "string" &&
    !isNaN(Date.parse(data[0][config.xAxis] as string));

  let chartData: Record<string, unknown>[];

  // Check if we have a formula to evaluate
  if (config.formula) {
    chartData = aggregateDataWithFormula(
      data,
      config.xAxis,
      config.formula,
      config.formulaLabel || "value"
    );
  } else if (isDateColumn && metrics.length === 1) {
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
  
  // Generate axis titles from column names if not provided
  const xAxisTitle = config.xAxisTitle || config.xAxis;
  const yAxisTitle = config.yAxisTitle || config.formulaLabel || (metrics.length === 1 ? metrics[0] : "Value");

  // Smart number formatter for both large numbers and small decimals
  const formatValue = (value: number) => {
    if (value === 0) return "0";
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    if (Math.abs(value) < 1) return value.toFixed(2);
    if (Math.abs(value) < 10) return value.toFixed(2);
    return value.toFixed(0);
  };

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsAreaChart data={chartData} margin={{ left: 10, right: 10, top: 20, bottom: 25 }}>
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
              label={{ value: xAxisTitle, position: 'bottom', offset: 10, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'dataMax + 10%']}
              tickFormatter={formatValue}
              className="text-muted-foreground fill-muted-foreground"
              label={{ value: yAxisTitle, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
              formatter={(value: number) => [formatValue(value), config.formulaLabel || yAxisTitle]}
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
