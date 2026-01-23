"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateKPI, formatNumber } from "@/lib/data-utils";
import type { ChartConfig } from "@/lib/store";

interface BulletChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

export function BulletChartComponent({ config, data }: BulletChartProps) {
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const targetField = Array.isArray(config.yAxis) && config.yAxis[1] ? config.yAxis[1] : null;
  const categoryField = config.xAxis;

  if (!valueField) {
    return (
      <Card className="h-full bg-card border-border">
        <CardContent className="h-full flex items-center justify-center text-muted-foreground">
          Configure a value field
        </CardContent>
      </Card>
    );
  }

  // Create bullet data per category or single bullet
  const categories = categoryField
    ? [...new Set(data.map((d) => String(d[categoryField])))].slice(0, 5)
    : ["Total"];

  const bullets = categories.map((category) => {
    const filtered = categoryField
      ? data.filter((d) => String(d[categoryField]) === category)
      : data;

    const actual = calculateKPI(filtered, valueField, config.aggregation || "sum");
    const target = targetField
      ? calculateKPI(filtered, targetField, config.aggregation || "sum")
      : actual * 1.2; // Default target is 120% of actual

    return {
      category,
      actual,
      target,
      poor: target * 0.5,
      satisfactory: target * 0.75,
      good: target,
    };
  });

  const maxValue = Math.max(...bullets.map((b) => Math.max(b.actual, b.target) * 1.1));

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {bullets.map((bullet, index) => {
            const actualPercent = (bullet.actual / maxValue) * 100;
            const targetPercent = (bullet.target / maxValue) * 100;
            const poorPercent = (bullet.poor / maxValue) * 100;
            const satisfactoryPercent = (bullet.satisfactory / maxValue) * 100;
            const goodPercent = (bullet.good / maxValue) * 100;

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground truncate max-w-[150px]">
                    {bullet.category}
                  </span>
                  <span className="text-foreground font-medium">
                    {formatNumber(bullet.actual)} / {formatNumber(bullet.target)}
                  </span>
                </div>
                <div className="relative h-6 rounded overflow-hidden">
                  {/* Background ranges */}
                  <div className="absolute inset-0 flex">
                    <div
                      className="h-full bg-muted/80"
                      style={{ width: `${poorPercent}%` }}
                    />
                    <div
                      className="h-full bg-muted/50"
                      style={{ width: `${satisfactoryPercent - poorPercent}%` }}
                    />
                    <div
                      className="h-full bg-muted/30"
                      style={{ width: `${goodPercent - satisfactoryPercent}%` }}
                    />
                    <div
                      className="h-full bg-muted/10"
                      style={{ width: `${100 - goodPercent}%` }}
                    />
                  </div>

                  {/* Actual value bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 rounded"
                    style={{
                      width: `${actualPercent}%`,
                      backgroundColor: config.colors?.[0] || "#8b5cf6",
                    }}
                  />

                  {/* Target marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                    style={{ left: `${targetPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: config.colors?.[0] || "#8b5cf6" }}
            />
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-0.5 h-3 bg-foreground" />
            <span>Target</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
