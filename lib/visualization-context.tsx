"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import type { DrillDownContext } from "@/components/drill-down-modal";

// Cross-chart filter selection
export interface CrossChartFilter {
  sourceChartId: string;
  field: string;
  value: string;
  timestamp: number;
}

// Dashboard-level styling configuration
export interface DashboardStyle {
  // Color scheme
  colorPalette: string[];
  primaryColor: string;
  accentColor: string;
  
  // Typography
  fontFamily: "default" | "mono" | "serif" | "rounded";
  titleSize: "sm" | "md" | "lg";
  
  // Layout
  gridGap: "compact" | "normal" | "spacious";
  cardStyle: "flat" | "elevated" | "bordered" | "glass";
  cornerRadius: "none" | "sm" | "md" | "lg" | "full";
  
  // Effects
  showShadows: boolean;
  useGradients: boolean;
  animationsEnabled: boolean;
}

// Pre-built dashboard templates
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: "sales" | "marketing" | "finance" | "operations" | "hr" | "general";
  pages: Array<{
    name: string;
    chartLayouts: Array<{
      type: string;
      width: number;
      height: number;
      suggestedMetric?: string;
      suggestedDimension?: string;
    }>;
  }>;
  style: Partial<DashboardStyle>;
}

// Default color palettes
export const COLOR_PALETTES = {
  default: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e", "#ec4899", "#3b82f6", "#f97316"],
  ocean: ["#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e", "#84cc16", "#3b82f6", "#6366f1", "#8b5cf6"],
  sunset: ["#f97316", "#ef4444", "#ec4899", "#f59e0b", "#eab308", "#f43f5e", "#e11d48", "#be123c"],
  forest: ["#22c55e", "#16a34a", "#15803d", "#14532d", "#84cc16", "#65a30d", "#4d7c0f", "#3f6212"],
  lavender: ["#a855f7", "#8b5cf6", "#7c3aed", "#6d28d9", "#c084fc", "#d946ef", "#e879f9", "#f0abfc"],
  monochrome: ["#18181b", "#27272a", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"],
  pastel: ["#fca5a5", "#fdba74", "#fcd34d", "#bef264", "#86efac", "#5eead4", "#7dd3fc", "#c4b5fd"],
  corporate: ["#1e40af", "#3b82f6", "#0891b2", "#0d9488", "#059669", "#16a34a", "#ca8a04", "#dc2626"],
};

// Default styles
export const DEFAULT_DASHBOARD_STYLE: DashboardStyle = {
  colorPalette: COLOR_PALETTES.default,
  primaryColor: "#8b5cf6",
  accentColor: "#06b6d4",
  fontFamily: "default",
  titleSize: "md",
  gridGap: "normal",
  cardStyle: "bordered",
  cornerRadius: "md",
  showShadows: true,
  useGradients: false,
  animationsEnabled: true,
};

// Pre-built templates
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "sales-overview",
    name: "Sales Overview",
    description: "Track revenue, top products, and sales trends",
    thumbnail: "📊",
    category: "sales",
    pages: [
      {
        name: "Sales Dashboard",
        chartLayouts: [
          { type: "kpi", width: 1, height: 1, suggestedMetric: "revenue" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "orders" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "customers" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "avg_order" },
          { type: "line", width: 2, height: 2, suggestedMetric: "revenue", suggestedDimension: "date" },
          { type: "bar", width: 2, height: 2, suggestedMetric: "revenue", suggestedDimension: "product" },
          { type: "pie", width: 2, height: 2, suggestedMetric: "revenue", suggestedDimension: "region" },
          { type: "table", width: 2, height: 2 },
        ],
      },
    ],
    style: {
      colorPalette: COLOR_PALETTES.corporate,
      primaryColor: "#3b82f6",
      cardStyle: "elevated",
    },
  },
  {
    id: "marketing-analytics",
    name: "Marketing Analytics",
    description: "Campaign performance, conversions, and channel analysis",
    thumbnail: "📈",
    category: "marketing",
    pages: [
      {
        name: "Campaign Overview",
        chartLayouts: [
          { type: "kpi", width: 1, height: 1, suggestedMetric: "impressions" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "clicks" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "conversions" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "ctr" },
          { type: "funnel", width: 2, height: 2 },
          { type: "area", width: 2, height: 2, suggestedMetric: "impressions", suggestedDimension: "date" },
          { type: "bar", width: 4, height: 2, suggestedMetric: "conversions", suggestedDimension: "channel" },
        ],
      },
    ],
    style: {
      colorPalette: COLOR_PALETTES.sunset,
      primaryColor: "#f97316",
      useGradients: true,
    },
  },
  {
    id: "financial-summary",
    name: "Financial Summary",
    description: "Revenue, expenses, profit margins, and cash flow",
    thumbnail: "💰",
    category: "finance",
    pages: [
      {
        name: "Financial Overview",
        chartLayouts: [
          { type: "kpi", width: 1, height: 1, suggestedMetric: "revenue" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "expenses" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "profit" },
          { type: "kpi", width: 1, height: 1, suggestedMetric: "margin" },
          { type: "waterfall", width: 4, height: 2 },
          { type: "combo", width: 2, height: 2, suggestedMetric: "revenue", suggestedDimension: "month" },
          { type: "pie", width: 2, height: 2, suggestedMetric: "expenses", suggestedDimension: "category" },
        ],
      },
    ],
    style: {
      colorPalette: COLOR_PALETTES.forest,
      primaryColor: "#22c55e",
      cardStyle: "glass",
    },
  },
  {
    id: "operations-dashboard",
    name: "Operations Dashboard",
    description: "Inventory, fulfillment, and operational metrics",
    thumbnail: "⚙️",
    category: "operations",
    pages: [
      {
        name: "Operations",
        chartLayouts: [
          { type: "gauge", width: 1, height: 1 },
          { type: "gauge", width: 1, height: 1 },
          { type: "kpi", width: 1, height: 1 },
          { type: "kpi", width: 1, height: 1 },
          { type: "heatmap", width: 2, height: 2 },
          { type: "bar", width: 2, height: 2 },
          { type: "table", width: 4, height: 2 },
        ],
      },
    ],
    style: {
      colorPalette: COLOR_PALETTES.ocean,
      primaryColor: "#0ea5e9",
      cardStyle: "bordered",
    },
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level KPIs and trends for leadership",
    thumbnail: "🎯",
    category: "general",
    pages: [
      {
        name: "Executive View",
        chartLayouts: [
          { type: "kpi", width: 1, height: 1 },
          { type: "kpi", width: 1, height: 1 },
          { type: "kpi", width: 1, height: 1 },
          { type: "kpi", width: 1, height: 1 },
          { type: "line", width: 4, height: 2 },
          { type: "bar", width: 2, height: 2 },
          { type: "pie", width: 2, height: 2 },
        ],
      },
    ],
    style: {
      colorPalette: COLOR_PALETTES.lavender,
      primaryColor: "#8b5cf6",
      cardStyle: "elevated",
      cornerRadius: "lg",
    },
  },
  {
    id: "minimal-clean",
    name: "Minimal & Clean",
    description: "Simple, focused dashboard with minimal distractions",
    thumbnail: "✨",
    category: "general",
    pages: [
      {
        name: "Dashboard",
        chartLayouts: [
          { type: "kpi", width: 2, height: 1 },
          { type: "kpi", width: 2, height: 1 },
          { type: "line", width: 4, height: 2 },
          { type: "bar", width: 4, height: 2 },
        ],
      },
    ],
    style: {
      colorPalette: COLOR_PALETTES.monochrome,
      primaryColor: "#18181b",
      cardStyle: "flat",
      cornerRadius: "none",
      showShadows: false,
      gridGap: "spacious",
    },
  },
];

// Context for visualization enhancements
interface VisualizationContextType {
  // Drill-down
  drillDownContext: DrillDownContext | null;
  openDrillDown: (context: DrillDownContext) => void;
  closeDrillDown: () => void;
  drillDeeper: (newContext: DrillDownContext) => void;
  
  // Cross-chart filtering
  crossChartFilter: CrossChartFilter | null;
  setCrossChartFilter: (filter: CrossChartFilter | null) => void;
  clearCrossChartFilter: () => void;
  isCrossFilterEnabled: boolean;
  toggleCrossFilter: () => void;
  
  // Dashboard styling
  dashboardStyle: DashboardStyle;
  updateDashboardStyle: (updates: Partial<DashboardStyle>) => void;
  applyColorPalette: (paletteName: keyof typeof COLOR_PALETTES) => void;
  resetToDefaultStyle: () => void;
  
  // Templates
  selectedTemplate: DashboardTemplate | null;
  selectTemplate: (template: DashboardTemplate | null) => void;
  templates: DashboardTemplate[];
}

const VisualizationContext = createContext<VisualizationContextType | null>(null);

export function VisualizationProvider({ children }: { children: ReactNode }) {
  // Drill-down state
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null);
  
  // Cross-chart filter state
  const [crossChartFilter, setCrossChartFilter] = useState<CrossChartFilter | null>(null);
  const [isCrossFilterEnabled, setIsCrossFilterEnabled] = useState(true);
  
  // Dashboard style state
  const [dashboardStyle, setDashboardStyle] = useState<DashboardStyle>(DEFAULT_DASHBOARD_STYLE);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);

  // Drill-down handlers
  const openDrillDown = useCallback((context: DrillDownContext) => {
    setDrillDownContext(context);
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDownContext(null);
  }, []);

  const drillDeeper = useCallback((newContext: DrillDownContext) => {
    setDrillDownContext(newContext);
  }, []);

  // Cross-filter handlers
  const clearCrossChartFilter = useCallback(() => {
    setCrossChartFilter(null);
  }, []);

  const toggleCrossFilter = useCallback(() => {
    setIsCrossFilterEnabled(prev => !prev);
    if (isCrossFilterEnabled) {
      setCrossChartFilter(null);
    }
  }, [isCrossFilterEnabled]);

  // Style handlers
  const updateDashboardStyle = useCallback((updates: Partial<DashboardStyle>) => {
    setDashboardStyle(prev => ({ ...prev, ...updates }));
  }, []);

  const applyColorPalette = useCallback((paletteName: keyof typeof COLOR_PALETTES) => {
    const palette = COLOR_PALETTES[paletteName];
    setDashboardStyle(prev => ({
      ...prev,
      colorPalette: palette,
      primaryColor: palette[0],
      accentColor: palette[1],
    }));
  }, []);

  const resetToDefaultStyle = useCallback(() => {
    setDashboardStyle(DEFAULT_DASHBOARD_STYLE);
  }, []);

  // Template handler
  const selectTemplate = useCallback((template: DashboardTemplate | null) => {
    setSelectedTemplate(template);
    if (template?.style) {
      setDashboardStyle(prev => ({ ...prev, ...template.style }));
    }
  }, []);

  const value = useMemo(() => ({
    // Drill-down
    drillDownContext,
    openDrillDown,
    closeDrillDown,
    drillDeeper,
    
    // Cross-chart filtering
    crossChartFilter,
    setCrossChartFilter,
    clearCrossChartFilter,
    isCrossFilterEnabled,
    toggleCrossFilter,
    
    // Dashboard styling
    dashboardStyle,
    updateDashboardStyle,
    applyColorPalette,
    resetToDefaultStyle,
    
    // Templates
    selectedTemplate,
    selectTemplate,
    templates: DASHBOARD_TEMPLATES,
  }), [
    drillDownContext,
    openDrillDown,
    closeDrillDown,
    drillDeeper,
    crossChartFilter,
    clearCrossChartFilter,
    isCrossFilterEnabled,
    toggleCrossFilter,
    dashboardStyle,
    updateDashboardStyle,
    applyColorPalette,
    resetToDefaultStyle,
    selectedTemplate,
    selectTemplate,
  ]);

  return (
    <VisualizationContext.Provider value={value}>
      {children}
    </VisualizationContext.Provider>
  );
}

export function useVisualization() {
  const context = useContext(VisualizationContext);
  
  // Return safe defaults if context is not available
  // This can happen during initial render before provider is mounted
  if (!context) {
    return {
      drillDownContext: null,
      openDrillDown: () => {},
      closeDrillDown: () => {},
      drillDeeper: () => {},
      crossChartFilter: null,
      setCrossChartFilter: () => {},
      clearCrossChartFilter: () => {},
      isCrossFilterEnabled: false,
      toggleCrossFilter: () => {},
      dashboardStyle: DEFAULT_DASHBOARD_STYLE,
      updateDashboardStyle: () => {},
      applyColorPalette: () => {},
      resetToDefaultStyle: () => {},
      selectedTemplate: null,
      selectTemplate: () => {},
      templates: DASHBOARD_TEMPLATES,
    } as VisualizationContextType;
  }
  return context;
}

// Helper hook for getting style classes based on dashboard style
export function useDashboardStyleClasses() {
  const visualization = useVisualization();
  const dashboardStyle = visualization?.dashboardStyle || DEFAULT_DASHBOARD_STYLE;
  
  return useMemo(() => {
    const { cardStyle, cornerRadius, gridGap, fontFamily, showShadows } = dashboardStyle;
    
    const cardClasses = {
      flat: "bg-card border-0",
      elevated: "bg-card shadow-lg border-0",
      bordered: "bg-card border border-border",
      glass: "bg-card/80 backdrop-blur-sm border border-border/50",
    }[cardStyle];
    
    const radiusClasses = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-lg",
      lg: "rounded-xl",
      full: "rounded-2xl",
    }[cornerRadius];
    
    const gapClasses = {
      compact: "gap-2",
      normal: "gap-4",
      spacious: "gap-6",
    }[gridGap];
    
    const fontClasses = {
      default: "",
      mono: "font-mono",
      serif: "font-serif",
      rounded: "font-sans",
    }[fontFamily];
    
    const shadowClasses = showShadows ? "shadow-sm" : "";
    
    return {
      cardClasses: `${cardClasses} ${radiusClasses} ${shadowClasses}`,
      gapClasses,
      fontClasses,
      colors: dashboardStyle.colorPalette,
      primaryColor: dashboardStyle.primaryColor,
      accentColor: dashboardStyle.accentColor,
    };
  }, [dashboardStyle]);
}
