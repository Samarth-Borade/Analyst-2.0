"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { ChartWrapper } from "@/components/charts/chart-wrapper";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GripVertical, Move, Maximize2, X, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardCanvas() {
  const { pages, currentPageId, rawData, filters, setCurrentPage, dataSources, updateChart, updatePage } = useDashboardStore();
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  
  // Drag state
  const [draggedChart, setDraggedChart] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Resize preview state
  const [resizePreview, setResizePreview] = useState<{ chartId: string; width: number; height: number } | null>(null);
  
  // Grid ref for calculations
  const gridRef = useRef<HTMLDivElement>(null);

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
    if (!dataToUse || filters.length === 0) return dataToUse;
    return dataToUse.filter((row) =>
      filters.every((filter) => {
        if (filter.values.length === 0) return true;
        return filter.values.includes(String(row[filter.column]));
      })
    );
  }, [rawData, dataSources, filters]);
  
  // Handle resize with preview
  const handleResizePreview = useCallback((chartId: string, width: number, height: number) => {
    setResizePreview({ chartId, width, height });
  }, []);
  
  // Apply resize
  const applyResize = useCallback(() => {
    if (resizePreview && currentPageId) {
      updateChart(currentPageId, resizePreview.chartId, { 
        width: resizePreview.width, 
        height: resizePreview.height 
      });
    }
    setResizePreview(null);
  }, [resizePreview, currentPageId, updateChart]);
  
  // Cancel resize
  const cancelResize = useCallback(() => {
    setResizePreview(null);
  }, []);
  
  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, chartId: string) => {
    setDraggedChart(chartId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chartId);
  }, []);
  
  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);
  
  // Handle drop - reorder charts
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedChart || !currentPage || !currentPageId) {
      setDraggedChart(null);
      setDragOverIndex(null);
      return;
    }
    
    const charts = [...currentPage.charts];
    const draggedIndex = charts.findIndex(c => c.id === draggedChart);
    
    if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
      // Remove dragged chart and insert at new position
      const [removed] = charts.splice(draggedIndex, 1);
      charts.splice(targetIndex > draggedIndex ? targetIndex - 1 : targetIndex, 0, removed);
      
      // Update the page with new chart order
      useDashboardStore.getState().updatePage(currentPageId, { charts });
    }
    
    setDraggedChart(null);
    setDragOverIndex(null);
  }, [draggedChart, currentPage, currentPageId]);
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedChart(null);
    setDragOverIndex(null);
  }, []);

  if (!currentPage || !filteredData) {
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

  const gridCols = 4;
  
  // Toggle page title visibility
  const togglePageTitle = useCallback(() => {
    if (currentPageId && currentPage) {
      updatePage(currentPageId, { showTitle: !currentPage.showTitle });
    }
  }, [currentPageId, currentPage, updatePage]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
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
          {editMode && (
            <span className="text-xs text-muted-foreground font-mono">
              Drag charts to reorder • Click resize buttons to change size
            </span>
          )}
        </div>
        
        {/* Resize preview controls */}
        {resizePreview && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              Size: {resizePreview.width} × {resizePreview.height}
            </span>
            <Button size="sm" variant="ghost" onClick={cancelResize}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={applyResize}>
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        )}
      </div>
      
      {/* Charts Grid */}
      <div className="flex-1 p-6 pb-40 overflow-auto">
        {/* Centered Page Title */}
        {currentPage?.showTitle && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-mono tracking-tight">
              {currentPage.name}
            </h1>
          </div>
        )}
        
        <div
          ref={gridRef}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {currentPage.charts.map((chart, index) => {
            const isBeingResized = resizePreview?.chartId === chart.id;
            const displayWidth = isBeingResized ? resizePreview.width : chart.width || 1;
            const displayHeight = isBeingResized ? resizePreview.height : chart.height || 1;
            const colSpan = Math.min(displayWidth, gridCols);
            const rowSpan = displayHeight;
            const isDragging = draggedChart === chart.id;
            const isDropTarget = dragOverIndex === index;

            return (
              <div
                key={chart.id}
                className={cn(
                  "relative transition-all duration-200",
                  rowSpan === 1 ? "min-h-[200px]" : rowSpan === 2 ? "min-h-[416px]" : rowSpan === 3 ? "min-h-[632px]" : "min-h-[848px]",
                  isDragging && "opacity-50 scale-[0.98]",
                  isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg",
                  isBeingResized && "ring-2 ring-blue-500 ring-offset-2 ring-offset-background rounded-lg",
                  editMode && "cursor-move"
                )}
                style={{
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                }}
                draggable={editMode}
                onDragStart={(e) => editMode && handleDragStart(e, chart.id)}
                onDragOver={(e) => editMode && handleDragOver(e, index)}
                onDrop={(e) => editMode && handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => editMode && setSelectedChartId(chart.id)}
              >
                {/* Edit mode overlay */}
                {editMode && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Drag handle indicator */}
                    <div className="absolute top-2 left-2 p-1.5 bg-background/90 rounded-md shadow-sm border border-border pointer-events-auto cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
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
                <div className={cn("h-full", editMode && "pointer-events-none")}>
                  <ChartWrapper
                    config={{ ...chart, width: displayWidth, height: displayHeight }}
                    data={filteredData}
                    showControls={!editMode}
                  >
                    {(filteredChartData) => (
                      <ChartRenderer config={chart} data={filteredChartData} />
                    )}
                  </ChartWrapper>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
