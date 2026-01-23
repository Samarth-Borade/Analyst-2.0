"use client";

import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface FunnelChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

const COLORS = [
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#ddd6fe",
  "#ede9fe",
];

export function FunnelChartComponent({ config, data }: FunnelChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const aggregated = aggregateData(
    data,
    config.xAxis,
    yMetric,
    config.aggregation || "sum"
  );

  const chartData = aggregated.slice(0, 5).map((item, index) => ({
    name: item.name,
    value: item.value,
    fill: COLORS[index % COLORS.length],
  }));

  const titlePosition = config.titlePosition || "top";

  return (
    <Card className="h-full bg-card border-border">
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsFunnelChart margin={{ left: 0, right: 0 }}>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Funnel dataKey="value" data={chartData} isAnimationActive>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                position="right"
                fill="hsl(var(--foreground))"
                stroke="none"
                dataKey="name"
                fontSize={11}
                fontFamily="monospace"
              />
            </Funnel>
          </RechartsFunnelChart>
        </ResponsiveContainer>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </Card>
  );
}
