"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { 
  calculateVisibleRange, 
  getPageData, 
  calculatePagination,
  getPageNumbers,
  sampleData,
  aggregateForChart
} from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

// ============ Virtualized Table ============

interface VirtualTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: string[];
  rowHeight?: number;
  containerHeight?: number;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
}

export function VirtualTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight = 40,
  containerHeight = 400,
  onRowClick,
  className = "",
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    return calculateVisibleRange(scrollTop, containerHeight, data.length, rowHeight);
  }, [scrollTop, containerHeight, data.length, rowHeight]);

  const visibleRows = useMemo(() => {
    return data.slice(startIndex, endIndex + 1);
  }, [data, startIndex, endIndex]);

  const offsetY = startIndex * rowHeight;

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div 
        className="flex bg-muted/50 border-b font-medium sticky top-0 z-10"
        style={{ height: rowHeight }}
      >
        {columns.map((col) => (
          <div
            key={col}
            className="flex-1 px-3 flex items-center truncate text-sm"
            style={{ minWidth: 100 }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {/* Visible rows */}
          <div
            style={{
              position: "absolute",
              top: offsetY,
              left: 0,
              right: 0,
            }}
          >
            {visibleRows.map((row, idx) => {
              const actualIndex = startIndex + idx;
              return (
                <div
                  key={actualIndex}
                  className={`flex border-b hover:bg-muted/30 cursor-pointer transition-colors ${
                    actualIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
                  }`}
                  style={{ height: rowHeight }}
                  onClick={() => onRowClick?.(row, actualIndex)}
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onRowClick?.(row, actualIndex);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="flex-1 px-3 flex items-center truncate text-sm"
                      style={{ minWidth: 100 }}
                      title={String(row[col] ?? "")}
                    >
                      {formatCellValue(row[col])}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row count indicator */}
      <div className="text-xs text-muted-foreground px-3 py-2 bg-muted/30 border-t">
        Showing rows {startIndex + 1}-{Math.min(endIndex + 1, data.length)} of{" "}
        {data.length.toLocaleString()}
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value);
}

// ============ Paginated Table ============

interface PaginatedTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: string[];
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T, index: number) => void;
  className?: string;
}

export function PaginatedTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize: initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  className = "",
}: PaginatedTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pagination = useMemo(() => {
    return calculatePagination(data.length, pageSize, page);
  }, [data.length, pageSize, page]);

  const pageData = useMemo(() => {
    return getPageData(data, pagination.page, pagination.pageSize);
  }, [data, pagination.page, pagination.pageSize]);

  const pageNumbers = useMemo(() => {
    return getPageNumbers(pagination.page, pagination.totalPages);
  }, [pagination.page, pagination.totalPages]);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // Ensure page is valid
  useEffect(() => {
    if (page > pagination.totalPages && pagination.totalPages > 0) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Table */}
      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, idx) => {
              const actualIndex = (pagination.page - 1) * pagination.pageSize + idx;
              return (
                <tr
                  key={actualIndex}
                  className={`border-t hover:bg-muted/30 cursor-pointer transition-colors ${
                    idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                  }`}
                  onClick={() => onRowClick?.(row, actualIndex)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onRowClick?.(row, actualIndex);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 truncate max-w-[200px]"
                      title={String(row[col] ?? "")}
                    >
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => setPageSize(Number(val))}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2">
            {((pagination.page - 1) * pagination.pageSize + 1).toLocaleString()}-
            {Math.min(pagination.page * pagination.pageSize, pagination.totalRows).toLocaleString()}{" "}
            of {pagination.totalRows.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(1)}
            disabled={pagination.page === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageNumbers.map((num, idx) =>
            num === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={num}
                variant={num === pagination.page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(num)}
                aria-label={`Page ${num}`}
                aria-current={num === pagination.page ? "page" : undefined}
              >
                {num}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page === pagination.totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Sampled Chart Data Hook ============

interface UseSampledDataOptions {
  maxPoints?: number;
  strategy?: "uniform" | "random" | "lttb";
  aggregation?: {
    groupBy: string;
    valueField: string;
    method: "sum" | "avg" | "count" | "min" | "max";
    maxGroups?: number;
  };
}

export function useSampledData<T extends Record<string, unknown>>(
  data: T[],
  options: UseSampledDataOptions = {}
): { sampledData: T[]; isSampled: boolean; originalCount: number } {
  const { maxPoints = 1000, strategy = "lttb", aggregation } = options;

  return useMemo(() => {
    if (aggregation) {
      const aggregated = aggregateForChart(
        data,
        aggregation.groupBy,
        aggregation.valueField,
        aggregation.method,
        aggregation.maxGroups
      );
      return {
        sampledData: aggregated as T[],
        isSampled: data.length > (aggregation.maxGroups || 100),
        originalCount: data.length,
      };
    }

    if (data.length <= maxPoints) {
      return { sampledData: data, isSampled: false, originalCount: data.length };
    }

    const sampled = sampleData(data, maxPoints, strategy);
    return {
      sampledData: sampled,
      isSampled: true,
      originalCount: data.length,
    };
  }, [data, maxPoints, strategy, aggregation]);
}

// ============ Large Dataset Warning ============

interface LargeDatasetBannerProps {
  originalCount: number;
  displayedCount: number;
  onShowAll?: () => void;
}

export function LargeDatasetBanner({
  originalCount,
  displayedCount,
  onShowAll,
}: LargeDatasetBannerProps) {
  if (originalCount === displayedCount) return null;

  return (
    <div 
      className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm"
      role="alert"
    >
      <span className="text-amber-700 dark:text-amber-400">
        Showing {displayedCount.toLocaleString()} of {originalCount.toLocaleString()} rows for
        performance. Data is sampled to preserve visual accuracy.
      </span>
      {onShowAll && (
        <Button
          variant="outline"
          size="sm"
          onClick={onShowAll}
          className="ml-2 border-amber-500/50 text-amber-700 dark:text-amber-400"
        >
          Show All
        </Button>
      )}
    </div>
  );
}

// ============ Progressive Loading Indicator ============

interface ProgressiveLoadingProps {
  progress: number; // 0-100
  totalRows: number;
  loadedRows: number;
}

export function ProgressiveLoading({
  progress,
  totalRows,
  loadedRows,
}: ProgressiveLoadingProps) {
  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/20">
      <div className="flex justify-between text-sm">
        <span>Loading data...</span>
        <span className="text-muted-foreground">
          {loadedRows.toLocaleString()} / {totalRows.toLocaleString()} rows
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Processing large dataset in chunks to keep the app responsive...
      </p>
    </div>
  );
}
