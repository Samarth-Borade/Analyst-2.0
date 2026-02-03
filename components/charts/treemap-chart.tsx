"use client";

import {
  Treemap as RechartsTreemap,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface TreemapChartProps {
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

interface TreemapContentProps {
  root?: { children?: unknown[] };
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
}

const CustomTreemapContent = (props: TreemapContentProps) => {
  const { depth, x = 0, y = 0, width = 0, height = 0, index = 0, name, value } = props;

  if (depth !== 1 || width < 30 || height < 30) {
    return null;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[index % COLORS.length]}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        rx={4}
      />
      {width > 50 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontFamily="monospace"
          >
            {name && name.length > 12 ? `${name.slice(0, 12)}...` : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
            fontFamily="monospace"
          >
            {value?.toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
};

export function TreemapChartComponent({ config, data }: TreemapChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const aggregated = aggregateData(
    data,
    config.xAxis,
    yMetric,
    config.aggregation || "sum"
  );

  const chartData = aggregated.map((item) => ({
    name: item.name,
    value: item.value,
  }));

  const titlePosition = config.titlePosition || "top";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsTreemap
            data={chartData}
            dataKey="value"
            nameKey="name"
            stroke="hsl(var(--background))"
            content={<CustomTreemapContent />}
          >
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
          </RechartsTreemap>
        </ResponsiveContainer>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
