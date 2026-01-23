"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/lib/store";

interface BoxPlotChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

interface BoxPlotStats {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

function calculateQuartiles(values: number[]): { q1: number; median: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = sorted.slice(Math.ceil(n / 2));

  const q1 =
    lowerHalf.length % 2 === 0
      ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
      : lowerHalf[Math.floor(lowerHalf.length / 2)];

  const q3 =
    upperHalf.length % 2 === 0
      ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
      : upperHalf[Math.floor(upperHalf.length / 2)];

  return { q1, median, q3 };
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
];

export function BoxPlotChartComponent({ config, data }: BoxPlotChartProps) {
  const categoryField = config.xAxis;
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  if (!valueField) return null;

  // Group data by category
  const categories = categoryField
    ? [...new Set(data.map((d) => String(d[categoryField])))]
    : ["All"];

  const boxPlotData: BoxPlotStats[] = categories.map((category) => {
    const filtered = categoryField
      ? data.filter((d) => String(d[categoryField]) === category)
      : data;

    const values = filtered
      .map((d) => Number(d[valueField]))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return { category, min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
    }

    const { q1, median, q3 } = calculateQuartiles(values);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const outliers = values.filter((v) => v < lowerFence || v > upperFence);
    const nonOutliers = values.filter((v) => v >= lowerFence && v <= upperFence);

    return {
      category,
      min: Math.min(...nonOutliers),
      q1,
      median,
      q3,
      max: Math.max(...nonOutliers),
      outliers,
    };
  });

  const allValues = boxPlotData.flatMap((d) => [d.min, d.max, ...d.outliers]);
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const range = globalMax - globalMin || 1;

  const chartHeight = 180;
  const chartWidth = Math.max(400, categories.length * 80);
  const boxWidth = 40;
  const padding = 40;

  const scaleY = (value: number) =>
    chartHeight - padding - ((value - globalMin) / range) * (chartHeight - 2 * padding);

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="font-mono">
          {/* Y-axis */}
          <line
            x1={padding}
            y1={padding - 10}
            x2={padding}
            y2={chartHeight - padding + 10}
            stroke="currentColor"
            className="text-border"
          />
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const value = globalMin + pct * range;
            const y = scaleY(value);
            return (
              <g key={pct}>
                <line
                  x1={padding - 5}
                  y1={y}
                  x2={padding}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-muted-foreground fill-muted-foreground"
                  fontSize={9}
                >
                  {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Box plots */}
          {boxPlotData.map((box, index) => {
            const x = padding + 40 + index * 70;
            const color = COLORS[index % COLORS.length];

            return (
              <g key={box.category}>
                {/* Whisker lines */}
                <line
                  x1={x}
                  y1={scaleY(box.min)}
                  x2={x}
                  y2={scaleY(box.q1)}
                  stroke={color}
                  strokeWidth={1}
                />
                <line
                  x1={x}
                  y1={scaleY(box.q3)}
                  x2={x}
                  y2={scaleY(box.max)}
                  stroke={color}
                  strokeWidth={1}
                />

                {/* Whisker caps */}
                <line
                  x1={x - boxWidth / 4}
                  y1={scaleY(box.min)}
                  x2={x + boxWidth / 4}
                  y2={scaleY(box.min)}
                  stroke={color}
                  strokeWidth={2}
                />
                <line
                  x1={x - boxWidth / 4}
                  y1={scaleY(box.max)}
                  x2={x + boxWidth / 4}
                  y2={scaleY(box.max)}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Box */}
                <rect
                  x={x - boxWidth / 2}
                  y={scaleY(box.q3)}
                  width={boxWidth}
                  height={scaleY(box.q1) - scaleY(box.q3)}
                  fill={color}
                  fillOpacity={0.3}
                  stroke={color}
                  strokeWidth={2}
                  rx={4}
                />

                {/* Median line */}
                <line
                  x1={x - boxWidth / 2}
                  y1={scaleY(box.median)}
                  x2={x + boxWidth / 2}
                  y2={scaleY(box.median)}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Outliers */}
                {box.outliers.map((outlier, oi) => (
                  <circle
                    key={oi}
                    cx={x}
                    cy={scaleY(outlier)}
                    r={3}
                    fill={color}
                    fillOpacity={0.5}
                  />
                ))}

                {/* Category label */}
                <text
                  x={x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="text-muted-foreground fill-muted-foreground"
                  fontSize={10}
                >
                  {box.category.length > 8 ? `${box.category.slice(0, 8)}...` : box.category}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
