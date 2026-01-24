import type { Column, ColumnType, DataSchema } from "./store";

export function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const data: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        // Try to parse as number
        const num = Number(value);
        if (!isNaN(num) && value.trim() !== "") {
          row[header] = num;
        } else {
          row[header] = value;
        }
      });
      data.push(row);
    }
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

export function inferColumnType(values: unknown[]): ColumnType {
  const sample = values.slice(0, 100).filter((v) => v != null && v !== "");

  if (sample.length === 0) return "text";

  // Check if all are numbers
  const allNumbers = sample.every((v) => typeof v === "number" || !isNaN(Number(v)));
  if (allNumbers) return "numeric";

  // Check if dates
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
  const allDates = sample.every((v) => {
    if (typeof v !== "string") return false;
    return datePattern.test(v) || !isNaN(Date.parse(v));
  });
  if (allDates) return "datetime";

  // Check if categorical (low cardinality)
  const uniqueCount = new Set(sample).size;
  if (uniqueCount <= Math.min(20, sample.length * 0.3)) return "categorical";

  return "text";
}

export function analyzeData(data: Record<string, unknown>[]): DataSchema {
  if (data.length === 0) {
    return { columns: [], rowCount: 0, summary: "Empty dataset" };
  }

  const columnNames = Object.keys(data[0]);
  const columns: Column[] = columnNames.map((name) => {
    const values = data.map((row) => row[name]);
    const type = inferColumnType(values);
    const uniqueValues = [...new Set(values.map(String))];
    const nullCount = values.filter((v) => v == null || v === "").length;

    return {
      name,
      type,
      sample: uniqueValues.slice(0, 5),
      uniqueCount: uniqueValues.length,
      nullCount,
      isMetric: type === "numeric",
      isDimension: type === "categorical" || type === "datetime",
    };
  });

  const metrics = columns.filter((c) => c.isMetric).map((c) => c.name);
  const dimensions = columns.filter((c) => c.isDimension).map((c) => c.name);
  const dateColumns = columns.filter((c) => c.type === "datetime").map((c) => c.name);

  let summary = `Dataset contains ${data.length.toLocaleString()} rows and ${columns.length} columns. `;
  if (metrics.length > 0) {
    summary += `Metrics: ${metrics.join(", ")}. `;
  }
  if (dimensions.length > 0) {
    summary += `Dimensions: ${dimensions.join(", ")}. `;
  }
  if (dateColumns.length > 0) {
    summary += `Time series detected on: ${dateColumns.join(", ")}.`;
  }

  return { columns, rowCount: data.length, summary };
}

export function aggregateData(
  data: Record<string, unknown>[],
  groupBy: string,
  metric: string,
  aggregation: "sum" | "avg" | "count" | "min" | "max" = "sum"
): { name: string; value: number }[] {
  const groups = new Map<string, number[]>();

  data.forEach((row) => {
    const key = String(row[groupBy] ?? "Unknown");
    const value = Number(row[metric]) || 0;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(value);
  });

  const result: { name: string; value: number }[] = [];
  groups.forEach((values, name) => {
    let aggregatedValue: number;
    switch (aggregation) {
      case "sum":
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "count":
        aggregatedValue = values.length;
        break;
      case "min":
        aggregatedValue = Math.min(...values);
        break;
      case "max":
        aggregatedValue = Math.max(...values);
        break;
    }
    result.push({ name, value: aggregatedValue });
  });

  return result.sort((a, b) => b.value - a.value).slice(0, 20);
}

export function aggregateMultipleMetrics(
  data: Record<string, unknown>[],
  groupBy: string,
  metrics: string[],
  aggregation: "sum" | "avg" | "count" | "min" | "max" = "sum"
): Record<string, unknown>[] {
  const groups = new Map<string, Record<string, number[]>>();

  data.forEach((row) => {
    const key = String(row[groupBy] ?? "Unknown");
    if (!groups.has(key)) {
      const metricsObj: Record<string, number[]> = {};
      metrics.forEach((m) => (metricsObj[m] = []));
      groups.set(key, metricsObj);
    }
    const group = groups.get(key)!;
    metrics.forEach((m) => {
      group[m].push(Number(row[m]) || 0);
    });
  });

  const result: Record<string, unknown>[] = [];
  groups.forEach((metricsData, name) => {
    const row: Record<string, unknown> = { name };
    metrics.forEach((m) => {
      const values = metricsData[m];
      switch (aggregation) {
        case "sum":
          row[m] = values.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          row[m] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "count":
          row[m] = values.length;
          break;
        case "min":
          row[m] = Math.min(...values);
          break;
        case "max":
          row[m] = Math.max(...values);
          break;
      }
    });
    result.push(row);
  });

  return result.sort((a, b) => (b[metrics[0]] as number) - (a[metrics[0]] as number)).slice(0, 20);
}

export function calculateKPI(
  data: Record<string, unknown>[],
  metric: string,
  aggregation: "sum" | "avg" | "count" | "min" | "max" = "sum"
): number {
  const values = data.map((row) => Number(row[metric]) || 0);
  switch (aggregation) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "count":
      return values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 2);
}

export function getTimeSeriesData(
  data: Record<string, unknown>[],
  dateColumn: string,
  metric: string,
  aggregation: "sum" | "avg" | "count" | "min" | "max" = "sum"
): { date: string; value: number }[] {
  const groups = new Map<string, number[]>();

  data.forEach((row) => {
    const dateVal = row[dateColumn];
    if (!dateVal) return;
    
    let dateKey: string;
    if (typeof dateVal === "string") {
      const parsed = new Date(dateVal);
      if (!isNaN(parsed.getTime())) {
        dateKey = parsed.toISOString().split("T")[0];
      } else {
        dateKey = dateVal;
      }
    } else {
      dateKey = String(dateVal);
    }

    const value = Number(row[metric]) || 0;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(value);
  });

  const result: { date: string; value: number }[] = [];
  groups.forEach((values, date) => {
    let aggregatedValue: number;
    switch (aggregation) {
      case "sum":
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "count":
        aggregatedValue = values.length;
        break;
      case "min":
        aggregatedValue = Math.min(...values);
        break;
      case "max":
        aggregatedValue = Math.max(...values);
        break;
    }
    result.push({ date, value: aggregatedValue });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================
// STATISTICAL ANALYSIS FOR LLM OPTIMIZATION
// ============================================

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  sum: number;
  count: number;
  percentiles: { p25: number; p75: number };
}

export interface CategoricalStats {
  uniqueCount: number;
  topValues: { value: string; count: number; percentage: number }[];
  nullCount: number;
}

export interface DateStats {
  minDate: string;
  maxDate: string;
  range: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "irregular";
}

export interface ColumnStats {
  name: string;
  type: ColumnType;
  numeric?: NumericStats;
  categorical?: CategoricalStats;
  date?: DateStats;
}

export interface DataStatistics {
  rowCount: number;
  columnCount: number;
  columns: ColumnStats[];
  correlations?: { col1: string; col2: string; correlation: number }[];
}

function calculateNumericStats(values: number[]): NumericStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  if (n === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, sum: 0, count: 0, percentiles: { p25: 0, p75: 0 } };
  }
  
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const p25Index = Math.floor(n * 0.25);
  const p75Index = Math.floor(n * 0.75);
  
  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    sum: Math.round(sum * 100) / 100,
    count: n,
    percentiles: {
      p25: sorted[p25Index],
      p75: sorted[p75Index],
    },
  };
}

function calculateCategoricalStats(values: unknown[]): CategoricalStats {
  const counts = new Map<string, number>();
  let nullCount = 0;
  
  values.forEach((v) => {
    if (v == null || v === "") {
      nullCount++;
      return;
    }
    const key = String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  
  const total = values.length - nullCount;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const topValues = sorted.slice(0, 10).map(([value, count]) => ({
    value,
    count,
    percentage: Math.round((count / total) * 100 * 10) / 10,
  }));
  
  return {
    uniqueCount: counts.size,
    topValues,
    nullCount,
  };
}

function calculateDateStats(values: string[]): DateStats {
  const validDates = values
    .map((v) => new Date(v))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (validDates.length === 0) {
    return { minDate: "", maxDate: "", range: "unknown", frequency: "irregular" };
  }
  
  const minDate = validDates[0];
  const maxDate = validDates[validDates.length - 1];
  const rangeDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Estimate frequency based on data density
  const avgGap = rangeDays / validDates.length;
  let frequency: "daily" | "weekly" | "monthly" | "yearly" | "irregular";
  if (avgGap <= 2) frequency = "daily";
  else if (avgGap <= 10) frequency = "weekly";
  else if (avgGap <= 45) frequency = "monthly";
  else if (avgGap <= 400) frequency = "yearly";
  else frequency = "irregular";
  
  return {
    minDate: minDate.toISOString().split("T")[0],
    maxDate: maxDate.toISOString().split("T")[0],
    range: `${rangeDays} days`,
    frequency,
  };
}

/**
 * Generate comprehensive statistics for the dataset
 * This is what we send to LLM instead of raw data
 */
export function generateDataStatistics(data: Record<string, unknown>[]): DataStatistics {
  if (data.length === 0) {
    return { rowCount: 0, columnCount: 0, columns: [] };
  }
  
  const columnNames = Object.keys(data[0]);
  const columns: ColumnStats[] = columnNames.map((name) => {
    const values = data.map((row) => row[name]);
    const type = inferColumnType(values);
    
    const stats: ColumnStats = { name, type };
    
    if (type === "numeric") {
      const numericValues = values.filter((v) => v != null && v !== "").map(Number);
      stats.numeric = calculateNumericStats(numericValues);
    } else if (type === "categorical" || type === "text") {
      stats.categorical = calculateCategoricalStats(values);
    } else if (type === "datetime") {
      stats.date = calculateDateStats(values.filter((v): v is string => typeof v === "string"));
      // Also include categorical stats for datetime to show distribution
      stats.categorical = calculateCategoricalStats(values);
    }
    
    return stats;
  });
  
  // Calculate correlations between numeric columns (top 5 most correlated pairs)
  const numericCols = columns.filter((c) => c.type === "numeric");
  const correlations: { col1: string; col2: string; correlation: number }[] = [];
  
  if (numericCols.length >= 2 && data.length > 10) {
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i].name;
        const col2 = numericCols[j].name;
        const correlation = calculateCorrelation(data, col1, col2);
        if (!isNaN(correlation)) {
          correlations.push({ col1, col2, correlation: Math.round(correlation * 100) / 100 });
        }
      }
    }
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
  
  return {
    rowCount: data.length,
    columnCount: columnNames.length,
    columns,
    correlations: correlations.slice(0, 5), // Top 5 correlations
  };
}

function calculateCorrelation(data: Record<string, unknown>[], col1: string, col2: string): number {
  const pairs = data
    .filter((row) => row[col1] != null && row[col2] != null)
    .map((row) => [Number(row[col1]), Number(row[col2])]);
  
  if (pairs.length < 3) return NaN;
  
  const n = pairs.length;
  const sumX = pairs.reduce((acc, [x]) => acc + x, 0);
  const sumY = pairs.reduce((acc, [, y]) => acc + y, 0);
  const sumXY = pairs.reduce((acc, [x, y]) => acc + x * y, 0);
  const sumX2 = pairs.reduce((acc, [x]) => acc + x * x, 0);
  const sumY2 = pairs.reduce((acc, [, y]) => acc + y * y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Compress dashboard config for LLM context
 * Removes unnecessary properties, keeps only what LLM needs
 */
export function compressDashboardForLLM(dashboard: {
  pages?: Array<{
    id: string;
    name: string;
    showTitle?: boolean;
    charts: Array<Record<string, unknown>>;
  }>;
}): unknown {
  if (!dashboard?.pages) return dashboard;
  
  return {
    pages: dashboard.pages.map((page) => ({
      id: page.id,
      name: page.name,
      showTitle: page.showTitle,
      charts: page.charts.map((chart) => {
        // Only include essential properties
        const compressed: Record<string, unknown> = {
          id: chart.id,
          type: chart.type,
          title: chart.title,
        };
        
        // Include axis info if present
        if (chart.xAxis) compressed.xAxis = chart.xAxis;
        if (chart.yAxis) compressed.yAxis = chart.yAxis;
        if (chart.groupBy) compressed.groupBy = chart.groupBy;
        if (chart.aggregation) compressed.aggregation = chart.aggregation;
        if (chart.columns) compressed.columns = chart.columns;
        
        // Include position/size (needed for layout decisions)
        compressed.position = { x: chart.x, y: chart.y, w: chart.width, h: chart.height };
        
        return compressed;
      }),
    })),
  };
}

/**
 * Get smart sample data - stratified sampling instead of just first N rows
 */
export function getSmartSample(data: Record<string, unknown>[], sampleSize: number = 5): Record<string, unknown>[] {
  if (data.length <= sampleSize) return data;
  
  // Get first row, last row, and evenly spaced middle rows
  const result: Record<string, unknown>[] = [];
  result.push(data[0]); // First row
  
  const step = Math.floor(data.length / (sampleSize - 1));
  for (let i = 1; i < sampleSize - 1; i++) {
    result.push(data[i * step]);
  }
  
  result.push(data[data.length - 1]); // Last row
  
  return result;
}
