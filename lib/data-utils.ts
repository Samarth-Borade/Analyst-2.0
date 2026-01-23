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
