"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface PieChartProps {
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

export function PieChartComponent({ config, data, onDrillDown, onCrossFilter, crossFilterValue }: PieChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const chartData = aggregateData(
    data,
    config.xAxis,
    yMetric,
    config.aggregation || "sum"
  ).slice(0, 8);

  const isDonut = config.type === "donut";
  const titlePosition = config.titlePosition || "top";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsPieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 50 : 0}
              outerRadius={70}
              paddingAngle={2}
              strokeWidth={0}
              cursor="pointer"
              onClick={(data, index, e) => {
                if (data?.name && config.xAxis) {
                  if (e?.detail === 2 && onDrillDown) {
                    // Double click for drill-down
                    onDrillDown(String(data.name), config.xAxis);
                  } else if (onCrossFilter) {
                    // Single click for cross-filter
                    onCrossFilter(String(data.name), config.xAxis);
                  }
                }
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    crossFilterValue && String(entry.name) === crossFilterValue
                      ? config.colors?.[index] || COLORS[index % COLORS.length]
                      : crossFilterValue
                        ? `${config.colors?.[index] || COLORS[index % COLORS.length]}60`
                        : config.colors?.[index] || COLORS[index % COLORS.length]
                  }
                  stroke={
                    crossFilterValue && String(entry.name) === crossFilterValue
                      ? "hsl(var(--primary))"
                      : "none"
                  }
                  strokeWidth={crossFilterValue && String(entry.name) === crossFilterValue ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number) => [value.toLocaleString(), yMetric]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground font-mono">{value}</span>
              )}
            />
          </RechartsPieChart>
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
