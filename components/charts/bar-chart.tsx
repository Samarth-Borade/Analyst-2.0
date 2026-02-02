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
  Cell,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { aggregateData, aggregateMultipleMetrics } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface BarChartProps {
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

export function BarChartComponent({ config, data, onDrillDown, onCrossFilter, crossFilterValue }: BarChartProps) {
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
  
  const titlePosition = config.titlePosition || "top";

  // Handle bar click for drill-down and cross-filtering
  const handleBarClick = (data: any, index: number) => {
    if (!data?.name || !config.xAxis) return;
    
    const clickedValue = String(data.name);
    
    // Trigger cross-filter (single click)
    if (onCrossFilter) {
      onCrossFilter(clickedValue, config.xAxis);
    }
  };

  // Handle double-click for drill-down
  const handleDoubleClick = (e: React.MouseEvent, value: string) => {
    e.preventDefault();
    if (onDrillDown && config.xAxis) {
      onDrillDown(value, config.xAxis);
    }
  };

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsBarChart 
            data={chartData} 
            margin={{ left: 0, right: 10, top: 20, bottom: 5 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload) {
                handleBarClick(e.activePayload[0].payload, e.activeTooltipIndex || 0);
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
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            {metrics.length > 1 && <Legend />}
            {metrics.map((metric, index) => (
              <Bar
                key={metric}
                dataKey={metrics.length === 1 ? "value" : metric}
                fill={config.colors?.[index] || COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onDoubleClick={(data, i, e) => {
                  if (data?.name) {
                    handleDoubleClick(e as any, String(data.name));
                  }
                }}
              >
                {/* Highlight selected bar for cross-filtering */}
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={
                      crossFilterValue && String(entry.name) === crossFilterValue
                        ? config.colors?.[index] || COLORS[index % COLORS.length]
                        : crossFilterValue
                          ? `${config.colors?.[index] || COLORS[index % COLORS.length]}40`
                          : config.colors?.[index] || COLORS[index % COLORS.length]
                    }
                    stroke={
                      crossFilterValue && String(entry.name) === crossFilterValue
                        ? "hsl(var(--primary))"
                        : "none"
                    }
                    strokeWidth={crossFilterValue && String(entry.name) === crossFilterValue ? 2 : 0}
                  />
                ))}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
        {(onDrillDown || onCrossFilter) && (
          <p className="text-center text-xs text-muted-foreground mt-1">
            Click to filter • Double-click to drill down
          </p>
        )}
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
