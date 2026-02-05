"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { ChartWrapper } from "@/components/charts/chart-wrapper";
import { DrillDownModal, type DrillDownContext } from "@/components/drill-down-modal";
import { DashboardStyleDialog } from "@/components/template-picker";
import { useDashboardStore, type ChartConfig } from "@/lib/store";
import { useVisualization, useDashboardStyleClasses } from "@/lib/visualization-context";
import { cn } from "@/lib/utils";
import { GripVertical, Move, X, Check, Eye, EyeOff, Filter, XCircle, Trash2, Undo2, Beaker, AlertTriangle, Grid3X3, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Grid and sizing constants
const GRID_SIZE = 20; // Snap to 20px grid
const MIN_WIDTH = 250;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 1400;
const MAX_HEIGHT = 900;

// Convert grid units to pixels (1 unit = 300px width, 220px height)
const UNIT_WIDTH = 300;
const UNIT_HEIGHT = 220;
const widthToPixels = (units: number) => Math.max(MIN_WIDTH, units * UNIT_WIDTH);
const heightToPixels = (units: number) => Math.max(MIN_HEIGHT, units * UNIT_HEIGHT);

interface DragState {
  isDragging: boolean;
  chartId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  isResizing: boolean;
  chartId: string | null;
  handle: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startChartX: number;
  startChartY: number;
}

export function DashboardCanvas() {
  const { pages, currentPageId, rawData, filters, setCurrentPage, dataSources, updateChart, updatePage, setFilters, deleteChart, addChart, whatIfMode, whatIfScenario, exitWhatIfMode } = useDashboardStore();
  const { 
    drillDownContext, 
    openDrillDown, 
    closeDrillDown, 
    drillDeeper,
    crossChartFilter,
    setCrossChartFilter,
    clearCrossChartFilter,
    isCrossFilterEnabled,
    toggleCrossFilter,
    dashboardStyle,
  } = useVisualization();
  const styleClasses = useDashboardStyleClasses();
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [freeFormMode, setFreeFormMode] = useState(false); // Default to grid mode
  
  // Grid mode drag state
  const [draggedChart, setDraggedChart] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Drag state for moving charts
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    chartId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  
  // Resize state
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    chartId: null,
    handle: '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startChartX: 0,
    startChartY: 0,
  });
  
  // Preview state during drag/resize
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Undo state for deleted charts
  const [deletedCharts, setDeletedCharts] = useState<Array<{ chart: ChartConfig; pageId: string; index: number }>>([]);
  
  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-select first page if currentPageId is invalid
  useEffect(() => {
    if (pages.length > 0 && (!currentPageId || !pages.find((p) => p.id === currentPageId))) {
      setCurrentPage(pages[0].id);
    }
  }, [pages, currentPageId, setCurrentPage]);

  // Ensure rawData is set from dataSources if not already set
  useEffect(() => {
    if (!rawData && dataSources.length > 0 && dataSources[0].data) {
      useDashboardStore.setState({ rawData: dataSources[0].data });
    }
  }, [rawData, dataSources]);

  const currentPage = useMemo(
    () => pages.find((p) => p.id === currentPageId),
    [pages, currentPageId]
  );

  const filteredData = useMemo(() => {
    const dataToUse = rawData || (dataSources.length > 0 ? dataSources[0].data : null);
    if (!dataToUse) return null;
    
    let result = dataToUse;
    
    // Apply dashboard filters
    if (filters.length > 0) {
      result = result.filter((row) =>
        filters.every((filter) => {
          if (filter.values.length === 0) return true;
          return filter.values.includes(String(row[filter.column]));
        })
      );
    }
    
    // Apply cross-chart filter if enabled and active
    if (isCrossFilterEnabled && crossChartFilter) {
      result = result.filter((row) => 
        String(row[crossChartFilter.field]) === crossChartFilter.value
      );
    }
    
    return result;
  }, [rawData, dataSources, filters, crossChartFilter, isCrossFilterEnabled]);
  
  // Handle drill-down
  const handleDrillDown = useCallback((chartId: string, chartTitle: string, value: string, field: string) => {
    const dataToUse = rawData || (dataSources.length > 0 ? dataSources[0].data : null);
    if (!dataToUse) return;
    
    const context: DrillDownContext = {
      chartId,
      chartTitle,
      clickedValue: value,
      clickedField: field,
      data: dataToUse,
      breadcrumbs: [],
    };
    
    openDrillDown(context);
  }, [rawData, dataSources, openDrillDown]);
  
  // Handle cross-chart filtering
  const handleCrossFilter = useCallback((chartId: string, value: string, field: string) => {
    if (!isCrossFilterEnabled) return;
    
    // Toggle off if clicking the same value
    if (crossChartFilter?.value === value && crossChartFilter?.field === field) {
      clearCrossChartFilter();
    } else {
      setCrossChartFilter({
        sourceChartId: chartId,
        field,
        value,
        timestamp: Date.now(),
      });
    }
  }, [isCrossFilterEnabled, crossChartFilter, setCrossChartFilter, clearCrossChartFilter]);
  
  // Handle resize with preview (for W/H buttons)
  const handleResizePreview = useCallback((chartId: string, width: number, height: number) => {
    if (currentPageId) {
      updateChart(currentPageId, chartId, { width, height });
    }
  }, [currentPageId, updateChart]);
  
  // Grid mode: Handle drag start for reordering
  const handleGridDragStart = useCallback((e: React.DragEvent, chartId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      e.preventDefault();
      return;
    }
    setDraggedChart(chartId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chartId);
  }, []);
  
  // Grid mode: Handle drag over
  const handleGridDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);
  
  // Grid mode: Handle drop - reorder charts
  const handleGridDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedChart || !currentPage || !currentPageId) {
      setDraggedChart(null);
      setDragOverIndex(null);
      return;
    }
    
    const charts = [...currentPage.charts];
    const draggedIndex = charts.findIndex(c => c.id === draggedChart);
    
    if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
      const [removed] = charts.splice(draggedIndex, 1);
      charts.splice(targetIndex > draggedIndex ? targetIndex - 1 : targetIndex, 0, removed);
      useDashboardStore.getState().updatePage(currentPageId, { charts });
    }
    
    setDraggedChart(null);
    setDragOverIndex(null);
  }, [draggedChart, currentPage, currentPageId]);
  
  // Grid mode: Handle drag end
  const handleGridDragEnd = useCallback(() => {
    setDraggedChart(null);
    setDragOverIndex(null);
  }, []);
  
  // Handle free-form drag start
  const handleDragStart = useCallback((e: React.MouseEvent, chartId: string, chart: ChartConfig) => {
    if (!editMode || !freeFormMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const chartX = chart.x ?? 0;
    const chartY = chart.y ?? 0;
    
    setDragState({
      isDragging: true,
      chartId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left - chartX,
      offsetY: e.clientY - rect.top - chartY,
    });
    
    setSelectedChartId(chartId);
  }, [editMode, freeFormMode]);
  
  // Handle resize start (corner/edge drag)
  const handleResizeStart = useCallback((e: React.MouseEvent, chartId: string, handle: string, chart: ChartConfig) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const chartWidth = widthToPixels(chart.width || 1);
    const chartHeight = heightToPixels(chart.height || 1);
    
    setResizeState({
      isResizing: true,
      chartId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: chartWidth,
      startHeight: chartHeight,
      startChartX: chart.x ?? 0,
      startChartY: chart.y ?? 0,
    });
    
    setSelectedChartId(chartId);
  }, [editMode]);
  
  // Handle mouse move for drag/resize
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    if (dragState.isDragging && dragState.chartId) {
      const newX = Math.max(0, e.clientX - rect.left - dragState.offsetX);
      const newY = Math.max(0, e.clientY - rect.top - dragState.offsetY);
      
      // Snap to grid if enabled
      const snappedX = showGrid ? Math.round(newX / GRID_SIZE) * GRID_SIZE : newX;
      const snappedY = showGrid ? Math.round(newY / GRID_SIZE) * GRID_SIZE : newY;
      
      setPreviewPosition(prev => ({
        x: snappedX,
        y: snappedY,
        width: prev?.width ?? 200,
        height: prev?.height ?? 200,
      }));
    }
    
    if (resizeState.isResizing && resizeState.chartId) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      
      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;
      let newX = resizeState.startChartX;
      let newY = resizeState.startChartY;
      
      const handle = resizeState.handle;
      
      // Handle each resize direction
      if (handle.includes('e')) {
        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeState.startWidth + deltaX));
      }
      if (handle.includes('w')) {
        const widthDelta = Math.min(deltaX, resizeState.startWidth - MIN_WIDTH);
        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeState.startWidth - deltaX));
        newX = resizeState.startChartX + (resizeState.startWidth - newWidth);
      }
      if (handle.includes('s')) {
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeState.startHeight + deltaY));
      }
      if (handle.includes('n')) {
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeState.startHeight - deltaY));
        newY = resizeState.startChartY + (resizeState.startHeight - newHeight);
      }
      
      // Snap to grid if enabled
      if (showGrid) {
        newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
        newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }
      
      setPreviewPosition({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: newWidth,
        height: newHeight,
      });
    }
  }, [dragState, resizeState, showGrid]);
  
  // Handle mouse up - apply changes
  const handleMouseUp = useCallback(() => {
    if (!currentPageId) {
      setDragState({ isDragging: false, chartId: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
      setResizeState({ isResizing: false, chartId: null, handle: '', startX: 0, startY: 0, startWidth: 0, startHeight: 0, startChartX: 0, startChartY: 0 });
      setPreviewPosition(null);
      return;
    }
    
    if (dragState.isDragging && dragState.chartId && previewPosition) {
      updateChart(currentPageId, dragState.chartId, {
        x: previewPosition.x,
        y: previewPosition.y,
      });
    }
    
    if (resizeState.isResizing && resizeState.chartId && previewPosition) {
      // Convert pixels back to grid units for width/height
      const gridWidth = Math.max(1, Math.round(previewPosition.width / UNIT_WIDTH));
      const gridHeight = Math.max(1, Math.round(previewPosition.height / UNIT_HEIGHT));
      
      updateChart(currentPageId, resizeState.chartId, {
        x: previewPosition.x,
        y: previewPosition.y,
        width: gridWidth,
        height: gridHeight,
      });
    }
    
    setDragState({ isDragging: false, chartId: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
    setResizeState({ isResizing: false, chartId: null, handle: '', startX: 0, startY: 0, startWidth: 0, startHeight: 0, startChartX: 0, startChartY: 0 });
    setPreviewPosition(null);
  }, [currentPageId, dragState, resizeState, previewPosition, updateChart]);
  
  // Auto-position charts that don't have valid x/y coordinates when entering free-form mode
  useEffect(() => {
    if (!currentPage || !currentPageId || !freeFormMode || !editMode) return;
    
    // Check if any charts need positioning (x or y is 0 or undefined for all)
    const needsAutoPosition = currentPage.charts.every(chart => 
      (chart.x === undefined || chart.x === 0) && (chart.y === undefined || chart.y === 0)
    );
    
    if (!needsAutoPosition || currentPage.charts.length === 0) return;
    
    let currentX = GRID_SIZE * 2;
    let currentY = GRID_SIZE * 2;
    let maxHeightInRow = 0;
    const canvasWidth = canvasRef.current?.clientWidth || 1200;
    
    currentPage.charts.forEach((chart) => {
      const chartWidth = widthToPixels(chart.width || 1);
      const chartHeight = heightToPixels(chart.height || 1);
      
      // Check if chart fits in current row
      if (currentX + chartWidth > canvasWidth - GRID_SIZE * 2) {
        currentX = GRID_SIZE * 2;
        currentY += maxHeightInRow + GRID_SIZE * 2;
        maxHeightInRow = 0;
      }
      
      updateChart(currentPageId, chart.id, {
        x: currentX,
        y: currentY,
      });
      
      currentX += chartWidth + GRID_SIZE * 2;
      maxHeightInRow = Math.max(maxHeightInRow, chartHeight);
    });
  }, [freeFormMode, editMode, currentPageId]);
  
  // Handle chart deletion with undo support
  const handleDeleteChart = useCallback((chartId: string) => {
    if (!currentPageId || !currentPage) return;
    
    const chartIndex = currentPage.charts.findIndex(c => c.id === chartId);
    const chartToDelete = currentPage.charts.find(c => c.id === chartId);
    
    if (chartToDelete && chartIndex !== -1) {
      // Store the deleted chart for undo
      setDeletedCharts(prev => [...prev, { 
        chart: chartToDelete, 
        pageId: currentPageId, 
        index: chartIndex 
      }]);
      
      // Delete the chart
      deleteChart(currentPageId, chartId);
      
      // Clear selection if this chart was selected
      if (selectedChartId === chartId) {
        setSelectedChartId(null);
      }
    }
  }, [currentPageId, currentPage, deleteChart, selectedChartId]);
  
  // Handle undo - restore last deleted chart
  const handleUndo = useCallback(() => {
    if (deletedCharts.length === 0) return;
    
    const lastDeleted = deletedCharts[deletedCharts.length - 1];
    
    // Add the chart back
    addChart(lastDeleted.pageId, lastDeleted.chart);
    
    // Remove from deleted charts stack
    setDeletedCharts(prev => prev.slice(0, -1));
  }, [deletedCharts, addChart]);
  
  // Clear undo stack when exiting edit mode
  useEffect(() => {
    if (!editMode) {
      setDeletedCharts([]);
    }
  }, [editMode]);

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono">
        No page selected
      </div>
    );
  }

  if (!Array.isArray(currentPage.charts)) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono">
        No charts available
      </div>
    );
  }
  
  // Calculate pixel dimensions from grid units
  const getChartPixelDimensions = (chart: ChartConfig) => {
    const width = widthToPixels(chart.width || 1);
    const height = heightToPixels(chart.height || 1);
    return { width, height };
  };
  
  // Toggle page title visibility
  const togglePageTitle = useCallback(() => {
    if (currentPageId && currentPage) {
      updatePage(currentPageId, { showTitle: !currentPage.showTitle });
    }
  }, [currentPageId, currentPage, updatePage]);

  return (
    <div className={cn("flex-1 flex flex-col overflow-hidden bg-background", styleClasses.fontClasses)}>
      {/* Edit Mode Toggle Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="gap-2"
          >
            <Move className="h-4 w-4" />
            {editMode ? "Exit Edit Mode" : "Edit Layout"}
          </Button>
          <Button
            variant={currentPage?.showTitle ? "default" : "outline"}
            size="sm"
            onClick={togglePageTitle}
            className="gap-2"
          >
            {currentPage?.showTitle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {currentPage?.showTitle ? "Hide Title" : "Show Title"}
          </Button>
          
          {/* Cross-Filter Toggle */}
          <Button
            variant={isCrossFilterEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleCrossFilter}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {isCrossFilterEnabled ? "Cross-Filter On" : "Cross-Filter Off"}
          </Button>
          
          {/* Customize Button */}
          <DashboardStyleDialog />
          
          {editMode && (
            <>
              {/* Free-form mode toggle */}
              <Button
                variant={freeFormMode ? "default" : "outline"}
                size="sm"
                onClick={() => setFreeFormMode(!freeFormMode)}
                className="gap-2"
              >
                {freeFormMode ? <LayoutGrid className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                {freeFormMode ? "Free-Form" : "Grid Mode"}
              </Button>
              
              {/* Snap to grid toggle */}
              {freeFormMode && (
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className="gap-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                  {showGrid ? "Snap On" : "Snap Off"}
                </Button>
              )}
              
              {/* Undo Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={deletedCharts.length === 0}
                className="gap-2"
              >
                <Undo2 className="h-4 w-4" />
                Undo
                {deletedCharts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {deletedCharts.length}
                  </Badge>
                )}
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {freeFormMode 
                  ? "Drag charts to move • Drag corners to resize • Use W/H buttons for precise sizing"
                  : "Drag charts to reorder • Click resize buttons to change size"
                }
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Active Cross-Filter Indicator */}
          {crossChartFilter && (
            <Badge variant="secondary" className="gap-2 pr-1">
              <span className="text-xs font-mono">
                {crossChartFilter.field}: {crossChartFilter.value}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-destructive/20"
                onClick={clearCrossChartFilter}
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {/* Preview position indicator */}
          {previewPosition && (dragState.isDragging || resizeState.isResizing) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                Position: {Math.round(previewPosition.x)}, {Math.round(previewPosition.y)} | 
                Size: {Math.round(previewPosition.width)} × {Math.round(previewPosition.height)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* What-If Simulation Banner */}
      {whatIfMode && whatIfScenario && (
        <div className="px-6 py-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Beaker className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-700 dark:text-amber-400">What-If Simulation Active</span>
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs">
                  Preview Mode
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-mono font-medium">{whatIfScenario.field}</span> with{" "}
                <span className={cn(
                  "font-mono font-medium",
                  whatIfScenario.changePercent >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {whatIfScenario.changePercent >= 0 ? "+" : ""}{whatIfScenario.changePercent}%
                </span>{" "}
                change applied
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>Data is temporary and not saved</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exitWhatIfMode}
              className="gap-2 border-amber-500/50 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              <X className="h-4 w-4" />
              Exit Simulation
            </Button>
          </div>
        </div>
      )}
      
      {/* Charts Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 p-6 pb-40 overflow-auto dashboard-canvas-content relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: dragState.isDragging ? 'grabbing' : resizeState.isResizing ? 'nwse-resize' : 'default',
        }}
      >
        {/* Centered Page Title */}
        {currentPage?.showTitle && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-mono tracking-tight">
              {currentPage.name}
            </h1>
          </div>
        )}
        
        {/* Grid overlay for visual guidance */}
        {editMode && freeFormMode && showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />
        )}
        
        {/* Free-form canvas or grid layout */}
        {freeFormMode ? (
          <div className="relative" style={{ minHeight: '800px' }}>
            {currentPage.charts.map((chart, index) => {
              const { width: pixelWidth, height: pixelHeight } = getChartPixelDimensions(chart);
              const isDragging = dragState.isDragging && dragState.chartId === chart.id;
              const isResizing = resizeState.isResizing && resizeState.chartId === chart.id;
              const isSelected = selectedChartId === chart.id;
              
              // Use preview position during drag/resize, otherwise use chart position
              const displayX = (isDragging || isResizing) && previewPosition ? previewPosition.x : (chart.x ?? 0);
              const displayY = (isDragging || isResizing) && previewPosition ? previewPosition.y : (chart.y ?? 0);
              const displayWidth = isResizing && previewPosition ? previewPosition.width : pixelWidth;
              const displayHeight = isResizing && previewPosition ? previewPosition.height : pixelHeight;

              return (
                <div
                  key={chart.id}
                  className={cn(
                    "absolute transition-shadow duration-200 overflow-hidden rounded-lg",
                    isDragging && "z-50 shadow-2xl opacity-90",
                    isResizing && "z-50",
                    isSelected && editMode && "ring-2 ring-primary",
                    editMode && !isDragging && !isResizing && "cursor-grab hover:ring-2 hover:ring-primary/50"
                  )}
                  style={{
                    left: displayX,
                    top: displayY,
                    width: displayWidth,
                    height: displayHeight,
                  }}
                  onMouseDown={(e) => {
                    if (!editMode) return;
                    // Only start drag if not clicking on controls
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && !target.closest('.resize-handle')) {
                      handleDragStart(e, chart.id, chart);
                    }
                  }}
                  onClick={() => editMode && setSelectedChartId(chart.id)}
                >
                  {/* Edit mode overlay */}
                  {editMode && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {/* Drag handle indicator */}
                      <div className="absolute top-2 left-2 p-1.5 bg-background/90 rounded-md shadow-sm border border-border pointer-events-auto cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      {/* Delete button */}
                      <button
                        className="absolute top-2 left-12 p-1.5 bg-destructive/90 hover:bg-destructive rounded-md shadow-sm border border-destructive pointer-events-auto transition-colors z-30"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteChart(chart.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Delete chart"
                      >
                        <Trash2 className="h-4 w-4 text-destructive-foreground" />
                      </button>
                      
                      {/* W/H Resize controls */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-auto">
                        {/* Width controls */}
                        <div className="flex items-center bg-background/90 rounded-md shadow-sm border border-border">
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newWidth = Math.max(1, (chart.width || 1) - 1);
                              handleResizePreview(chart.id, newWidth, chart.height || 1);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={(chart.width || 1) <= 1}
                          >
                            W-
                          </button>
                          <span className="px-2 py-1 text-xs font-mono border-x border-border">
                            {chart.width || 1}
                          </span>
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newWidth = Math.min(6, (chart.width || 1) + 1);
                              handleResizePreview(chart.id, newWidth, chart.height || 1);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={(chart.width || 1) >= 6}
                          >
                            W+
                          </button>
                        </div>
                        
                        {/* Height controls */}
                        <div className="flex items-center bg-background/90 rounded-md shadow-sm border border-border">
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newHeight = Math.max(1, (chart.height || 1) - 1);
                              handleResizePreview(chart.id, chart.width || 1, newHeight);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={(chart.height || 1) <= 1}
                          >
                            H-
                          </button>
                          <span className="px-2 py-1 text-xs font-mono border-x border-border">
                            {chart.height || 1}
                          </span>
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newHeight = Math.min(4, (chart.height || 1) + 1);
                              handleResizePreview(chart.id, chart.width || 1, newHeight);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={(chart.height || 1) >= 4}
                          >
                            H+
                          </button>
                        </div>
                      </div>
                      
                      {/* Size and position label */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/90 rounded-md shadow-sm border border-border text-xs font-mono text-muted-foreground">
                        {chart.width || 1} × {chart.height || 1} | {Math.round(displayX)}, {Math.round(displayY)}
                      </div>
                      
                      {/* Resize handles - only visible on hover/select */}
                      {isSelected && (
                        <>
                          {/* Corner handles */}
                          <div 
                            className="resize-handle absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-sm cursor-se-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'se', chart)}
                          />
                          <div 
                            className="resize-handle absolute bottom-0 left-0 w-3 h-3 bg-primary rounded-sm cursor-sw-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'sw', chart)}
                          />
                          <div 
                            className="resize-handle absolute top-0 right-0 w-3 h-3 bg-primary rounded-sm cursor-ne-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'ne', chart)}
                          />
                          <div 
                            className="resize-handle absolute top-0 left-0 w-3 h-3 bg-primary rounded-sm cursor-nw-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'nw', chart)}
                          />
                          
                          {/* Edge handles */}
                          <div 
                            className="resize-handle absolute top-1/2 right-0 w-2 h-6 -translate-y-1/2 bg-primary/70 rounded-sm cursor-e-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'e', chart)}
                          />
                          <div 
                            className="resize-handle absolute top-1/2 left-0 w-2 h-6 -translate-y-1/2 bg-primary/70 rounded-sm cursor-w-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'w', chart)}
                          />
                          <div 
                            className="resize-handle absolute top-0 left-1/2 w-6 h-2 -translate-x-1/2 bg-primary/70 rounded-sm cursor-n-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 'n', chart)}
                          />
                          <div 
                            className="resize-handle absolute bottom-0 left-1/2 w-6 h-2 -translate-x-1/2 bg-primary/70 rounded-sm cursor-s-resize pointer-events-auto hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleResizeStart(e, chart.id, 's', chart)}
                          />
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Chart content */}
                  <div className={cn("h-full w-full overflow-hidden", editMode && "pointer-events-none")}>
                    <ChartWrapper
                      config={{ ...chart, width: chart.width || 1, height: chart.height || 1 }}
                      data={filteredData || []}
                      showControls={!editMode}
                    >
                      {(filteredChartData) => (
                        <ChartRenderer 
                          config={chart} 
                          data={filteredChartData}
                          onDrillDown={(value, field) => handleDrillDown(chart.id, chart.title, value, field)}
                          onCrossFilter={(value, field) => handleCrossFilter(chart.id, value, field)}
                          crossFilterValue={
                            crossChartFilter && crossChartFilter.field === chart.xAxis 
                              ? crossChartFilter.value 
                              : null
                          }
                        />
                      )}
                    </ChartWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid-based layout with drag-to-reorder */
          <div
            className={cn("grid", styleClasses.gapClasses)}
            style={{ gridTemplateColumns: `repeat(4, 1fr)` }}
          >
            {currentPage.charts.map((chart, index) => {
              const displayWidth = chart.width || 1;
              const displayHeight = chart.height || 1;
              const colSpan = Math.min(displayWidth, 4);
              const rowSpan = displayHeight;
              const isDragging = draggedChart === chart.id;
              const isDropTarget = dragOverIndex === index;

              return (
                <div
                  key={chart.id}
                  className={cn(
                    "relative transition-all duration-200 overflow-hidden",
                    rowSpan === 1 ? "min-h-[200px]" : rowSpan === 2 ? "min-h-[416px]" : rowSpan === 3 ? "min-h-[632px]" : "min-h-[848px]",
                    editMode && "cursor-move",
                    isDragging && "opacity-50 scale-[0.98]",
                    isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
                  )}
                  style={{
                    gridColumn: `span ${colSpan}`,
                    gridRow: `span ${rowSpan}`,
                  }}
                  draggable={editMode}
                  onDragStart={(e) => editMode && handleGridDragStart(e, chart.id)}
                  onDragOver={(e) => editMode && handleGridDragOver(e, index)}
                  onDrop={(e) => editMode && handleGridDrop(e, index)}
                  onDragEnd={handleGridDragEnd}
                  onClick={() => editMode && setSelectedChartId(chart.id)}
                >
                  {/* Edit mode overlay */}
                  {editMode && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {/* Drag handle indicator */}
                      <div className="absolute top-2 left-2 p-1.5 bg-background/90 rounded-md shadow-sm border border-border pointer-events-auto cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      {/* Delete button */}
                      <button
                        className="absolute top-2 left-12 p-1.5 bg-destructive/90 hover:bg-destructive rounded-md shadow-sm border border-destructive pointer-events-auto transition-colors z-30"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteChart(chart.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Delete chart"
                      >
                        <Trash2 className="h-4 w-4 text-destructive-foreground" />
                      </button>
                      
                      {/* Resize controls */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-auto">
                        {/* Width controls */}
                        <div className="flex items-center bg-background/90 rounded-md shadow-sm border border-border">
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newWidth = Math.max(1, displayWidth - 1);
                              handleResizePreview(chart.id, newWidth, displayHeight);
                            }}
                            disabled={displayWidth <= 1}
                          >
                            W-
                          </button>
                          <span className="px-2 py-1 text-xs font-mono border-x border-border">
                            {displayWidth}
                          </span>
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newWidth = Math.min(4, displayWidth + 1);
                              handleResizePreview(chart.id, newWidth, displayHeight);
                            }}
                            disabled={displayWidth >= 4}
                          >
                            W+
                          </button>
                        </div>
                        
                        {/* Height controls */}
                        <div className="flex items-center bg-background/90 rounded-md shadow-sm border border-border">
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newHeight = Math.max(1, displayHeight - 1);
                              handleResizePreview(chart.id, displayWidth, newHeight);
                            }}
                            disabled={displayHeight <= 1}
                          >
                            H-
                          </button>
                          <span className="px-2 py-1 text-xs font-mono border-x border-border">
                            {displayHeight}
                          </span>
                          <button
                            className="px-2 py-1 text-xs font-mono hover:bg-muted disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newHeight = Math.min(4, displayHeight + 1);
                              handleResizePreview(chart.id, displayWidth, newHeight);
                            }}
                            disabled={displayHeight >= 4}
                          >
                            H+
                          </button>
                        </div>
                      </div>
                      
                      {/* Size label */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/90 rounded-md shadow-sm border border-border text-xs font-mono text-muted-foreground">
                        {displayWidth} × {displayHeight}
                      </div>
                    </div>
                  )}
                  
                  {/* Chart content */}
                  <div className={cn("h-full w-full overflow-hidden", editMode && "pointer-events-none")}>
                    <ChartWrapper
                      config={{ ...chart, width: displayWidth, height: displayHeight }}
                      data={filteredData || []}
                      showControls={!editMode}
                    >
                      {(filteredChartData) => (
                        <ChartRenderer 
                          config={chart} 
                          data={filteredChartData}
                          onDrillDown={(value, field) => handleDrillDown(chart.id, chart.title, value, field)}
                          onCrossFilter={(value, field) => handleCrossFilter(chart.id, value, field)}
                          crossFilterValue={
                            crossChartFilter && crossChartFilter.field === chart.xAxis 
                              ? crossChartFilter.value 
                              : null
                          }
                        />
                      )}
                    </ChartWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Drill-Down Modal */}
      <DrillDownModal
        context={drillDownContext}
        onClose={closeDrillDown}
        onDrillDeeper={drillDeeper}
      />
    </div>
  );
}
