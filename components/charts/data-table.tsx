"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import type { ChartConfig } from "@/lib/store";

interface DataTableProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

const PAGE_SIZE = 10;

export function DataTableComponent({ config, data }: DataTableProps) {
  const [page, setPage] = useState(0);

  const columns = Object.keys(data[0] || {}).slice(0, 6);

  // Sort data based on config
  const sortedData = useMemo(() => {
    let sorted = [...data];
    
    if (config.sortBy && columns.includes(config.sortBy)) {
      sorted.sort((a, b) => {
        const aVal = a[config.sortBy!];
        const bVal = b[config.sortBy!];
        
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
        
        return config.sortOrder === "desc" ? -comparison : comparison;
      });
    }
    
    return sorted;
  }, [data, config.sortBy, config.sortOrder, columns]);

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
    if (config.sortBy !== column) return null;
    
    if (config.sortOrder === "desc") {
      return <ArrowDown className="h-4 w-4 ml-1 inline" />;
    } else {
      return <ArrowUp className="h-4 w-4 ml-1 inline" />;
    }
  };

  return (
    <Card className="h-full bg-card border-border flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead 
                    key={col} 
                    className="text-xs font-medium cursor-pointer hover:bg-muted/50 font-mono"
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
                    <TableCell key={col} className="text-sm py-2">
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
            Page {page + 1} of {totalPages}
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
    </Card>
  );
}
