"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface WaterfallChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

export function WaterfallChartComponent({ config, data }: WaterfallChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const aggregated = aggregateData(
    data,
    config.xAxis,
    yMetric,
    config.aggregation || "sum"
  );

  // Transform data for waterfall
  let cumulative = 0;
  const waterfallData = aggregated.map((item, index) => {
    const prev = cumulative;
    cumulative += item.value;
    return {
      name: item.name,
      value: item.value,
      start: prev,
      end: cumulative,
      isPositive: item.value >= 0,
    };
  });

  // Add total
  waterfallData.push({
    name: "Total",
    value: cumulative,
    start: 0,
    end: cumulative,
    isPositive: cumulative >= 0,
  });

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={waterfallData} margin={{ left: 0, right: 0 }}>
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
              formatter={(value: number) => [value.toLocaleString(), yMetric]}
            />
            <ReferenceLine y={0} stroke="currentColor" className="text-border" />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.name === "Total"
                      ? "#8b5cf6"
                      : entry.isPositive
                        ? "#22c55e"
                        : "#ef4444"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
