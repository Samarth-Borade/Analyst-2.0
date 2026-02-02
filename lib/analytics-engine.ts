/**
 * Smart Analytics Engine
 * Provides AI-powered insights, forecasting, and what-if scenario analysis
 */

// ============== DATA ANALYSIS TYPES ==============

export interface DataPoint {
  date?: string | Date;
  value: number;
  category?: string;
}

export interface Insight {
  id: string;
  type: "anomaly" | "trend" | "correlation" | "pattern" | "summary" | "recommendation";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  description: string;
  metric?: string;
  value?: number;
  change?: number;
  changePercent?: number;
  relatedFields?: string[];
  confidence: number; // 0-1
}

export interface Forecast {
  historical: DataPoint[];
  predicted: DataPoint[];
  confidence: {
    upper: DataPoint[];
    lower: DataPoint[];
  };
  metrics: {
    trend: "increasing" | "decreasing" | "stable";
    growthRate: number;
    seasonality?: string;
    accuracy: number;
  };
}

export interface WhatIfScenario {
  name: string;
  description: string;
  baselineValue: number;
  modifiedValue: number;
  percentChange: number;
  impactedMetrics: Array<{
    metric: string;
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
  }>;
}

// ============== STATISTICAL UTILITIES ==============

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squareDiffs));
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = calculateMean(x);
  const meanY = calculateMean(y);
  
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  
  for (let i = 0; i < x.length; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denominatorX += diffX * diffX;
    denominatorY += diffY * diffY;
  }
  
  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator === 0 ? 0 : numerator / denominator;
}

// Simple linear regression
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  if (x.length !== y.length || x.length === 0) {
    return { slope: 0, intercept: 0, r2: 0 };
  }
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R-squared
  const yMean = sumY / n;
  const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
  
  return { slope, intercept, r2 };
}

// ============== ANOMALY DETECTION ==============

export function detectAnomalies(
  data: Record<string, unknown>[],
  valueField: string,
  options: { threshold?: number } = {}
): Array<{ index: number; value: number; zscore: number; isAnomaly: boolean }> {
  const threshold = options.threshold ?? 2.5; // Z-score threshold
  
  const values = data
    .map((row) => Number(row[valueField]))
    .filter((v) => !isNaN(v));
  
  if (values.length === 0) return [];
  
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values);
  
  if (stdDev === 0) return values.map((v, i) => ({ index: i, value: v, zscore: 0, isAnomaly: false }));
  
  return values.map((value, index) => {
    const zscore = (value - mean) / stdDev;
    return {
      index,
      value,
      zscore,
      isAnomaly: Math.abs(zscore) > threshold,
    };
  });
}

// ============== TREND DETECTION ==============

export function detectTrend(
  data: Record<string, unknown>[],
  dateField: string,
  valueField: string
): {
  direction: "increasing" | "decreasing" | "stable";
  strength: number;
  slope: number;
  changePercent: number;
} {
  // Sort by date
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(a[dateField] as string);
    const dateB = new Date(b[dateField] as string);
    return dateA.getTime() - dateB.getTime();
  });
  
  const values = sorted.map((row) => Number(row[valueField])).filter((v) => !isNaN(v));
  if (values.length < 2) {
    return { direction: "stable", strength: 0, slope: 0, changePercent: 0 };
  }
  
  const x = values.map((_, i) => i);
  const { slope, r2 } = linearRegression(x, values);
  
  // Calculate overall change
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  
  // Determine direction with a threshold
  const threshold = 0.05; // 5% threshold
  let direction: "increasing" | "decreasing" | "stable";
  if (slope > threshold) {
    direction = "increasing";
  } else if (slope < -threshold) {
    direction = "decreasing";
  } else {
    direction = "stable";
  }
  
  return {
    direction,
    strength: r2,
    slope,
    changePercent,
  };
}

// ============== CORRELATION ANALYSIS ==============

export function findCorrelations(
  data: Record<string, unknown>[],
  numericFields: string[],
  threshold = 0.5
): Array<{
  field1: string;
  field2: string;
  correlation: number;
  strength: "strong" | "moderate" | "weak";
  direction: "positive" | "negative";
}> {
  const correlations: Array<{
    field1: string;
    field2: string;
    correlation: number;
    strength: "strong" | "moderate" | "weak";
    direction: "positive" | "negative";
  }> = [];
  
  for (let i = 0; i < numericFields.length; i++) {
    for (let j = i + 1; j < numericFields.length; j++) {
      const field1 = numericFields[i];
      const field2 = numericFields[j];
      
      const values1 = data.map((row) => Number(row[field1])).filter((v) => !isNaN(v));
      const values2 = data.map((row) => Number(row[field2])).filter((v) => !isNaN(v));
      
      if (values1.length !== values2.length || values1.length === 0) continue;
      
      const correlation = calculateCorrelation(values1, values2);
      
      if (Math.abs(correlation) >= threshold) {
        correlations.push({
          field1,
          field2,
          correlation,
          strength: Math.abs(correlation) >= 0.7 ? "strong" : Math.abs(correlation) >= 0.5 ? "moderate" : "weak",
          direction: correlation > 0 ? "positive" : "negative",
        });
      }
    }
  }
  
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

// ============== PATTERN RECOGNITION ==============

export function detectSeasonality(
  data: Record<string, unknown>[],
  dateField: string,
  valueField: string
): {
  hasSeasonality: boolean;
  period?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  confidence: number;
} {
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(a[dateField] as string);
    const dateB = new Date(b[dateField] as string);
    return dateA.getTime() - dateB.getTime();
  });
  
  if (sorted.length < 12) {
    return { hasSeasonality: false, confidence: 0 };
  }
  
  // Group by month and check for patterns
  const monthlyAverages: Record<number, number[]> = {};
  
  for (const row of sorted) {
    const date = new Date(row[dateField] as string);
    const month = date.getMonth();
    const value = Number(row[valueField]);
    
    if (!isNaN(value)) {
      if (!monthlyAverages[month]) monthlyAverages[month] = [];
      monthlyAverages[month].push(value);
    }
  }
  
  // Check if certain months consistently have higher/lower values
  const monthMeans = Object.entries(monthlyAverages).map(([month, values]) => ({
    month: Number(month),
    mean: calculateMean(values),
    count: values.length,
  }));
  
  if (monthMeans.length < 6) {
    return { hasSeasonality: false, confidence: 0 };
  }
  
  const overallMean = calculateMean(monthMeans.map((m) => m.mean));
  const variance = calculateStdDev(monthMeans.map((m) => m.mean)) / overallMean;
  
  // If coefficient of variation is high, likely seasonal
  const hasSeasonality = variance > 0.1;
  
  return {
    hasSeasonality,
    period: hasSeasonality ? "monthly" : undefined,
    confidence: Math.min(1, variance * 2),
  };
}

// ============== AUTO INSIGHTS GENERATION ==============

export function generateInsights(
  data: Record<string, unknown>[],
  schema: { columns: Array<{ name: string; type: string; isMetric?: boolean }> }
): Insight[] {
  const insights: Insight[] = [];
  
  if (!data || data.length === 0 || !schema?.columns) {
    return insights;
  }
  
  const numericFields = schema.columns
    .filter((col) => col.type === "number" || col.isMetric)
    .map((col) => col.name);
  
  const dateFields = schema.columns
    .filter((col) => col.type === "date" || col.name.toLowerCase().includes("date"))
    .map((col) => col.name);
  
  // 1. Summary statistics for each numeric field
  for (const field of numericFields.slice(0, 5)) { // Limit to 5 fields
    const values = data.map((row) => Number(row[field])).filter((v) => !isNaN(v));
    if (values.length === 0) continue;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = calculateMean(values);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    insights.push({
      id: `summary-${field}`,
      type: "summary",
      severity: "info",
      title: `${field} Overview`,
      description: `Total: ${formatNumber(sum)}, Average: ${formatNumber(mean)}, Range: ${formatNumber(min)} - ${formatNumber(max)}`,
      metric: field,
      value: sum,
      confidence: 1,
    });
  }
  
  // 2. Anomaly detection
  for (const field of numericFields.slice(0, 3)) {
    const anomalies = detectAnomalies(data, field);
    const anomalyCount = anomalies.filter((a) => a.isAnomaly).length;
    
    if (anomalyCount > 0) {
      const topAnomaly = anomalies.filter((a) => a.isAnomaly).sort((a, b) => Math.abs(b.zscore) - Math.abs(a.zscore))[0];
      
      insights.push({
        id: `anomaly-${field}`,
        type: "anomaly",
        severity: anomalyCount > 3 ? "warning" : "info",
        title: `${anomalyCount} Anomalies in ${field}`,
        description: `Detected ${anomalyCount} unusual values. Most extreme: ${formatNumber(topAnomaly.value)} (${topAnomaly.zscore > 0 ? "+" : ""}${topAnomaly.zscore.toFixed(1)} std dev from mean)`,
        metric: field,
        value: topAnomaly.value,
        relatedFields: [field],
        confidence: 0.85,
      });
    }
  }
  
  // 3. Trend detection (if date field exists)
  if (dateFields.length > 0 && numericFields.length > 0) {
    const dateField = dateFields[0];
    
    for (const field of numericFields.slice(0, 3)) {
      const trend = detectTrend(data, dateField, field);
      
      if (trend.strength > 0.3) {
        const emoji = trend.direction === "increasing" ? "📈" : trend.direction === "decreasing" ? "📉" : "➡️";
        
        insights.push({
          id: `trend-${field}`,
          type: "trend",
          severity: trend.direction === "increasing" ? "success" : trend.direction === "decreasing" ? "warning" : "info",
          title: `${emoji} ${field} is ${trend.direction}`,
          description: `${trend.direction === "stable" ? "No significant change" : `${trend.changePercent > 0 ? "+" : ""}${trend.changePercent.toFixed(1)}% change over the period`}. Trend confidence: ${(trend.strength * 100).toFixed(0)}%`,
          metric: field,
          changePercent: trend.changePercent,
          relatedFields: [field, dateField],
          confidence: trend.strength,
        });
      }
    }
  }
  
  // 4. Correlation analysis
  if (numericFields.length >= 2) {
    const correlations = findCorrelations(data, numericFields, 0.6);
    
    for (const corr of correlations.slice(0, 3)) {
      const emoji = corr.direction === "positive" ? "🔗" : "⚡";
      
      insights.push({
        id: `correlation-${corr.field1}-${corr.field2}`,
        type: "correlation",
        severity: "info",
        title: `${emoji} ${corr.strength} ${corr.direction} correlation`,
        description: `${corr.field1} and ${corr.field2} are ${corr.direction}ly correlated (r=${corr.correlation.toFixed(2)}). When one ${corr.direction === "positive" ? "increases" : "increases"}, the other tends to ${corr.direction === "positive" ? "increase" : "decrease"}.`,
        relatedFields: [corr.field1, corr.field2],
        confidence: Math.abs(corr.correlation),
      });
    }
  }
  
  // 5. Top performers / outliers
  for (const field of numericFields.slice(0, 2)) {
    const values = data.map((row, idx) => ({ value: Number(row[field]), idx })).filter((v) => !isNaN(v.value));
    if (values.length === 0) continue;
    
    const sorted = values.sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const mean = calculateMean(values.map((v) => v.value));
    
    if (top.value > mean * 2) {
      // Find what makes the top performer unique
      const topRow = data[top.idx];
      const categoryFields = schema.columns.filter((col) => col.type === "string").slice(0, 1);
      const topCategory = categoryFields.length > 0 ? topRow[categoryFields[0].name] : undefined;
      
      insights.push({
        id: `top-${field}`,
        type: "pattern",
        severity: "success",
        title: `🏆 Top performer in ${field}`,
        description: `${topCategory ? `"${topCategory}"` : "One item"} leads with ${formatNumber(top.value)}, which is ${((top.value / mean - 1) * 100).toFixed(0)}% above average.`,
        metric: field,
        value: top.value,
        confidence: 0.9,
      });
    }
  }
  
  // Sort by confidence and severity
  const severityOrder = { critical: 0, warning: 1, success: 2, info: 3 };
  return insights.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });
}

// ============== FORECASTING ==============

export function generateForecast(
  data: Record<string, unknown>[],
  dateField: string,
  valueField: string,
  periods = 6
): Forecast {
  // Sort by date
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(a[dateField] as string);
    const dateB = new Date(b[dateField] as string);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Extract historical values
  const historical: DataPoint[] = sorted.map((row) => ({
    date: row[dateField] as string,
    value: Number(row[valueField]) || 0,
  }));
  
  if (historical.length < 3) {
    return {
      historical,
      predicted: [],
      confidence: { upper: [], lower: [] },
      metrics: { trend: "stable", growthRate: 0, accuracy: 0 },
    };
  }
  
  // Perform linear regression
  const x = historical.map((_, i) => i);
  const y = historical.map((p) => p.value);
  const { slope, intercept, r2 } = linearRegression(x, y);
  
  // Calculate residual standard error for confidence intervals
  const predictions = x.map((xi) => slope * xi + intercept);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const residualStdDev = calculateStdDev(residuals);
  
  // Generate future predictions
  const lastDate = new Date(historical[historical.length - 1].date as string);
  const predicted: DataPoint[] = [];
  const upper: DataPoint[] = [];
  const lower: DataPoint[] = [];
  
  // Estimate time interval
  let intervalMs = 30 * 24 * 60 * 60 * 1000; // Default to monthly
  if (historical.length >= 2) {
    const date1 = new Date(historical[0].date as string);
    const date2 = new Date(historical[1].date as string);
    intervalMs = Math.abs(date2.getTime() - date1.getTime());
  }
  
  for (let i = 1; i <= periods; i++) {
    const futureX = historical.length - 1 + i;
    const predictedValue = slope * futureX + intercept;
    const futureDate = new Date(lastDate.getTime() + intervalMs * i);
    
    // Confidence interval widens as we predict further out
    const confidenceMultiplier = 1.96 * Math.sqrt(1 + 1 / historical.length + Math.pow(futureX - (historical.length - 1) / 2, 2) / historical.length);
    const margin = residualStdDev * confidenceMultiplier * (1 + i * 0.1);
    
    predicted.push({ date: futureDate.toISOString().split("T")[0], value: Math.max(0, predictedValue) });
    upper.push({ date: futureDate.toISOString().split("T")[0], value: Math.max(0, predictedValue + margin) });
    lower.push({ date: futureDate.toISOString().split("T")[0], value: Math.max(0, predictedValue - margin) });
  }
  
  // Determine trend
  const trend: "increasing" | "decreasing" | "stable" = 
    slope > 0.01 ? "increasing" : slope < -0.01 ? "decreasing" : "stable";
  
  // Growth rate (percentage per period)
  const firstValue = historical[0].value;
  const lastValue = historical[historical.length - 1].value;
  const growthRate = firstValue !== 0 ? ((lastValue - firstValue) / firstValue / (historical.length - 1)) * 100 : 0;
  
  return {
    historical,
    predicted,
    confidence: { upper, lower },
    metrics: {
      trend,
      growthRate,
      accuracy: Math.max(0, Math.min(1, r2)),
    },
  };
}

// ============== WHAT-IF SCENARIOS ==============

export function runWhatIfScenario(
  data: Record<string, unknown>[],
  targetField: string,
  changePercent: number,
  impactedFields: Array<{ field: string; elasticity?: number }>
): WhatIfScenario {
  // Calculate baseline values
  const targetValues = data.map((row) => Number(row[targetField])).filter((v) => !isNaN(v));
  const baselineValue = calculateMean(targetValues);
  const modifiedValue = baselineValue * (1 + changePercent / 100);
  
  // Calculate impact on related metrics
  const impactedMetrics: WhatIfScenario["impactedMetrics"] = [];
  
  for (const { field, elasticity = 1 } of impactedFields) {
    const fieldValues = data.map((row) => Number(row[field])).filter((v) => !isNaN(v));
    const baseline = calculateMean(fieldValues);
    
    // Simple elasticity model: % change in Y = elasticity * % change in X
    const fieldChangePercent = changePercent * elasticity;
    const projected = baseline * (1 + fieldChangePercent / 100);
    
    impactedMetrics.push({
      metric: field,
      baseline,
      projected,
      change: projected - baseline,
      changePercent: fieldChangePercent,
    });
  }
  
  return {
    name: `${targetField} ${changePercent > 0 ? "increase" : "decrease"} by ${Math.abs(changePercent)}%`,
    description: `What if ${targetField} changed by ${changePercent > 0 ? "+" : ""}${changePercent}%?`,
    baselineValue,
    modifiedValue,
    percentChange: changePercent,
    impactedMetrics,
  };
}

// ============== HELPER FUNCTIONS ==============

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(1) + "B";
  } else if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(1) + "M";
  } else if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(1) + "K";
  } else if (Math.abs(value) < 1 && value !== 0) {
    return value.toFixed(2);
  }
  return value.toFixed(0);
}
