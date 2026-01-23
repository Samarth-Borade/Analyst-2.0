"use client";

import { useMemo, useEffect } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DashboardCanvas() {
  const { pages, currentPageId, rawData, filters, setCurrentPage, dataSources } = useDashboardStore();

  // Auto-select first page if currentPageId is invalid
  useEffect(() => {
    if (pages.length > 0 && (!currentPageId || !pages.find((p) => p.id === currentPageId))) {
      console.log("Resetting currentPageId to first page");
      setCurrentPage(pages[0].id);
    }
  }, [pages, currentPageId, setCurrentPage]);

  // Ensure rawData is set from dataSources if not already set
  useEffect(() => {
    if (!rawData && dataSources.length > 0 && dataSources[0].data) {
      console.log("Restoring rawData from dataSources");
      useDashboardStore.setState({ rawData: dataSources[0].data });
    }
  }, [rawData, dataSources]);

  const currentPage = useMemo(
    () => pages.find((p) => p.id === currentPageId),
    [pages, currentPageId]
  );

  const filteredData = useMemo(() => {
    // Use rawData, or fallback to dataSources[0].data
    const dataToUse = rawData || (dataSources.length > 0 ? dataSources[0].data : null);
    
    if (!dataToUse || filters.length === 0) return dataToUse;

    return dataToUse.filter((row) =>
      filters.every((filter) => {
        if (filter.values.length === 0) return true;
        return filter.values.includes(String(row[filter.column]));
      })
    );
  }, [rawData, dataSources, filters]);

  if (!currentPage || !filteredData) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono">
        No page selected
      </div>
    );
  }

  // Validate currentPage.charts exists
  if (!Array.isArray(currentPage.charts)) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono">
        No charts available
      </div>
    );
  }

  // Calculate grid positions
  const gridCols = 4;

  return (
    <div className="flex-1 p-6 overflow-auto bg-background">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        }}
      >
        {currentPage.charts.map((chart) => {
          const colSpan = Math.min(chart.width || 1, gridCols);
          const rowSpan = chart.height || 1;

          return (
            <div
              key={chart.id}
              className={cn(
                "transition-all duration-200",
                rowSpan === 1 ? "min-h-[200px]" : "min-h-[400px]"
              )}
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
              }}
            >
              <ChartRenderer config={chart} data={filteredData} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
