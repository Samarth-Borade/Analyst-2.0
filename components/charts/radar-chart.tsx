"use client";

import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface RadarChartProps {
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

export function RadarChartComponent({ config, data }: RadarChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const chartData = aggregateData(
    data,
    config.xAxis,
    yMetric,
    config.aggregation || "sum"
  ).slice(0, 8);

  const maxValue = Math.max(...chartData.map((d) => d.value));
  const titlePosition = config.titlePosition || "top";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsRadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, maxValue]}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
              }
            />
            <Radar
              name={yMetric}
              dataKey="value"
              stroke={config.colors?.[0] || COLORS[0]}
              fill={config.colors?.[0] || COLORS[0]}
              fillOpacity={0.3}
              strokeWidth={2}
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
          </RechartsRadarChart>
        </ResponsiveContainer>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
