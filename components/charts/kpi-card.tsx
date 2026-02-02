"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { StyledChartCard } from "@/components/charts/styled-chart-card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import { cn } from "@/lib/utils";
import { calculateKPI, formatNumber } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface KPICardProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

// Calculate a stable trend based on data characteristics when LLM doesn't provide one
function calculateDataDrivenTrend(
  data: Record<string, unknown>[],
  metric: string,
  aggregation: string
): { trend: "up" | "down" | "flat"; trendValue: number } {
  if (data.length === 0) return { trend: "flat", trendValue: 0 };

  const values = data
    .map((row) => Number(row[metric]) || 0)
    .filter((v) => v !== 0);

  if (values.length < 2) return { trend: "flat", trendValue: 0 };

  // Split data into two halves and compare
  const midPoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midPoint);
  const secondHalf = values.slice(midPoint);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (firstAvg === 0) return { trend: "flat", trendValue: 0 };

  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
  const absChange = Math.abs(percentChange);

  // Determine trend direction
  let trend: "up" | "down" | "flat";
  if (absChange < 2) {
    trend = "flat";
  } else if (percentChange > 0) {
    trend = "up";
  } else {
    trend = "down";
  }

  // Cap the trend value to reasonable bounds
  const cappedValue = Math.min(Math.abs(percentChange), 99.9);

  return { trend, trendValue: cappedValue };
}

export function KPICard({ config, data }: KPICardProps) {
  const metric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  if (!metric) return null;

  const value = calculateKPI(data, metric, config.aggregation || "sum");
  const formattedValue = formatNumber(value);

  // Use trend data from config (provided by LLM analysis)
  // If not provided, calculate from data characteristics for stability
  const calculatedTrend = useMemo(() => {
    if (config.trend !== undefined && config.trendValue !== undefined) {
      return { trend: config.trend, trendValue: config.trendValue };
    }
    return calculateDataDrivenTrend(data, metric, config.aggregation || "sum");
  }, [config.trend, config.trendValue, data, metric, config.aggregation]);

  const trend = calculatedTrend.trend;
  const trendValue = calculatedTrend.trendValue.toFixed(1);
  const titlePosition = config.titlePosition || "top";

  return (
    <StyledChartCard>
      <ChartTitleHeader title={config.title} position={titlePosition} className="pb-2" />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : ""}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground font-mono">{formattedValue}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize font-mono">
              {config.aggregation || "sum"} of {metric}
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
              trend === "up" && "text-green-500 bg-green-500/10",
              trend === "down" && "text-red-500 bg-red-500/10",
              trend === "flat" && "text-muted-foreground bg-muted"
            )}
          >
            {trend === "up" && <TrendingUp className="h-3.5 w-3.5" />}
            {trend === "down" && <TrendingDown className="h-3.5 w-3.5" />}
            {trend === "flat" && <Minus className="h-3.5 w-3.5" />}
            <span>{trendValue}%</span>
          </div>
        </div>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </StyledChartCard>
  );
}
