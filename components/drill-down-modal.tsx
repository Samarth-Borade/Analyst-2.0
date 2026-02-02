"use client";

import { useMemo, useState } from "react";
import { X, ChevronLeft, Download, Table, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";

export interface DrillDownContext {
  chartId: string;
  chartTitle: string;
  clickedValue: string;
  clickedField: string;
  drillDownField?: string; // The field to break down by
  data: Record<string, unknown>[];
  parentValue?: string;
  breadcrumbs: Array<{ field: string; value: string }>;
}

interface DrillDownModalProps {
  context: DrillDownContext | null;
  onClose: () => void;
  onDrillDeeper?: (newContext: DrillDownContext) => void;
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#3b82f6",
  "#f97316",
];

export function DrillDownModal({ context, onClose, onDrillDeeper }: DrillDownModalProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("chart");
  
  if (!context) return null;

  const { clickedValue, clickedField, data, chartTitle, breadcrumbs } = context;

  // Filter data to show only rows matching the clicked value
  const filteredData = useMemo(() => {
    return data.filter(row => String(row[clickedField]) === clickedValue);
  }, [data, clickedField, clickedValue]);

  // Get all columns from the data
  const columns = useMemo(() => {
    if (filteredData.length === 0) return [];
    return Object.keys(filteredData[0]);
  }, [filteredData]);

  // Detect potential drill-down fields (exclude the current field)
  const drillDownOptions = useMemo(() => {
    return columns.filter(col => {
      if (col === clickedField) return false;
      // Check if it's a good dimension (categorical with reasonable cardinality)
      const uniqueValues = new Set(filteredData.map(row => row[col]));
      return uniqueValues.size > 1 && uniqueValues.size <= 50;
    });
  }, [columns, clickedField, filteredData]);

  // Find numeric columns for metrics
  const numericColumns = useMemo(() => {
    return columns.filter(col => {
      const sample = filteredData.slice(0, 10).map(row => row[col]);
      return sample.every(v => v === null || v === undefined || typeof v === "number" || !isNaN(Number(v)));
    });
  }, [columns, filteredData]);

  // Default drill-down field (prefer date-like or category-like columns)
  const defaultDrillField = useMemo(() => {
    const datePatterns = ['month', 'date', 'day', 'week', 'quarter', 'time', 'period'];
    const categoryPatterns = ['category', 'type', 'region', 'product', 'customer', 'segment'];
    
    // First try date-like
    for (const col of drillDownOptions) {
      const lower = col.toLowerCase();
      if (datePatterns.some(p => lower.includes(p))) return col;
    }
    // Then try category-like
    for (const col of drillDownOptions) {
      const lower = col.toLowerCase();
      if (categoryPatterns.some(p => lower.includes(p))) return col;
    }
    // Return first available
    return drillDownOptions[0];
  }, [drillDownOptions]);

  const [selectedDrillField, setSelectedDrillField] = useState(defaultDrillField);

  // Aggregate data by the drill-down field
  const aggregatedData = useMemo(() => {
    if (!selectedDrillField || numericColumns.length === 0) return [];
    
    const grouped: Record<string, Record<string, number>> = {};
    
    filteredData.forEach(row => {
      const key = String(row[selectedDrillField] ?? "Unknown");
      if (!grouped[key]) {
        grouped[key] = {};
        numericColumns.forEach(col => grouped[key][col] = 0);
      }
      numericColumns.forEach(col => {
        grouped[key][col] += Number(row[col]) || 0;
      });
    });

    return Object.entries(grouped).map(([name, values]) => ({
      name,
      ...values,
    }));
  }, [filteredData, selectedDrillField, numericColumns]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const primaryMetric = numericColumns[0];
    if (!primaryMetric) return null;

    const total = filteredData.reduce((sum, row) => sum + (Number(row[primaryMetric]) || 0), 0);
    const avg = total / filteredData.length;
    const values = filteredData.map(row => Number(row[primaryMetric]) || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { total, avg, max, min, count: filteredData.length, metricName: primaryMetric };
  }, [filteredData, numericColumns]);

  const handleDrillDeeper = (value: string) => {
    if (!onDrillDeeper || !selectedDrillField) return;
    
    const newContext: DrillDownContext = {
      chartId: context.chartId,
      chartTitle: context.chartTitle,
      clickedValue: value,
      clickedField: selectedDrillField,
      data: filteredData,
      parentValue: clickedValue,
      breadcrumbs: [...breadcrumbs, { field: clickedField, value: clickedValue }],
    };
    
    onDrillDeeper(newContext);
  };

  const handleExportCSV = () => {
    const headers = columns.join(",");
    const rows = filteredData.map(row => 
      columns.map(col => {
        const val = row[col];
        const str = String(val ?? "");
        return str.includes(",") ? `"${str}"` : str;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drill-down-${clickedField}-${clickedValue}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] m-4 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">{chartTitle}</span>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-2 text-muted-foreground">
                  <span>→</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {crumb.field}: {crumb.value}
                  </Badge>
                </span>
              ))}
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">→</span>
                <Badge className="font-mono text-xs">
                  {clickedField}: {clickedValue}
                </Badge>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {summaryStats && (
          <div className="px-6 py-4 border-b border-border">
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase">Records</div>
                <div className="text-2xl font-bold font-mono">{summaryStats.count.toLocaleString()}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase">Total {summaryStats.metricName}</div>
                <div className="text-2xl font-bold font-mono text-primary">{summaryStats.total.toLocaleString()}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase">Average</div>
                <div className="text-2xl font-bold font-mono">{summaryStats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase flex items-center gap-1">
                  Max <ArrowUpRight className="h-3 w-3 text-green-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-green-500">{summaryStats.max.toLocaleString()}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground font-mono uppercase flex items-center gap-1">
                  Min <ArrowDownRight className="h-3 w-3 text-red-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-red-500">{summaryStats.min.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "chart")} className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-2 border-b border-border">
              <TabsList>
                <TabsTrigger value="chart" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Chart
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2">
                  <Table className="h-4 w-4" />
                  Table
                </TabsTrigger>
              </TabsList>
              
              {viewMode === "chart" && drillDownOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">Break down by:</span>
                  <select
                    value={selectedDrillField || ""}
                    onChange={(e) => setSelectedDrillField(e.target.value)}
                    className="text-xs font-mono bg-muted border border-border rounded-md px-2 py-1"
                  >
                    {drillDownOptions.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <TabsContent value="chart" className="flex-1 p-6 m-0">
              {aggregatedData.length > 0 ? (
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart 
                      data={aggregatedData} 
                      margin={{ left: 20, right: 20, top: 20, bottom: 60 }}
                      onClick={(e) => {
                        if (e?.activePayload?.[0]?.payload?.name) {
                          handleDrillDeeper(e.activePayload[0].payload.name);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      {numericColumns.slice(0, 3).map((col, i) => (
                        <Bar
                          key={col}
                          dataKey={col}
                          fill={COLORS[i % COLORS.length]}
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                        />
                      ))}
                    </RechartsBarChart>
                  </ResponsiveContainer>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Click a bar to drill down further
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No aggregatable data available
                </div>
              )}
            </TabsContent>

            <TabsContent value="table" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      {columns.map(col => (
                        <TableHead key={col} className="font-mono text-xs whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 100).map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        {columns.map(col => (
                          <TableCell key={col} className="font-mono text-xs">
                            {String(row[col] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
                {filteredData.length > 100 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Showing first 100 of {filteredData.length} rows
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
