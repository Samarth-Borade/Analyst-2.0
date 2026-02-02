"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import type { ChartConfig } from "@/lib/store";
import { useMemo } from "react";

interface MapChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

// Simplified US state coordinates for demo
const US_STATES: Record<string, { x: number; y: number; name: string }> = {
  AL: { x: 560, y: 340, name: "Alabama" },
  AK: { x: 100, y: 420, name: "Alaska" },
  AZ: { x: 200, y: 320, name: "Arizona" },
  AR: { x: 480, y: 310, name: "Arkansas" },
  CA: { x: 100, y: 250, name: "California" },
  CO: { x: 280, y: 240, name: "Colorado" },
  CT: { x: 680, y: 160, name: "Connecticut" },
  DE: { x: 670, y: 210, name: "Delaware" },
  FL: { x: 620, y: 400, name: "Florida" },
  GA: { x: 590, y: 340, name: "Georgia" },
  HI: { x: 200, y: 420, name: "Hawaii" },
  ID: { x: 180, y: 140, name: "Idaho" },
  IL: { x: 520, y: 220, name: "Illinois" },
  IN: { x: 550, y: 220, name: "Indiana" },
  IA: { x: 460, y: 180, name: "Iowa" },
  KS: { x: 380, y: 260, name: "Kansas" },
  KY: { x: 560, y: 260, name: "Kentucky" },
  LA: { x: 480, y: 380, name: "Louisiana" },
  ME: { x: 710, y: 80, name: "Maine" },
  MD: { x: 650, y: 220, name: "Maryland" },
  MA: { x: 690, y: 140, name: "Massachusetts" },
  MI: { x: 550, y: 140, name: "Michigan" },
  MN: { x: 440, y: 100, name: "Minnesota" },
  MS: { x: 520, y: 350, name: "Mississippi" },
  MO: { x: 470, y: 260, name: "Missouri" },
  MT: { x: 240, y: 100, name: "Montana" },
  NE: { x: 360, y: 200, name: "Nebraska" },
  NV: { x: 150, y: 220, name: "Nevada" },
  NH: { x: 690, y: 110, name: "New Hampshire" },
  NJ: { x: 670, y: 190, name: "New Jersey" },
  NM: { x: 260, y: 320, name: "New Mexico" },
  NY: { x: 650, y: 140, name: "New York" },
  NC: { x: 620, y: 280, name: "North Carolina" },
  ND: { x: 360, y: 90, name: "North Dakota" },
  OH: { x: 580, y: 210, name: "Ohio" },
  OK: { x: 390, y: 310, name: "Oklahoma" },
  OR: { x: 120, y: 120, name: "Oregon" },
  PA: { x: 630, y: 180, name: "Pennsylvania" },
  RI: { x: 695, y: 155, name: "Rhode Island" },
  SC: { x: 610, y: 310, name: "South Carolina" },
  SD: { x: 360, y: 140, name: "South Dakota" },
  TN: { x: 540, y: 290, name: "Tennessee" },
  TX: { x: 350, y: 380, name: "Texas" },
  UT: { x: 210, y: 230, name: "Utah" },
  VT: { x: 680, y: 100, name: "Vermont" },
  VA: { x: 620, y: 250, name: "Virginia" },
  WA: { x: 140, y: 60, name: "Washington" },
  WV: { x: 600, y: 240, name: "West Virginia" },
  WI: { x: 490, y: 130, name: "Wisconsin" },
  WY: { x: 270, y: 170, name: "Wyoming" },
};

const COLORS = {
  low: "#ddd6fe",
  medium: "#a78bfa",
  high: "#7c3aed",
  highest: "#5b21b6",
};

export function MapChartComponent({ config, data }: MapChartProps) {
  const locationField = config.xAxis;
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const mapData = useMemo(() => {
    if (!locationField || !valueField) return [];

    const aggregated: Record<string, number> = {};

    data.forEach((row) => {
      const location = String(row[locationField]).toUpperCase().trim();
      const value = Number(row[valueField]) || 0;

      // Try to match state abbreviation or name
      let stateCode = location;
      if (location.length > 2) {
        const found = Object.entries(US_STATES).find(
          ([, s]) => s.name.toUpperCase() === location
        );
        if (found) stateCode = found[0];
      }

      if (US_STATES[stateCode]) {
        aggregated[stateCode] = (aggregated[stateCode] || 0) + value;
      }
    });

    return Object.entries(aggregated).map(([code, value]) => ({
      code,
      ...US_STATES[code],
      value,
    }));
  }, [data, locationField, valueField]);

  const maxValue = Math.max(...mapData.map((d) => d.value), 1);
  const minValue = Math.min(...mapData.map((d) => d.value), 0);

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    if (normalized < 0.25) return COLORS.low;
    if (normalized < 0.5) return COLORS.medium;
    if (normalized < 0.75) return COLORS.high;
    return COLORS.highest;
  };

  const getBubbleSize = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    return 8 + normalized * 20;
  };

  if (!locationField || !valueField) {
    return (
      <Card className="h-full bg-card border-border">
        <CardContent className="h-full flex items-center justify-center text-muted-foreground">
          Configure location and value fields for map
        </CardContent>
      </Card>
    );
  }

  const isBubbleMap = config.type === "bubble-map" || config.type === "map";
  const titlePosition = config.titlePosition || "top";

  return (
    <Card className="h-full bg-card border-border">
      <ChartTitleHeader title={config.title} position={titlePosition} />
      <CardContent className={titlePosition === "bottom" ? "pt-4" : "pt-0"}>
        <div className="relative w-full h-[200px] bg-muted/20 rounded-lg overflow-hidden">
          <svg viewBox="0 0 800 500" className="w-full h-full">
            {/* US outline simplified */}
            <rect
              x="80"
              y="40"
              width="660"
              height="420"
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              rx="8"
            />

            {/* Grid dots for reference */}
            {Array.from({ length: 20 }).map((_, i) =>
              Array.from({ length: 12 }).map((_, j) => (
                <circle
                  key={`${i}-${j}`}
                  cx={100 + i * 32}
                  cy={60 + j * 35}
                  r={1}
                  fill="currentColor"
                  opacity={0.1}
                />
              ))
            )}

            {/* Map points */}
            {mapData.map((point) => (
              <g key={point.code}>
                {isBubbleMap ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={getBubbleSize(point.value)}
                    fill={config.colors?.[0] || "#8b5cf6"}
                    fillOpacity={0.6}
                    stroke={config.colors?.[0] || "#8b5cf6"}
                    strokeWidth={1}
                  >
                    <title>
                      {point.name}: {point.value.toLocaleString()}
                    </title>
                  </circle>
                ) : (
                  <rect
                    x={point.x - 15}
                    y={point.y - 10}
                    width={30}
                    height={20}
                    fill={getColor(point.value)}
                    rx={4}
                  >
                    <title>
                      {point.name}: {point.value.toLocaleString()}
                    </title>
                  </rect>
                )}
                <text
                  x={point.x}
                  y={point.y + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="monospace"
                  fill={isBubbleMap ? "hsl(var(--foreground))" : "#fff"}
                >
                  {point.code}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs font-mono bg-background/80 p-2 rounded">
            <span className="text-muted-foreground">Low</span>
            <div className="flex gap-0.5">
              {Object.values(COLORS).map((color) => (
                <div
                  key={color}
                  className="w-4 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-muted-foreground">High</span>
          </div>
        </div>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </Card>
  );
}
