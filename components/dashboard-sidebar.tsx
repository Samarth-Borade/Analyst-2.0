"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Hash,
  Calendar,
  Type,
  BarChart3,
  Trash2,
  Edit2,
  Check,
  X,
  Database,
  Table2,
  GitBranch,
  PieChart,
  LineChart,
  AreaChart,
  TrendingUp,
  Grid3X3,
  Gauge,
  Activity,
  MapPin,
  Filter,
  BarChart2,
  ScatterChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/lib/store";

// Chart type definitions with icons and prompts
const CHART_TYPES = [
  { type: "kpi", name: "KPI Card", icon: TrendingUp, prompt: "Create a KPI card showing" },
  { type: "bar", name: "Bar Chart", icon: BarChart3, prompt: "Create a bar chart showing" },
  { type: "column", name: "Column Chart", icon: BarChart2, prompt: "Create a column chart showing" },
  { type: "line", name: "Line Chart", icon: LineChart, prompt: "Create a line chart showing" },
  { type: "area", name: "Area Chart", icon: AreaChart, prompt: "Create an area chart showing" },
  { type: "pie", name: "Pie Chart", icon: PieChart, prompt: "Create a pie chart showing" },
  { type: "donut", name: "Donut Chart", icon: PieChart, prompt: "Create a donut chart showing" },
  { type: "scatter", name: "Scatter Chart", icon: ScatterChart, prompt: "Create a scatter chart showing" },
  { type: "table", name: "Table", icon: Table2, prompt: "Create a table showing" },
  { type: "matrix", name: "Matrix", icon: Grid3X3, prompt: "Create a matrix showing" },
  { type: "gauge", name: "Gauge", icon: Gauge, prompt: "Create a gauge showing" },
  { type: "treemap", name: "Treemap", icon: Grid3X3, prompt: "Create a treemap showing" },
  { type: "heatmap", name: "Heatmap", icon: Grid3X3, prompt: "Create a heatmap showing" },
  { type: "funnel", name: "Funnel", icon: Filter, prompt: "Create a funnel chart showing" },
  { type: "radar", name: "Radar Chart", icon: Activity, prompt: "Create a radar chart showing" },
  { type: "map", name: "Map", icon: MapPin, prompt: "Create a map showing" },
  { type: "waterfall", name: "Waterfall", icon: BarChart3, prompt: "Create a waterfall chart showing" },
  { type: "combo", name: "Combo Chart", icon: Activity, prompt: "Create a combo chart showing" },
  { type: "slicer", name: "Slicer", icon: Filter, prompt: "Create a slicer for" },
];

export function DashboardSidebar() {
  const {
    schema,
    pages,
    currentPageId,
    setCurrentPage,
    addPage,
    updatePage,
    deletePage,
    sidebarCollapsed,
    toggleSidebar,
    currentView,
    setCurrentView,
    setPendingPrompt,
  } = useDashboardStore();

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [truncatedPages, setTruncatedPages] = useState<Set<string>>(new Set());
  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const [dimensionsExpanded, setDimensionsExpanded] = useState(true);
  const pageNameRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Check which page names are truncated
  useEffect(() => {
    const checkTruncation = () => {
      const newTruncated = new Set<string>();
      pageNameRefs.current.forEach((el, pageId) => {
        if (el && el.scrollWidth > el.clientWidth) {
          newTruncated.add(pageId);
        }
      });
      setTruncatedPages(newTruncated);
    };
    
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [pages]);

  const handleAddPage = () => {
    const newPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      charts: [],
    };
    addPage(newPage);
  };

  const startEditingPage = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditName(currentName);
  };

  const savePageName = () => {
    if (editingPageId && editName.trim()) {
      updatePage(editingPageId, { name: editName.trim() });
    }
    setEditingPageId(null);
    setEditName("");
  };

  const cancelEdit = () => {
    setEditingPageId(null);
    setEditName("");
  };

  const handleChartTypeClick = (chartType: typeof CHART_TYPES[0]) => {
    setPendingPrompt(chartType.prompt + " ");
    setCurrentView("dashboard");
  };

  const getColumnIcon = (type: string) => {
    switch (type) {
      case "numeric":
        return <Hash className="h-3.5 w-3.5" />;
      case "datetime":
        return <Calendar className="h-3.5 w-3.5" />;
      case "categorical":
        return <BarChart3 className="h-3.5 w-3.5" />;
      default:
        return <Type className="h-3.5 w-3.5" />;
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-12 h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {pages.map((page) => (
          <Button
            key={page.id}
            variant={currentPageId === page.id ? "secondary" : "ghost"}
            size="icon"
            className="mb-1"
            onClick={() => setCurrentPage(page.id)}
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-sidebar-foreground font-mono">Dashboard</h2>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Visualizations/Chart Picker Section */}
        <div className="p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 font-mono">
            Visualizations
          </h3>
          <div className="grid grid-cols-5 gap-1">
            {CHART_TYPES.map((chartType) => {
              const IconComponent = chartType.icon;
              return (
                <Tooltip key={chartType.type}>
                  <TooltipTrigger asChild>
                    <button
                      className="p-2 rounded-md hover:bg-sidebar-accent/50 transition-colors flex items-center justify-center"
                      onClick={() => handleChartTypeClick(chartType)}
                    >
                      <IconComponent className="h-4 w-4 text-sidebar-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-mono text-xs">
                    {chartType.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Data Section - At top for quick access */}
        <div className="p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 font-mono">
            Data
          </h3>
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                currentView === "data"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}
              onClick={() => setCurrentView("data")}
            >
              <Table2 className="h-4 w-4 shrink-0" />
              <span className="text-sm font-mono">Data Sources</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                currentView === "data-modeling"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}
              onClick={() => setCurrentView("data-modeling")}
            >
              <GitBranch className="h-4 w-4 shrink-0" />
              <span className="text-sm font-mono">Data Modeling</span>
            </div>
          </div>
        </div>

        {/* Pages Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
              Pages
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleAddPage}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {pages.map((page) => (
              <div
                key={page.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  currentPageId === page.id && currentView === "dashboard"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                )}
                onClick={() => {
                  setCurrentPage(page.id);
                  setCurrentView("dashboard");
                }}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {editingPageId === page.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-sm font-mono"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePageName();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        savePageName();
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {truncatedPages.has(page.id) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span 
                            ref={(el) => {
                              if (el) pageNameRefs.current.set(page.id, el);
                            }}
                            className="flex-1 truncate text-sm font-mono"
                          >
                            {page.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-mono">
                          {page.name}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span 
                        ref={(el) => {
                          if (el) pageNameRefs.current.set(page.id, el);
                        }}
                        className="flex-1 truncate text-sm font-mono"
                      >
                        {page.name}
                      </span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingPage(page.id, page.name);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {pages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePage(page.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fields Section */}
        {schema && (
          <div className="p-4 border-t border-sidebar-border">
            {/* Fields Header - Collapsible */}
            <button
              className="flex items-center justify-between w-full mb-3 group"
              onClick={() => setFieldsExpanded(!fieldsExpanded)}
            >
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                Fields
              </h3>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  !fieldsExpanded && "-rotate-90"
                )} 
              />
            </button>

            {fieldsExpanded && (
              <>
                {/* Metrics - Collapsible */}
                <div className="mb-4">
                  <button
                    className="flex items-center justify-between w-full mb-2 group"
                    onClick={() => setMetricsExpanded(!metricsExpanded)}
                  >
                    <h4 className="text-xs text-muted-foreground font-mono">Metrics</h4>
                    <ChevronDown 
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        !metricsExpanded && "-rotate-90"
                      )} 
                    />
                  </button>
                  {metricsExpanded && (
                    <div className="space-y-1">
                      {schema.columns
                        .filter((c) => c.isMetric)
                        .map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground rounded hover:bg-sidebar-accent/50 cursor-pointer font-mono"
                          >
                            {getColumnIcon(column.type)}
                            <span className="truncate">{column.name}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Dimensions - Collapsible */}
                <div className="pb-40">
                  <button
                    className="flex items-center justify-between w-full mb-2 group"
                    onClick={() => setDimensionsExpanded(!dimensionsExpanded)}
                  >
                    <h4 className="text-xs text-muted-foreground font-mono">Dimensions</h4>
                    <ChevronDown 
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        !dimensionsExpanded && "-rotate-90"
                      )} 
                    />
                  </button>
                  {dimensionsExpanded && (
                    <div className="space-y-1">
                      {schema.columns
                        .filter((c) => c.isDimension)
                        .map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground rounded hover:bg-sidebar-accent/50 cursor-pointer font-mono"
                          >
                            {getColumnIcon(column.type)}
                            <span className="truncate">{column.name}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
    </TooltipProvider>
  );
}
