"use client";

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
import type { ChartConfig } from "@/lib/store";

interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  onFilterChange?: (column: string, values: string[]) => void;
}

export function ChartRenderer({ config, data, onFilterChange }: ChartRendererProps) {
  switch (config.type) {
    case "kpi":
      return <KPICard config={config} data={data} />;
    case "card":
      return <KPICard config={config} data={data} />;
    case "multi-row-card":
      return <MultiRowCardComponent config={config} data={data} />;
    case "bar":
    case "stacked-bar":
    case "clustered-bar":
    case "100-stacked-bar":
    case "column":
    case "stacked-column":
    case "clustered-column":
    case "100-stacked-column":
      return <BarChartComponent config={config} data={data} />;
    case "line":
      return <LineChartComponent config={config} data={data} />;
    case "area":
    case "stacked-area":
    case "100-stacked-area":
      return <AreaChartComponent config={config} data={data} />;
    case "combo":
    case "line-clustered-column":
    case "line-stacked-column":
      return <ComboChartComponent config={config} data={data} />;
    case "pie":
    case "donut":
      return <PieChartComponent config={config} data={data} />;
    case "table":
      return <DataTableComponent config={config} data={data} />;
    case "matrix":
      return <MatrixComponent config={config} data={data} />;
    case "scatter":
      return <ScatterChartComponent config={config} data={data} />;
    case "bubble":
      return <BubbleChartComponent config={config} data={data} />;
    case "treemap":
      return <TreemapChartComponent config={config} data={data} />;
    case "waterfall":
      return <WaterfallChartComponent config={config} data={data} />;
    case "funnel":
      return <FunnelChartComponent config={config} data={data} />;
    case "gauge":
      return <GaugeChartComponent config={config} data={data} />;
    case "radar":
      return <RadarChartComponent config={config} data={data} />;
    case "heatmap":
      return <HeatmapChartComponent config={config} data={data} />;
    case "histogram":
      return <HistogramChartComponent config={config} data={data} />;
    case "box-plot":
      return <BoxPlotChartComponent config={config} data={data} />;
    case "map":
    case "filled-map":
    case "bubble-map":
      return <MapChartComponent config={config} data={data} />;
    case "ribbon":
      return <RibbonChartComponent config={config} data={data} />;
    case "sankey":
      return <SankeyChartComponent config={config} data={data} />;
    case "bullet":
      return <BulletChartComponent config={config} data={data} />;
    case "slicer":
    case "list-slicer":
    case "dropdown-slicer":
    case "date-slicer":
    case "numeric-slicer":
      return <SlicerComponent config={config} data={data} onFilterChange={onFilterChange} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground font-mono">
          Unsupported chart type: {config.type}
        </div>
      );
  }
}
