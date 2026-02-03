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
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { getTimeSeriesData, aggregateData, aggregateDataWithFormula } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface LineChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  onDrillDown?: (value: string, field: string) => void;
  onCrossFilter?: (value: string, field: string) => void;
  crossFilterValue?: string | null;
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

export function LineChartComponent({ config, data, onDrillDown, onCrossFilter, crossFilterValue }: LineChartProps) {
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
    // Use formula-based aggregation
    chartData = aggregateDataWithFormula(
      data,
      config.xAxis,
      config.formula,
      config.formulaLabel || "value"
    );
  } else if (isDateColumn) {
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
          <RechartsLineChart 
            data={chartData} 
            margin={{ left: 10, right: 10, top: 20, bottom: 25 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload?.name && onCrossFilter && config.xAxis) {
                onCrossFilter(String(e.activePayload[0].payload.name), config.xAxis);
              }
            }}
          >
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
              domain={['auto', 'dataMax + 10%']}
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
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
              formatter={(value: number) => [formatValue(value), config.formulaLabel || yAxisTitle]}
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
                activeDot={{ 
                  r: 6, 
                  fill: config.colors?.[index] || COLORS[index % COLORS.length],
                  cursor: "pointer",
                  onClick: (e: any) => {
                    if (onDrillDown && e?.payload?.name && config.xAxis) {
                      onDrillDown(String(e.payload.name), config.xAxis);
                    }
                  }
                }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
        {(onDrillDown || onCrossFilter) && (
          <p className="text-center text-xs text-muted-foreground mt-1">
            Click to filter • Click point to drill down
          </p>
        )}
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
