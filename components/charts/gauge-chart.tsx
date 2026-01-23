"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateKPI, formatNumber } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface GaugeChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

export function GaugeChartComponent({ config, data }: GaugeChartProps) {
  if (!config.yAxis) return null;

  const metric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const value = calculateKPI(data, metric, config.aggregation || "sum");

  // Calculate percentage (assume max is 2x the value for now)
  const maxValue = value * 2;
  const percentage = Math.min((value / maxValue) * 100, 100);

  const chartData = [
    {
      name: metric,
      value: percentage,
      fill: config.colors?.[0] || "#8b5cf6",
    },
  ];

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center">
        <div className="relative w-full h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="90%"
              innerRadius="80%"
              outerRadius="100%"
              barSize={12}
              data={chartData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: "hsl(var(--muted))" }}
                dataKey="value"
                cornerRadius={6}
                fill={chartData[0].fill}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
            <span className="text-2xl font-bold text-card-foreground font-mono">
              {formatNumber(value)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {metric}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
