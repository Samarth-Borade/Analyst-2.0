"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/lib/store";

interface BubbleChartProps {
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
];

export function BubbleChartComponent({ config, data }: BubbleChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const sizeMetric = Array.isArray(config.yAxis) && config.yAxis[1] ? config.yAxis[1] : yMetric;

  // Group data if groupBy is specified
  const groupByField = config.groupBy;
  const groups = groupByField
    ? [...new Set(data.map((d) => String(d[groupByField])))]
    : ["All"];

  const chartDataByGroup = groups.map((group, groupIndex) => {
    const filtered = groupByField
      ? data.filter((d) => String(d[groupByField]) === group)
      : data;

    return {
      name: group,
      data: filtered.map((row) => ({
        x: Number(row[config.xAxis as string]) || 0,
        y: Number(row[yMetric]) || 0,
        z: Math.abs(Number(row[sizeMetric])) || 10,
        name: row[config.xAxis as string],
      })),
      color: COLORS[groupIndex % COLORS.length],
    };
  });

  const maxZ = Math.max(...data.map((d) => Math.abs(Number(d[sizeMetric])) || 1));
  const minZ = Math.min(...data.map((d) => Math.abs(Number(d[sizeMetric])) || 1));

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border opacity-50"
            />
            <XAxis
              type="number"
              dataKey="x"
              name={config.xAxis}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground fill-muted-foreground"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yMetric}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground fill-muted-foreground"
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} domain={[minZ, maxZ]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === "x" ? config.xAxis : name === "y" ? yMetric : sizeMetric,
              ]}
            />
            {groupByField && <Legend />}
            {chartDataByGroup.map((group, index) => (
              <Scatter
                key={group.name}
                name={group.name}
                data={group.data}
                fill={group.color}
                fillOpacity={0.7}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
