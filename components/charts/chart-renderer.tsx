"use client";

import { useMemo } from "react";
import { KPICard } from "./kpi-card";
import { BarChartComponent } from "./bar-chart";
import { LineChartComponent } from "./line-chart";
import { PieChartComponent } from "./pie-chart";
import { AreaChartComponent } from "./area-chart";
import { DataTableComponent } from "./data-table";
import { ScatterChartComponent } from "./scatter-chart";
import { TreemapChartComponent } from "./treemap-chart";
import { WaterfallChartComponent } from "./waterfall-chart";
import { FunnelChartComponent } from "./funnel-chart";
import { GaugeChartComponent } from "./gauge-chart";
import { RadarChartComponent } from "./radar-chart";
import { HeatmapChartComponent } from "./heatmap-chart";
import { MatrixComponent } from "./matrix-table";
import { BubbleChartComponent } from "./bubble-chart";
import { HistogramChartComponent } from "./histogram-chart";
import { BoxPlotChartComponent } from "./box-plot-chart";
import { ComboChartComponent } from "./combo-chart";
import { MapChartComponent } from "./map-chart";
import { MultiRowCardComponent } from "./multi-row-card";
import { RibbonChartComponent } from "./ribbon-chart";
import { SankeyChartComponent } from "./sankey-chart";
import { BulletChartComponent } from "./bullet-chart";
import { SlicerComponent } from "./slicer";
import { useVisualization } from "@/lib/visualization-context";
import type { ChartConfig } from "@/lib/store";

interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  onFilterChange?: (column: string, values: string[]) => void;
  onDrillDown?: (value: string, field: string) => void;
  onCrossFilter?: (value: string, field: string) => void;
  crossFilterValue?: string | null;
}

export function ChartRenderer({ 
  config, 
  data, 
  onFilterChange,
  onDrillDown,
  onCrossFilter,
  crossFilterValue,
}: ChartRendererProps) {
  // Get dashboard style colors from visualization context
  const { dashboardStyle } = useVisualization();
  
  // Merge dashboard palette colors into config if chart doesn't have custom colors
  const styledConfig = useMemo(() => {
    // If chart already has custom colors, keep them; otherwise use dashboard palette
    if (config.colors && config.colors.length > 0) {
      return config;
    }
    return {
      ...config,
      colors: dashboardStyle.colorPalette,
    };
  }, [config, dashboardStyle.colorPalette]);

  switch (config.type) {
    case "kpi":
      return <KPICard config={styledConfig} data={data} />;
    case "card":
      return <KPICard config={styledConfig} data={data} />;
    case "multi-row-card":
      return <MultiRowCardComponent config={styledConfig} data={data} />;
    case "bar":
    case "stacked-bar":
    case "clustered-bar":
    case "100-stacked-bar":
    case "column":
    case "stacked-column":
    case "clustered-column":
    case "100-stacked-column":
      return (
        <BarChartComponent 
          config={styledConfig} 
          data={data} 
          onDrillDown={onDrillDown}
          onCrossFilter={onCrossFilter}
          crossFilterValue={crossFilterValue}
        />
      );
    case "line":
      return (
        <LineChartComponent 
          config={styledConfig} 
          data={data}
          onDrillDown={onDrillDown}
          onCrossFilter={onCrossFilter}
          crossFilterValue={crossFilterValue}
        />
      );
    case "area":
    case "stacked-area":
    case "100-stacked-area":
      return <AreaChartComponent config={styledConfig} data={data} />;
    case "combo":
    case "line-clustered-column":
    case "line-stacked-column":
      return <ComboChartComponent config={styledConfig} data={data} />;
    case "pie":
    case "donut":
      return (
        <PieChartComponent 
          config={styledConfig} 
          data={data}
          onDrillDown={onDrillDown}
          onCrossFilter={onCrossFilter}
          crossFilterValue={crossFilterValue}
        />
      );
    case "table":
      return <DataTableComponent config={styledConfig} data={data} />;
    case "matrix":
      return <MatrixComponent config={styledConfig} data={data} />;
    case "scatter":
      return <ScatterChartComponent config={styledConfig} data={data} />;
    case "bubble":
      return <BubbleChartComponent config={styledConfig} data={data} />;
    case "treemap":
      return <TreemapChartComponent config={styledConfig} data={data} />;
    case "waterfall":
      return <WaterfallChartComponent config={styledConfig} data={data} />;
    case "funnel":
      return <FunnelChartComponent config={styledConfig} data={data} />;
    case "gauge":
      return <GaugeChartComponent config={styledConfig} data={data} />;
    case "radar":
      return <RadarChartComponent config={styledConfig} data={data} />;
    case "heatmap":
      return <HeatmapChartComponent config={styledConfig} data={data} />;
    case "histogram":
      return <HistogramChartComponent config={styledConfig} data={data} />;
    case "box-plot":
      return <BoxPlotChartComponent config={styledConfig} data={data} />;
    case "map":
    case "filled-map":
    case "bubble-map":
      return <MapChartComponent config={styledConfig} data={data} />;
    case "ribbon":
      return <RibbonChartComponent config={styledConfig} data={data} />;
    case "sankey":
      return <SankeyChartComponent config={styledConfig} data={data} />;
    case "bullet":
      return <BulletChartComponent config={styledConfig} data={data} />;
    case "slicer":
    case "list-slicer":
    case "dropdown-slicer":
    case "date-slicer":
    case "numeric-slicer":
      return <SlicerComponent config={styledConfig} data={data} onFilterChange={onFilterChange} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground font-mono">
          Unsupported chart type: {config.type}
        </div>
      );
  }
}
