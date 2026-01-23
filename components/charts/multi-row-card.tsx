"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber, calculateKPI } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

interface MultiRowCardProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

export function MultiRowCardComponent({ config, data }: MultiRowCardProps) {
  const categoryField = config.xAxis;
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  if (!valueField) {
    return (
      <Card className="h-full bg-card border-border">
        <CardContent className="h-full flex items-center justify-center text-muted-foreground font-mono">
          Configure a value field
        </CardContent>
      </Card>
    );
  }

  // If category field is set, show KPIs per category
  // Otherwise show multiple metrics
  const metrics: { label: string; value: number; trend?: number }[] = [];

  if (categoryField) {
    const categories = [...new Set(data.map((d) => String(d[categoryField])))].slice(0, 6);

    categories.forEach((category) => {
      const filtered = data.filter((d) => String(d[categoryField]) === category);
      const value = calculateKPI(filtered, valueField, config.aggregation || "sum");
      metrics.push({ label: category, value });
    });
  } else {
    // Show the configured metric
    const value = calculateKPI(data, valueField, config.aggregation || "sum");
    metrics.push({ label: valueField, value });

    // Add additional y-axis metrics if available
    if (Array.isArray(config.yAxis)) {
      config.yAxis.slice(1, 6).forEach((metric) => {
        const val = calculateKPI(data, metric, config.aggregation || "sum");
        metrics.push({ label: metric, value: val });
      });
    }
  }

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                "bg-muted/30 hover:bg-muted/50 transition-colors"
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                  {metric.label}
                </span>
                <span className="text-lg font-bold text-foreground font-mono">
                  {formatNumber(metric.value)}
                </span>
              </div>
              {metric.trend !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-mono",
                    metric.trend > 0
                      ? "text-green-500"
                      : metric.trend < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                  )}
                >
                  {metric.trend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : metric.trend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {Math.abs(metric.trend).toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
