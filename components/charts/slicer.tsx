"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import type { ChartConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SlicerComponentProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  onFilterChange?: (column: string, values: string[]) => void;
}

export function SlicerComponent({ config, data, onFilterChange }: SlicerComponentProps) {
  const filterColumn = config.filterColumn || config.xAxis;
  const slicerType = config.type;

  const [selectedValues, setSelectedValues] = useState<string[]>(config.filterValues || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [numericRange, setNumericRange] = useState<[number, number]>([0, 100]);

  // Get unique values from data
  const uniqueValues = useMemo(() => {
    if (!filterColumn) return [];
    const values = [...new Set(data.map((d) => String(d[filterColumn])))];
    return values.sort();
  }, [data, filterColumn]);

  // For numeric slicer
  const numericStats = useMemo(() => {
    if (!filterColumn) return { min: 0, max: 100 };
    const numbers = data
      .map((d) => Number(d[filterColumn]))
      .filter((n) => !isNaN(n));
    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    };
  }, [data, filterColumn]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter((v) =>
      v.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueValues, searchTerm]);

  const handleValueToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    setSelectedValues(newValues);
    onFilterChange?.(filterColumn || "", newValues);
  };

  const handleSelectAll = () => {
    setSelectedValues(uniqueValues);
    onFilterChange?.(filterColumn || "", uniqueValues);
  };

  const handleClearAll = () => {
    setSelectedValues([]);
    onFilterChange?.(filterColumn || "", []);
  };

  const handleDropdownChange = (value: string) => {
    const newValues = value === "all" ? [] : [value];
    setSelectedValues(newValues);
    onFilterChange?.(filterColumn || "", newValues);
  };

  const handleNumericChange = (values: number[]) => {
    setNumericRange([values[0], values[1]]);
    // Convert to string array for filter
    const filtered = data
      .filter((d) => {
        const num = Number(d[filterColumn || ""]);
        return num >= values[0] && num <= values[1];
      })
      .map((d) => String(d[filterColumn || ""]));
    onFilterChange?.(filterColumn || "", [...new Set(filtered)]);
  };

  if (!filterColumn) {
    return (
      <Card className="h-full bg-card border-border">
        <CardContent className="h-full flex items-center justify-center text-muted-foreground">
          Configure a filter column
        </CardContent>
      </Card>
    );
  }

  // Dropdown Slicer
  if (slicerType === "dropdown-slicer") {
    return (
      <Card className="h-full bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground font-mono">
            {config.title || filterColumn}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Select
            value={selectedValues[0] || "all"}
            onValueChange={handleDropdownChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {uniqueValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  // Date Slicer
  if (slicerType === "date-slicer") {
    return (
      <Card className="h-full bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground font-mono">
            {config.title || filterColumn}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  setDateRange({ from: range?.from, to: range?.to });
                  // Filter data by date range
                  const filtered = data
                    .filter((d) => {
                      const date = new Date(String(d[filterColumn]));
                      if (range?.from && date < range.from) return false;
                      if (range?.to && date > range.to) return false;
                      return true;
                    })
                    .map((d) => String(d[filterColumn]));
                  onFilterChange?.(filterColumn, [...new Set(filtered)]);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
    );
  }

  // Numeric Range Slicer
  if (slicerType === "numeric-slicer") {
    return (
      <Card className="h-full bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground font-mono">
            {config.title || filterColumn}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <Slider
            value={numericRange}
            min={numericStats.min}
            max={numericStats.max}
            step={(numericStats.max - numericStats.min) / 100}
            onValueChange={handleNumericChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>{numericRange[0].toFixed(0)}</span>
            <span>{numericRange[1].toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: List Slicer
  return (
    <Card className="h-full bg-card border-border overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title || filterColumn}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Select/Clear buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 h-7 text-xs bg-transparent"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="flex-1 h-7 text-xs bg-transparent"
          >
            Clear
          </Button>
        </div>

        {/* Values list */}
        <div className="max-h-[120px] overflow-y-auto space-y-1">
          {filteredValues.slice(0, 20).map((value) => (
            <div
              key={value}
              className="flex items-center space-x-2 py-1 px-1 rounded hover:bg-muted/50"
            >
              <Checkbox
                id={`slicer-${value}`}
                checked={selectedValues.includes(value)}
                onCheckedChange={() => handleValueToggle(value)}
              />
              <Label
                htmlFor={`slicer-${value}`}
                className="text-sm font-mono cursor-pointer truncate flex-1"
              >
                {value}
              </Label>
            </div>
          ))}
          {filteredValues.length > 20 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{filteredValues.length - 20} more...
            </div>
          )}
        </div>

        {/* Selected count */}
        {selectedValues.length > 0 && (
          <div className="text-xs text-muted-foreground font-mono">
            {selectedValues.length} of {uniqueValues.length} selected
          </div>
        )}
      </CardContent>
    </Card>
  );
}
