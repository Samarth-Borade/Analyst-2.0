"use client";

import { useMemo } from "react";
import { Check, Hash, Calendar, Type, BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DataSchema } from "@/lib/store";

interface DataPreviewProps {
  data: Record<string, unknown>[];
  schema: DataSchema;
  selectedColumns: string[];
  onToggleColumn: (column: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function DataPreview({
  data,
  schema,
  selectedColumns,
  onToggleColumn,
  onSelectAll,
  onDeselectAll,
}: DataPreviewProps) {
  const columns = useMemo(() => schema.columns.map((c) => c.name), [schema]);
  const previewRows = useMemo(() => data.slice(0, 10), [data]);
  
  const allSelected = columns.length === selectedColumns.length;
  const someSelected = selectedColumns.length > 0 && !allSelected;

  const getColumnIcon = (type: string) => {
    switch (type) {
      case "numeric":
        return <Hash className="h-3.5 w-3.5 text-blue-500" />;
      case "datetime":
        return <Calendar className="h-3.5 w-3.5 text-green-500" />;
      case "categorical":
        return <BarChart3 className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <Type className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getColumnType = (name: string) => {
    return schema.columns.find((c) => c.name === name)?.type || "text";
  };

  const getColumnInfo = (name: string) => {
    const col = schema.columns.find((c) => c.name === name);
    if (!col) return null;
    return col;
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header with stats */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">
            Data Preview
          </span>
          <Badge variant="secondary" className="font-mono text-xs">
            {data.length.toLocaleString()} rows
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {columns.length} columns
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs text-primary hover:underline font-medium"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          <Badge 
            variant={selectedColumns.length === columns.length ? "default" : "outline"}
            className="font-mono text-xs"
          >
            {selectedColumns.length}/{columns.length} selected
          </Badge>
        </div>
      </div>

      {/* Column selection info */}
      <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">
          Select the columns you want to include in your analysis. Click on column headers to toggle selection.
        </span>
      </div>

      {/* Table */}
      <ScrollArea className="h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                {columns.map((column) => {
                  const isSelected = selectedColumns.includes(column);
                  const colInfo = getColumnInfo(column);
                  
                  return (
                    <th
                      key={column}
                      className={cn(
                        "px-4 py-3 text-left font-medium cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-primary/10 text-foreground" 
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      )}
                      onClick={() => onToggleColumn(column)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleColumn(column)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 min-w-0">
                                {getColumnIcon(getColumnType(column))}
                                <span className="truncate font-mono text-xs">
                                  {column}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{column}</p>
                                <p className="text-xs text-muted-foreground">
                                  Type: {colInfo?.type || "unknown"}
                                </p>
                                {colInfo && (
                                  <>
                                    <p className="text-xs text-muted-foreground">
                                      Unique values: {colInfo.uniqueCount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Null count: {colInfo.nullCount}
                                    </p>
                                  </>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/50 hover:bg-muted/20"
                >
                  {columns.map((column) => {
                    const isSelected = selectedColumns.includes(column);
                    const value = row[column];
                    
                    return (
                      <td
                        key={column}
                        className={cn(
                          "px-4 py-2.5 font-mono text-xs",
                          isSelected 
                            ? "bg-primary/5" 
                            : "bg-transparent opacity-50"
                        )}
                      >
                        <span className="truncate block max-w-[200px]">
                          {value === null || value === undefined
                            ? <span className="text-muted-foreground italic">null</span>
                            : String(value)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 bg-muted/30 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Showing first 10 rows of {data.length.toLocaleString()} total rows
        </p>
      </div>
    </div>
  );
}
