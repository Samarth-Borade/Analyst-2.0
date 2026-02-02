"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartTitleHeader, ChartTitleFooter } from "@/components/charts/chart-title";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Columns3, Check } from "lucide-react";
import type { ChartConfig } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataTableProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

const PAGE_SIZE = 10;

export function DataTableComponent({ config, data }: DataTableProps) {
  const [page, setPage] = useState(0);
  // Local sort state - initialized from config if available
  const [sortColumn, setSortColumn] = useState<string | null>(config.sortBy || null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(config.sortOrder || "asc");
  
  // Get all available columns from data
  const allColumns = useMemo(() => Object.keys(data[0] || {}), [data]);
  
  // Selected columns - use config.columns if set, otherwise show all columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    config.columns && config.columns.length > 0 ? config.columns : allColumns
  );
  
  // Update selected columns when config.columns changes
  useEffect(() => {
    if (config.columns && config.columns.length > 0) {
      setSelectedColumns(config.columns);
    } else if (allColumns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(allColumns);
    }
  }, [config.columns, allColumns]);
  
  // Filter to only show selected columns that exist in data
  const columns = useMemo(() => 
    selectedColumns.filter(col => allColumns.includes(col)),
    [selectedColumns, allColumns]
  );
  
  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        // Don't allow removing all columns
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== column);
      } else {
        return [...prev, column];
      }
    });
  };
  
  const selectAllColumns = () => setSelectedColumns(allColumns);
  const deselectAllColumns = () => setSelectedColumns([allColumns[0]]); // Keep at least one

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortOrder("asc");
    }
    // Reset to first page when sorting changes
    setPage(0);
  };

  // Sort data based on local sort state
  const sortedData = useMemo(() => {
    let sorted = [...data];
    
    if (sortColumn && columns.includes(sortColumn)) {
      sorted.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Compare values
        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortOrder === "desc" ? -comparison : comparison;
      });
    }
    
    return sorted;
  }, [data, sortColumn, sortOrder, columns]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const pageData = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(value);
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    }
    
    if (sortOrder === "desc") {
      return <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />;
    } else {
      return <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />;
    }
  };

  const titlePosition = config.titlePosition || "top";

  return (
    <Card className="h-full bg-card border-border flex flex-col">
      <ChartTitleHeader title={config.title} position={titlePosition}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-mono">
              <Columns3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Columns</span>
              <span className="text-muted-foreground">({columns.length}/{allColumns.length})</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground font-mono">Select Columns</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={selectAllColumns}
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={deselectAllColumns}
                  >
                    None
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="p-2 space-y-1">
                {allColumns.map((column) => (
                  <div
                    key={column}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                      "hover:bg-muted/50",
                      selectedColumns.includes(column) && "bg-muted/30"
                    )}
                    onClick={() => toggleColumn(column)}
                  >
                    <Checkbox
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={() => toggleColumn(column)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-mono truncate flex-1">{column}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </ChartTitleHeader>
      <CardContent className={`flex-1 flex flex-col overflow-hidden ${titlePosition === "bottom" ? "pt-4" : "pt-0"}`}>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead 
                    key={col} 
                    className={cn(
                      "text-xs font-medium cursor-pointer select-none font-mono transition-colors",
                      "hover:bg-muted/50",
                      sortColumn === col && "bg-muted/30"
                    )}
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center">
                      {col}
                      {getSortIcon(col)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => (
                    <TableCell key={col} className="text-sm py-2 font-mono">
                      {formatValue(row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
          <span className="text-xs text-muted-foreground font-mono">
            Page {page + 1} of {totalPages} • {sortedData.length} rows
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      <ChartTitleFooter title={config.title} position={titlePosition} />
    </Card>
  );
}
