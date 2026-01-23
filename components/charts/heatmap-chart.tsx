"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateData } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface HeatmapChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

function getColorIntensity(value: number, min: number, max: number): string {
  const normalizedValue = (value - min) / (max - min || 1);
  const hue = 258; // Purple hue
  const saturation = 70;
  const lightness = 85 - normalizedValue * 45; // From light to dark
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function HeatmapChartComponent({ config, data }: HeatmapChartProps) {
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  // Get unique values for both dimensions
  const xValues = [...new Set(data.map((d) => String(d[config.xAxis as string])))].slice(0, 8);
  const yValues = config.groupBy
    ? [...new Set(data.map((d) => String(d[config.groupBy as string])))].slice(0, 6)
    : ["All"];

  // Build matrix
  const matrix: { x: string; y: string; value: number }[] = [];
  let minValue = Infinity;
  let maxValue = -Infinity;

  xValues.forEach((x) => {
    yValues.forEach((y) => {
      const filtered = data.filter((d) => {
        const matchX = String(d[config.xAxis as string]) === x;
        const matchY = !config.groupBy || String(d[config.groupBy]) === y;
        return matchX && matchY;
      });

      const value = filtered.reduce((sum, d) => sum + (Number(d[yMetric]) || 0), 0);
      matrix.push({ x, y, value });
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    });
  });

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-auto">
        <div className="flex gap-1">
          {/* Y-axis labels */}
          <div className="flex flex-col gap-1 pr-2">
            <div className="h-5" /> {/* Spacer for x-axis */}
            {yValues.map((y) => (
              <div
                key={y}
                className="h-8 flex items-center justify-end text-xs text-muted-foreground font-mono truncate max-w-[80px]"
              >
                {y}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-1">
            {/* X-axis labels */}
            <div className="flex gap-1">
              {xValues.map((x) => (
                <div
                  key={x}
                  className="w-12 h-5 text-xs text-muted-foreground font-mono truncate text-center"
                >
                  {x.slice(0, 6)}
                </div>
              ))}
            </div>

            {/* Cells */}
            {yValues.map((y) => (
              <div key={y} className="flex gap-1">
                {xValues.map((x) => {
                  const cell = matrix.find((m) => m.x === x && m.y === y);
                  const value = cell?.value || 0;
                  return (
                    <div
                      key={`${x}-${y}`}
                      className="w-12 h-8 rounded flex items-center justify-center text-xs font-mono"
                      style={{
                        backgroundColor: getColorIntensity(value, minValue, maxValue),
                        color: value > (maxValue - minValue) / 2 + minValue ? "#fff" : "#000",
                      }}
                      title={`${x}, ${y}: ${value.toLocaleString()}`}
                    >
                      {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
