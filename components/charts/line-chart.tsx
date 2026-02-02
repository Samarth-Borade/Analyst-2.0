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
import { getTimeSeriesData, aggregateData } from "@/lib/data-utils";
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

  const titlePosition = config.titlePosition || "top";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsLineChart 
            data={chartData} 
            margin={{ left: 0, right: 10, top: 20, bottom: 5 }}
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
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'dataMax + 10%']}
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
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
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
