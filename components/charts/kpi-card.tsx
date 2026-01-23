"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { calculateKPI, formatNumber } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface KPICardProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

export function KPICard({ config, data }: KPICardProps) {
  const metric = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  if (!metric) return null;

  const value = calculateKPI(data, metric, config.aggregation || "sum");
  const formattedValue = formatNumber(value);

  // Calculate a mock trend (in real app, compare to previous period)
  const trend = Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : "flat";
  const trendValue = (Math.random() * 20).toFixed(1);

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
    </Card>
  );
}
