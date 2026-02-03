"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/store";

interface CorrelationMatrixProps {
  dataSource: DataSource;
  compact?: boolean;
}

interface CorrelationResult {
  column1: string;
  column2: string;
  correlation: number;
}

interface InsightItem {
  type: "strong-positive" | "strong-negative" | "moderate" | "weak" | "warning";
  icon: React.ReactNode;
  text: string;
  subtext?: string;
}

// Calculate Pearson correlation coefficient between two arrays
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Get color based on correlation value
function getCorrelationColor(value: number): string {
  const absValue = Math.abs(value);
  
  if (value === 1) {
    return "bg-purple-600 text-white";
  }
  
  if (value > 0) {
    // Positive correlations - blue to purple
    if (absValue >= 0.8) return "bg-purple-500 text-white";
    if (absValue >= 0.6) return "bg-purple-400 text-white";
    if (absValue >= 0.4) return "bg-purple-300 text-purple-900";
    if (absValue >= 0.2) return "bg-purple-200 text-purple-800";
    return "bg-purple-100 text-purple-700";
  } else {
    // Negative correlations - orange to red
    if (absValue >= 0.8) return "bg-rose-500 text-white";
    if (absValue >= 0.6) return "bg-rose-400 text-white";
    if (absValue >= 0.4) return "bg-orange-300 text-orange-900";
    if (absValue >= 0.2) return "bg-orange-200 text-orange-800";
    return "bg-orange-100 text-orange-700";
  }
}

// Get correlation strength label
function getCorrelationStrength(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 0.8) return "Very Strong";
  if (absValue >= 0.6) return "Strong";
  if (absValue >= 0.4) return "Moderate";
  if (absValue >= 0.2) return "Weak";
  return "Very Weak";
}

// Generate human-readable insights
function generateInsights(
  correlations: CorrelationResult[],
  numericColumns: string[]
): InsightItem[] {
  const insights: InsightItem[] = [];
  
  // Filter out self-correlations and duplicates
  const uniqueCorrelations = correlations.filter(
    (c) => c.column1 !== c.column2 && c.column1 < c.column2
  );

  // Sort by absolute correlation value
  const sorted = [...uniqueCorrelations].sort(
    (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
  );

  // Find strong positive correlations
  const strongPositive = sorted.filter((c) => c.correlation >= 0.7);
  strongPositive.slice(0, 2).forEach((c) => {
    insights.push({
      type: "strong-positive",
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      text: `${c.column1} and ${c.column2} move together`,
      subtext: `When one increases, the other typically increases too (${(c.correlation * 100).toFixed(0)}% correlation)`,
    });
  });

  // Find strong negative correlations
  const strongNegative = sorted.filter((c) => c.correlation <= -0.7);
  strongNegative.slice(0, 2).forEach((c) => {
    insights.push({
      type: "strong-negative",
      icon: <TrendingDown className="h-4 w-4 text-rose-500" />,
      text: `${c.column1} and ${c.column2} move opposite`,
      subtext: `When one increases, the other typically decreases (${(Math.abs(c.correlation) * 100).toFixed(0)}% inverse correlation)`,
    });
  });

  // Find moderate correlations worth noting
  const moderate = sorted.filter((c) => Math.abs(c.correlation) >= 0.4 && Math.abs(c.correlation) < 0.7);
  if (moderate.length > 0 && insights.length < 4) {
    const m = moderate[0];
    insights.push({
      type: "moderate",
      icon: <Minus className="h-4 w-4 text-amber-500" />,
      text: `Moderate relationship: ${m.column1} ↔ ${m.column2}`,
      subtext: `There's a ${m.correlation > 0 ? "positive" : "negative"} trend worth exploring (${(Math.abs(m.correlation) * 100).toFixed(0)}%)`,
    });
  }

  // Add general insight if correlations exist
  if (strongPositive.length > 0 || strongNegative.length > 0) {
    insights.push({
      type: "warning",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      text: "Correlated variables detected",
      subtext: "Consider this when building models — highly correlated variables may cause multicollinearity",
    });
  }

  // If no strong correlations found
  if (insights.length === 0) {
    insights.push({
      type: "weak",
      icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
      text: "Variables appear relatively independent",
      subtext: "No strong correlations found — variables can be used independently in analysis",
    });
  }

  return insights;
}

// Determine which columns are potential key drivers
function findKeyDrivers(
  correlations: CorrelationResult[],
  targetMetric: string | null
): string[] {
  if (!targetMetric) return [];
  
  const related = correlations
    .filter((c) => 
      (c.column1 === targetMetric || c.column2 === targetMetric) && 
      c.column1 !== c.column2
    )
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return related
    .filter((c) => Math.abs(c.correlation) >= 0.4)
    .slice(0, 3)
    .map((c) => (c.column1 === targetMetric ? c.column2 : c.column1));
}

export function CorrelationMatrix({ dataSource, compact = false }: CorrelationMatrixProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Get numeric columns only
  const numericColumns = useMemo(() => {
    return dataSource.schema.columns
      .filter((col) => col.type === "numeric")
      .map((col) => col.name);
  }, [dataSource.schema.columns]);

  // Calculate correlation matrix
  const { matrix, correlations } = useMemo(() => {
    const data = dataSource.data;
    const matrix: Map<string, Map<string, number>> = new Map();
    const correlations: CorrelationResult[] = [];

    numericColumns.forEach((col1) => {
      if (!matrix.has(col1)) matrix.set(col1, new Map());
      
      numericColumns.forEach((col2) => {
        if (col1 === col2) {
          matrix.get(col1)!.set(col2, 1);
          correlations.push({ column1: col1, column2: col2, correlation: 1 });
        } else {
          // Extract values for both columns
          const values1: number[] = [];
          const values2: number[] = [];
          
          data.forEach((row) => {
            const v1 = Number(row[col1]);
            const v2 = Number(row[col2]);
            if (!isNaN(v1) && !isNaN(v2)) {
              values1.push(v1);
              values2.push(v2);
            }
          });

          const corr = calculateCorrelation(values1, values2);
          matrix.get(col1)!.set(col2, corr);
          correlations.push({ column1: col1, column2: col2, correlation: corr });
        }
      });
    });

    return { matrix, correlations };
  }, [numericColumns, dataSource.data]);

  // Generate insights
  const insights = useMemo(
    () => generateInsights(correlations, numericColumns),
    [correlations, numericColumns]
  );

  // Find the most likely target metric (highest unique count often indicates a measure)
  const likelyTargetMetric = useMemo(() => {
    const metrics = dataSource.schema.columns.filter((c) => c.isMetric);
    if (metrics.length === 0) return null;
    // Pick the one that might be a key outcome (often contains keywords)
    const outcome = metrics.find((m) =>
      /revenue|sales|profit|total|amount|value|count|quantity/i.test(m.name)
    );
    return outcome?.name || metrics[0]?.name || null;
  }, [dataSource.schema.columns]);

  const keyDrivers = useMemo(
    () => findKeyDrivers(correlations, likelyTargetMetric),
    [correlations, likelyTargetMetric]
  );

  if (numericColumns.length < 2) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Need at least 2 numeric columns for correlation analysis</p>
      </div>
    );
  }

  // Limit columns for display (max 8 for readability)
  const displayColumns = numericColumns.slice(0, 8);
  const hasMoreColumns = numericColumns.length > 8;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Correlation Matrix</h3>
            <Badge variant="secondary" className="text-[10px]">
              {numericColumns.length} variables
            </Badge>
          </div>
          <button className="p-1 hover:bg-muted rounded transition-colors">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {expanded && (
          <>
            {/* Matrix Heatmap */}
            <div className="overflow-x-auto pb-2 -mx-1">
              <div className="inline-block">
                {/* Column Headers */}
                <div className="flex">
                  <div className="w-16 shrink-0" /> {/* Empty corner cell */}
                  {displayColumns.map((col) => (
                    <Tooltip key={col}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-9 h-14 flex items-end justify-center pb-1 text-[8px] font-mono text-muted-foreground"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                            transform: "rotate(180deg)",
                          }}
                        >
                          <span className="truncate max-h-12">{col.slice(0, 6)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{col}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Matrix Rows */}
                {displayColumns.map((rowCol) => (
                  <div key={rowCol} className="flex">
                    {/* Row header */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-16 shrink-0 h-7 flex items-center justify-end pr-1 text-[8px] font-mono text-muted-foreground truncate">
                          {rowCol.slice(0, 8)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">{rowCol}</TooltipContent>
                    </Tooltip>

                    {/* Cells */}
                    {displayColumns.map((colCol) => {
                      const value = matrix.get(rowCol)?.get(colCol) ?? 0;
                      const cellKey = `${rowCol}-${colCol}`;
                      const isHovered = hoveredCell === cellKey;
                      const isDiagonal = rowCol === colCol;

                      return (
                        <Tooltip key={colCol}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-9 h-7 flex items-center justify-center text-[8px] font-mono border border-background/50 transition-all cursor-pointer",
                                getCorrelationColor(value),
                                isHovered && "ring-2 ring-primary ring-offset-1",
                                isDiagonal && "opacity-60"
                              )}
                              onMouseEnter={() => setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {value.toFixed(2)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {rowCol} ↔ {colCol}
                              </p>
                              <p className="text-sm">
                                Correlation: <span className="font-mono">{value.toFixed(3)}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getCorrelationStrength(value)}{" "}
                                {value > 0 ? "positive" : value < 0 ? "negative" : ""} correlation
                              </p>
                              {!isDiagonal && Math.abs(value) >= 0.5 && (
                                <p className="text-xs">
                                  {value > 0
                                    ? "These variables tend to increase together"
                                    : "When one increases, the other tends to decrease"}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>

              {hasMoreColumns && (
                <p className="text-[9px] text-muted-foreground mt-1">
                  Showing first 8 of {numericColumns.length} numeric columns
                </p>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground justify-center flex-wrap">
              <span>Correlation:</span>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-2.5 bg-rose-500 rounded-sm" />
                <span>-1</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-2.5 bg-orange-200 rounded-sm" />
                <span>-0.5</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-2.5 bg-gray-100 rounded-sm border" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-2.5 bg-purple-200 rounded-sm" />
                <span>+0.5</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-2.5 bg-purple-600 rounded-sm" />
                <span>+1</span>
              </div>
            </div>

            {/* Key Drivers Section */}
            {likelyTargetMetric && keyDrivers.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">
                    Key Drivers for {likelyTargetMetric}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keyDrivers.map((driver) => {
                    const corr = correlations.find(
                      (c) =>
                        (c.column1 === likelyTargetMetric && c.column2 === driver) ||
                        (c.column2 === likelyTargetMetric && c.column1 === driver)
                    );
                    return (
                      <Badge
                        key={driver}
                        variant="outline"
                        className="text-[10px] flex items-center gap-1"
                      >
                        {corr && corr.correlation > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-rose-500" />
                        )}
                        {driver}
                        <span className="text-muted-foreground ml-1">
                          ({corr ? (corr.correlation * 100).toFixed(0) : 0}%)
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plain Language Insights */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium">What This Means</span>
              </div>
              <div className="space-y-2 pl-1">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5">{insight.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{insight.text}</p>
                      {insight.subtext && (
                        <p className="text-[10px] text-muted-foreground">{insight.subtext}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Reference */}
            <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
              <p className="font-medium">📊 Quick Reference:</p>
              <ul className="space-y-0.5 pl-2">
                <li>• <strong>Correlation</strong> = How much two numbers change together (-1 to +1)</li>
                <li>• <strong>+1.0</strong> = Perfect positive (both go up together)</li>
                <li>• <strong>-1.0</strong> = Perfect negative (one up, other down)</li>
                <li>• <strong>0</strong> = No relationship</li>
                <li>• <strong>Above ±0.7</strong> = Strong relationship worth investigating</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// Combined Correlation Matrix for merged/related tables
interface CombinedCorrelationMatrixProps {
  dataSources: DataSource[];
  relationColumns?: { sourceCol: string; targetCol: string }[];
}

export function CombinedCorrelationMatrix({
  dataSources,
  relationColumns = [],
}: CombinedCorrelationMatrixProps) {
  const [expanded, setExpanded] = useState(true);

  // Combine numeric columns from all sources
  const allNumericColumns = useMemo(() => {
    const columns: { name: string; sourceName: string; fullName: string }[] = [];
    
    dataSources.forEach((ds) => {
      ds.schema.columns
        .filter((col) => col.type === "numeric")
        .forEach((col) => {
          const sourceName = ds.name.replace(".csv", "").replace("_data", "");
          columns.push({
            name: col.name,
            sourceName,
            fullName: `${sourceName}.${col.name}`,
          });
        });
    });

    return columns;
  }, [dataSources]);

  // Create merged data lookup for cross-table correlations
  const crossTableCorrelations = useMemo(() => {
    if (dataSources.length < 2 || relationColumns.length === 0) return [];

    const correlations: CorrelationResult[] = [];
    
    // For each pair of data sources
    for (let i = 0; i < dataSources.length; i++) {
      for (let j = i + 1; j < dataSources.length; j++) {
        const ds1 = dataSources[i];
        const ds2 = dataSources[j];

        // Find relation between these tables
        const relation = relationColumns.find(
          (r) =>
            (ds1.schema.columns.some((c) => c.name === r.sourceCol) &&
              ds2.schema.columns.some((c) => c.name === r.targetCol)) ||
            (ds2.schema.columns.some((c) => c.name === r.sourceCol) &&
              ds1.schema.columns.some((c) => c.name === r.targetCol))
        );

        if (!relation) continue;

        // Create joined data based on relation
        const lookup = new Map<string, Record<string, unknown>[]>();
        ds2.data.forEach((row) => {
          const key = String(row[relation.targetCol] ?? row[relation.sourceCol] ?? "");
          if (!lookup.has(key)) lookup.set(key, []);
          lookup.get(key)!.push(row);
        });

        // Get numeric columns from both
        const numCols1 = ds1.schema.columns.filter((c) => c.type === "numeric").map((c) => c.name);
        const numCols2 = ds2.schema.columns.filter((c) => c.type === "numeric").map((c) => c.name);

        // Calculate cross-table correlations
        numCols1.forEach((col1) => {
          numCols2.forEach((col2) => {
            const values1: number[] = [];
            const values2: number[] = [];

            ds1.data.forEach((row1) => {
              const key = String(row1[relation.sourceCol] ?? row1[relation.targetCol] ?? "");
              const matchingRows = lookup.get(key) || [];
              
              matchingRows.forEach((row2) => {
                const v1 = Number(row1[col1]);
                const v2 = Number(row2[col2]);
                if (!isNaN(v1) && !isNaN(v2)) {
                  values1.push(v1);
                  values2.push(v2);
                }
              });
            });

            if (values1.length > 5) {
              const corr = calculateCorrelation(values1, values2);
              correlations.push({
                column1: `${ds1.name.replace(".csv", "")}.${col1}`,
                column2: `${ds2.name.replace(".csv", "")}.${col2}`,
                correlation: corr,
              });
            }
          });
        });
      }
    }

    return correlations;
  }, [dataSources, relationColumns]);

  // Generate insights for cross-table correlations
  const crossInsights = useMemo(() => {
    const insights: InsightItem[] = [];
    
    const strongCorr = crossTableCorrelations.filter(
      (c) => Math.abs(c.correlation) >= 0.5
    ).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    strongCorr.slice(0, 3).forEach((c) => {
      const isPositive = c.correlation > 0;
      insights.push({
        type: isPositive ? "strong-positive" : "strong-negative",
        icon: isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-rose-500" />
        ),
        text: `Cross-table relationship found`,
        subtext: `${c.column1} and ${c.column2} are ${isPositive ? "positively" : "inversely"} related (${(Math.abs(c.correlation) * 100).toFixed(0)}%)`,
      });
    });

    if (insights.length === 0 && crossTableCorrelations.length > 0) {
      insights.push({
        type: "weak",
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
        text: "No strong cross-table correlations",
        subtext: "Variables across tables appear to be independent",
      });
    }

    return insights;
  }, [crossTableCorrelations]);

  if (dataSources.length < 2) {
    return null;
  }

  if (allNumericColumns.length < 4) {
    return (
      <div className="p-4 text-center text-muted-foreground border rounded-lg bg-card">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Need more numeric columns across tables for combined analysis</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Cross-Table Correlations</h3>
          <Badge variant="default" className="text-[10px]">
            {dataSources.length} Tables Combined
          </Badge>
        </div>
        <button className="p-1 hover:bg-muted rounded transition-colors">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          {/* Cross-table correlation highlights */}
          {crossTableCorrelations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Analyzing relationships between variables across {dataSources.length} connected tables
              </p>
              
              {/* Top correlations as cards */}
              <div className="grid gap-2">
                {crossTableCorrelations
                  .filter((c) => Math.abs(c.correlation) >= 0.3)
                  .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                  .slice(0, 6)
                  .map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-2 rounded-lg text-xs flex items-center justify-between",
                        c.correlation > 0 ? "bg-purple-50 dark:bg-purple-950/30" : "bg-orange-50 dark:bg-orange-950/30"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {c.correlation > 0 ? (
                          <TrendingUp className="h-3 w-3 text-purple-500 shrink-0" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-orange-500 shrink-0" />
                        )}
                        <span className="truncate font-mono">{c.column1}</span>
                        <span className="text-muted-foreground">↔</span>
                        <span className="truncate font-mono">{c.column2}</span>
                      </div>
                      <Badge
                        variant={Math.abs(c.correlation) >= 0.7 ? "default" : "secondary"}
                        className="text-[10px] ml-2 shrink-0"
                      >
                        {(c.correlation * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Cross-table Insights */}
          {crossInsights.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium">Cross-Table Insights</span>
              </div>
              <div className="space-y-2 pl-1">
                {crossInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5">{insight.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{insight.text}</p>
                      {insight.subtext && (
                        <p className="text-[10px] text-muted-foreground">{insight.subtext}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation for executives */}
          <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
            <p className="font-medium">💡 What This Analysis Shows:</p>
            <ul className="space-y-0.5 pl-2">
              <li>• We're finding hidden relationships between data from different tables</li>
              <li>• High % means the variables are strongly connected across your data</li>
              <li>• Use these insights to understand what drives your key metrics</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
