"use client";

import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/lib/store";

interface ScatterChartProps {
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

export function ScatterChartComponent({ config, data }: ScatterChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const chartData = data.map((row) => ({
    x: Number(row[config.xAxis as string]) || 0,
    y: Number(row[yMetric]) || 0,
    z: config.groupBy ? Number(row[config.groupBy]) || 10 : 10,
  }));

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsScatterChart margin={{ left: 0, right: 0 }}>
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
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Scatter
              data={chartData}
              fill={config.colors?.[0] || COLORS[0]}
              fillOpacity={0.7}
            />
          </RechartsScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
