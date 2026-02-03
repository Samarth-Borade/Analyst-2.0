"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import type { ChartConfig } from "@/lib/store";

interface RibbonChartProps {
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
];

export function RibbonChartComponent({ config, data }: RibbonChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const xField = config.xAxis;
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const groupField = config.groupBy;

  // Get unique x values and groups
  const xValues = [...new Set(data.map((d) => String(d[xField])))];
  const groups = groupField
    ? [...new Set(data.map((d) => String(d[groupField])))]
    : [valueField];

  // Aggregate data
  const chartData = xValues.map((x) => {
    const row: Record<string, unknown> = { name: x };
    
    if (groupField) {
      groups.forEach((group) => {
        const filtered = data.filter(
          (d) => String(d[xField]) === x && String(d[groupField]) === group
        );
        const sum = filtered.reduce((acc, d) => acc + (Number(d[valueField]) || 0), 0);
        row[group] = sum;
      });
    } else {
      const filtered = data.filter((d) => String(d[xField]) === x);
      const sum = filtered.reduce((acc, d) => acc + (Number(d[valueField]) || 0), 0);
      row[valueField] = sum;
    }

    return row;
  });

  // Calculate rankings for ribbon effect
  const rankedData = chartData.map((row) => {
    const values = groups.map((g) => ({ group: g, value: Number(row[g]) || 0 }));
    values.sort((a, b) => b.value - a.value);
    
    const ranked: Record<string, unknown> = { name: row.name };
    values.forEach((v, i) => {
      ranked[v.group] = v.value;
      ranked[`${v.group}_rank`] = i + 1;
    });
    return ranked;
  });

  const titlePosition = config.titlePosition || "top";

  return (
    <Card className="h-full bg-card border-border">
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={rankedData} margin={{ left: 0, right: 0 }}>
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
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name,
              ]}
            />
            <Legend />
            {groups.map((group, index) => (
              <Area
                key={group}
                type="monotone"
                dataKey={group}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </Card>
  );
}
