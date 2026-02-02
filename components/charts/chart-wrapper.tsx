"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Filter,
  GripVertical,
  Maximize2,
  Minimize2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/lib/store";

interface ChartWrapperProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  children: (filteredData: Record<string, unknown>[]) => React.ReactNode;
  onResize?: (width: number, height: number) => void;
  onDragStart?: () => void;
  isDragging?: boolean;
  showControls?: boolean;
}

export function ChartWrapper({
  config,
  data,
  children,
  onResize,
  onDragStart,
  isDragging = false,
  showControls = true,
}: ChartWrapperProps) {
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];
  // Filter states
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Range slider state for numeric columns
  const [rangeColumn, setRangeColumn] = useState<string | null>(null);
  const [rangeValues, setRangeValues] = useState<[number, number]>([0, 100]);
  const [showRange, setShowRange] = useState(false);

  // Get column information
  const columns = useMemo(() => Object.keys(safeData[0] || {}), [safeData]);
  
  const numericColumns = useMemo(() => 
    columns.filter(col => {
      const sample = safeData.slice(0, 10).map(row => row[col]);
      return sample.every(v => v === null || v === undefined || typeof v === "number" || !isNaN(Number(v)));
    }),
    [columns, safeData]
  );
  
  const categoricalColumns = useMemo(() => 
    columns.filter(col => !numericColumns.includes(col)),
    [columns, numericColumns]
  );

  // Get unique values for filter column
  const uniqueValues = useMemo(() => {
    if (!filterColumn) return [];
    const values = [...new Set(safeData.map(row => String(row[filterColumn])))];
    return values.sort();
  }, [safeData, filterColumn]);

  // Get min/max for range column
  const rangeMinMax = useMemo(() => {
    if (!rangeColumn || safeData.length === 0) return { min: 0, max: 100 };
    const values = safeData.map(row => Number(row[rangeColumn]) || 0);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [safeData, rangeColumn]);

  // Initialize range values when column changes
  const handleRangeColumnChange = (col: string) => {
    setRangeColumn(col);
    const values = safeData.map(row => Number(row[col]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    setRangeValues([min, max]);
  };

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...safeData];
    
    // Apply categorical filter
    if (filterColumn && filterValues.length > 0) {
      result = result.filter(row => filterValues.includes(String(row[filterColumn])));
    }
    
    // Apply range filter
    if (rangeColumn && rangeValues) {
      result = result.filter(row => {
        const val = Number(row[rangeColumn]) || 0;
        return val >= rangeValues[0] && val <= rangeValues[1];
      });
    }
    
    return result;
  }, [safeData, filterColumn, filterValues, rangeColumn, rangeValues]);

  const toggleFilterValue = (value: string) => {
    setFilterValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const clearFilters = () => {
    setFilterColumn(null);
    setFilterValues([]);
    setRangeColumn(null);
    setRangeValues([0, 100]);
  };

  const hasActiveFilters = filterValues.length > 0 || rangeColumn;

  // Don't show controls for certain chart types
  const hideControls = ['slicer', 'list-slicer', 'dropdown-slicer', 'date-slicer', 'numeric-slicer'].includes(config.type);

  if (hideControls || !showControls) {
    return <>{children(filteredData)}</>;
  }

  return (
    <div 
      className={cn(
        "relative h-full group",
        isDragging && "opacity-50"
      )}
    >
      {/* Control bar - appears on hover */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-background/90 to-transparent">
        {/* Drag handle */}
        {onDragStart && (
          <div
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50"
            onMouseDown={(e) => {
              e.preventDefault();
              onDragStart();
            }}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex items-center gap-1">
          {/* Active filter indicator */}
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs gap-1 h-6">
              <Filter className="h-3 w-3" />
              {filteredData.length}/{data.length}
              <button onClick={clearFilters} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {/* Range Slider */}
          {numericColumns.length > 0 && (
            <Popover open={showRange} onOpenChange={setShowRange}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground font-mono">Range Filter</span>
                    {rangeColumn && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setRangeColumn(null)}>
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  <Select value={rangeColumn || ""} onValueChange={handleRangeColumnChange}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Select numeric column" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map(col => (
                        <SelectItem key={col} value={col} className="text-xs font-mono">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {rangeColumn && (
                    <div className="space-y-2 pt-2">
                      <Slider
                        value={rangeValues}
                        min={rangeMinMax.min}
                        max={rangeMinMax.max}
                        step={(rangeMinMax.max - rangeMinMax.min) / 100}
                        onValueChange={(values) => setRangeValues(values as [number, number])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>{rangeValues[0].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span>{rangeValues[1].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Category Filter */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground font-mono">Filter by Column</span>
                  {filterValues.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFilterValues([])}>
                      Clear
                    </Button>
                  )}
                </div>
                
                <Select value={filterColumn || ""} onValueChange={col => { setFilterColumn(col); setFilterValues([]); }}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalColumns.map(col => (
                      <SelectItem key={col} value={col} className="text-xs font-mono">
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {filterColumn && uniqueValues.length > 0 && (
                  <ScrollArea className="h-[180px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {uniqueValues.map(value => (
                        <div
                          key={value}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleFilterValue(value)}
                        >
                          <Checkbox
                            checked={filterValues.includes(value)}
                            onCheckedChange={() => toggleFilterValue(value)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs font-mono truncate">{value}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Size controls */}
          {onResize && (
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => onResize(Math.max(1, config.width - 1), config.height)}
                disabled={config.width <= 1}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => onResize(Math.min(4, config.width + 1), config.height)}
                disabled={config.width >= 4}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Chart content */}
      <div className="h-full">
        {children(filteredData)}
      </div>
    </div>
  );
}
