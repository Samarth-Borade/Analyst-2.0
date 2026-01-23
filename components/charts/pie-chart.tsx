"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface PieChartProps {
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

export function PieChartComponent({ config, data }: PieChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const chartData = aggregateData(
    data,
    config.xAxis,
    yMetric,
    config.aggregation || "sum"
  ).slice(0, 8);

  const isDonut = config.type === "donut";

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={config.colors?.[index] || COLORS[index % COLORS.length]}
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
      </CardContent>
    </Card>
  );
}
