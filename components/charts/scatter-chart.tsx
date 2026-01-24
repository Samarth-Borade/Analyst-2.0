"use client";

import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";
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
  // Slider ranges: [start%, end%] - 0 to 100
  const [xRange, setXRange] = useState<[number, number]>([0, 100]);
  const [yRange, setYRange] = useState<[number, number]>([0, 100]);
  
  if (!config.xAxis || !config.yAxis) return null;

  const yMetric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const chartData = data.map((row) => ({
    x: Number(row[config.xAxis as string]) || 0,
    y: Number(row[yMetric]) || 0,
    z: config.groupBy ? Number(row[config.groupBy]) || 10 : 10,
  }));
  
  // Calculate data bounds
  const xValues = chartData.map(d => d.x);
  const yValues = chartData.map(d => d.y);
  const dataXMin = Math.min(...xValues);
  const dataXMax = Math.max(...xValues);
  const dataYMin = Math.min(...yValues);
  const dataYMax = Math.max(...yValues);
  
  // Add 5% padding to data bounds
  const xPadding = (dataXMax - dataXMin) * 0.05;
  const yPadding = (dataYMax - dataYMin) * 0.05;
  const fullXMin = dataXMin - xPadding;
  const fullXMax = dataXMax + xPadding;
  const fullYMin = dataYMin - yPadding;
  const fullYMax = dataYMax + yPadding;
  
  // Calculate visible domain based on slider ranges
  const xDomain: [number, number] = [
    fullXMin + (xRange[0] / 100) * (fullXMax - fullXMin),
    fullXMin + (xRange[1] / 100) * (fullXMax - fullXMin),
  ];
  const yDomain: [number, number] = [
    fullYMin + (yRange[0] / 100) * (fullYMax - fullYMin),
    fullYMin + (yRange[1] / 100) * (fullYMax - fullYMin),
  ];
  
  const isZoomed = xRange[0] > 0 || xRange[1] < 100 || yRange[0] > 0 || yRange[1] < 100;
  const titlePosition = config.titlePosition || "top";
  
  const resetZoom = () => {
    setXRange([0, 100]);
    setYRange([0, 100]);
  };

  return (
    <Card className="h-full bg-card border-border">
      <ChartTitleHeader title={config.title} position={titlePosition}>
        {isZoomed && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={resetZoom}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </ChartTitleHeader>
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <div className="flex gap-2">
          {/* Main chart area */}
          <div className="flex-1 flex flex-col">
            <ResponsiveContainer width="100%" height={180}>
              <RechartsScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border opacity-50"
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={config.xAxis}
                  domain={xDomain}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground fill-muted-foreground"
                  allowDataOverflow
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yMetric}
                  domain={yDomain}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground fill-muted-foreground"
                  allowDataOverflow
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
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Scatter
                  data={chartData}
                  fill={config.colors?.[0] || COLORS[0]}
                  fillOpacity={0.7}
                />
              </RechartsScatterChart>
            </ResponsiveContainer>
            
            {/* X-axis slider (horizontal at bottom) */}
            <div className="px-8 pt-1">
              <Slider
                value={xRange}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setXRange(value as [number, number])}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Y-axis slider (vertical on right) */}
          <div className="flex flex-col justify-center h-[180px] py-2">
            <Slider
              value={[100 - yRange[1], 100 - yRange[0]]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => setYRange([100 - value[1], 100 - value[0]])}
              orientation="vertical"
              className="h-full"
            />
          </div>
        </div>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </Card>
  );
}
