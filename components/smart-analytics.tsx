"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Link2,
  BarChart3,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  LineChart,
  Calculator,
  Play,
  RefreshCw,
  Zap,
  Info,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardStore } from "@/lib/store";
import {
  generateInsights,
  generateForecast,
  runWhatIfScenario,
  type Insight,
  type Forecast,
  type WhatIfScenario,
} from "@/lib/analytics-engine";
import { cn } from "@/lib/utils";

// Insight Card Component
function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const iconMap = {
    anomaly: <AlertTriangle className="h-4 w-4" />,
    trend: insight.changePercent && insight.changePercent > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
    correlation: <Link2 className="h-4 w-4" />,
    pattern: <BarChart3 className="h-4 w-4" />,
    summary: <Info className="h-4 w-4" />,
    recommendation: <Lightbulb className="h-4 w-4" />,
  };

  const colorMap = {
    info: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400",
    warning: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
    critical: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400",
    success: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400",
  };

  const badgeVariantMap = {
    info: "secondary" as const,
    warning: "outline" as const,
    critical: "destructive" as const,
    success: "default" as const,
  };

  return (
    <Card className={cn("border transition-all", colorMap[insight.severity])}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{iconMap[insight.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{insight.title}</h4>
              <Badge variant={badgeVariantMap[insight.severity]} className="text-xs shrink-0">
                {Math.round(insight.confidence * 100)}% conf
              </Badge>
            </div>
            <p className="text-xs opacity-80">{insight.description}</p>
            {insight.relatedFields && insight.relatedFields.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {insight.relatedFields.map((field) => (
                  <Badge key={field} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Forecast Chart Component
function ForecastChart({ forecast, metricName }: { forecast: Forecast; metricName: string }) {
  const allData = [...forecast.historical, ...forecast.predicted];
  const maxValue = Math.max(...allData.map((d) => d.value), ...forecast.confidence.upper.map((d) => d.value));
  
  const formatValue = (v: number) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Historical</span>
        <span>Forecast ({forecast.predicted.length} periods)</span>
      </div>
      
      {/* Simple bar visualization */}
      <div className="flex items-end gap-1 h-32">
        {forecast.historical.map((point, i) => (
          <div key={`h-${i}`} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-primary rounded-t transition-all"
              style={{ height: `${(point.value / maxValue) * 100}%` }}
            />
            <span className="text-[9px] text-muted-foreground truncate max-w-full">
              {typeof point.date === 'string' ? point.date.slice(5, 10) : ''}
            </span>
          </div>
        ))}
        <div className="w-px h-full bg-border mx-1" />
        {forecast.predicted.map((point, i) => (
          <div key={`p-${i}`} className="flex-1 flex flex-col items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full relative">
                    {/* Confidence interval */}
                    <div
                      className="absolute w-full bg-primary/20 rounded-t"
                      style={{ 
                        height: `${((forecast.confidence.upper[i]?.value || point.value) / maxValue) * 100}%`,
                        bottom: `${((forecast.confidence.lower[i]?.value || 0) / maxValue) * 100}%`,
                      }}
                    />
                    {/* Predicted value */}
                    <div
                      className="w-full bg-primary/60 rounded-t border-2 border-dashed border-primary"
                      style={{ height: `${(point.value / maxValue) * 100}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Predicted: {formatValue(point.value)}
                    <br />
                    Range: {formatValue(forecast.confidence.lower[i]?.value || 0)} - {formatValue(forecast.confidence.upper[i]?.value || 0)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-[9px] text-muted-foreground truncate max-w-full">
              {typeof point.date === 'string' ? point.date.slice(5, 10) : ''}
            </span>
          </div>
        ))}
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Trend</p>
          <p className={cn(
            "text-sm font-medium",
            forecast.metrics.trend === "increasing" ? "text-green-600" :
            forecast.metrics.trend === "decreasing" ? "text-red-600" : "text-muted-foreground"
          )}>
            {forecast.metrics.trend === "increasing" ? "📈" : forecast.metrics.trend === "decreasing" ? "📉" : "➡️"} {forecast.metrics.trend}
          </p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Growth Rate</p>
          <p className="text-sm font-medium">
            {forecast.metrics.growthRate > 0 ? "+" : ""}{forecast.metrics.growthRate.toFixed(1)}%/period
          </p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Model Fit</p>
          <p className="text-sm font-medium">
            {(forecast.metrics.accuracy * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// What-If Scenario Component
function WhatIfPanel({
  data,
  schema,
}: {
  data: Record<string, unknown>[];
  schema: { columns: Array<{ name: string; type: string; isMetric?: boolean }> };
}) {
  const [targetField, setTargetField] = useState<string>("");
  const [changePercent, setChangePercent] = useState<number>(10);
  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);

  const numericFields = useMemo(() => {
    return schema?.columns
      ?.filter((col) => col.type === "number" || col.isMetric)
      ?.map((col) => col.name) || [];
  }, [schema]);

  useEffect(() => {
    if (numericFields.length > 0 && !targetField) {
      setTargetField(numericFields[0]);
    }
  }, [numericFields, targetField]);

  const runScenario = () => {
    if (!targetField || !data || data.length === 0) return;

    // Find other numeric fields to show impact
    const impactedFields = numericFields
      .filter((f) => f !== targetField)
      .slice(0, 3)
      .map((field) => ({
        field,
        elasticity: 0.5 + Math.random() * 0.5, // Simulated elasticity
      }));

    const result = runWhatIfScenario(data, targetField, changePercent, impactedFields);
    setScenario(result);
  };

  const formatNumber = (v: number) => {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">What if...</Label>
          <Select value={targetField} onValueChange={setTargetField}>
            <SelectTrigger>
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {numericFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Changed by</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={changePercent}
              onChange={(e) => setChangePercent(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Adjustment: {changePercent > 0 ? "+" : ""}{changePercent}%</Label>
        <Slider
          value={[changePercent]}
          onValueChange={([v]) => setChangePercent(v)}
          min={-50}
          max={50}
          step={1}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-50%</span>
          <span>0%</span>
          <span>+50%</span>
        </div>
      </div>

      <Button onClick={runScenario} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Run Scenario
      </Button>

      {scenario && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Scenario Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Primary impact */}
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{targetField}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatNumber(scenario.baselineValue)}</span>
                <ArrowRight className="h-4 w-4" />
                <span className={cn(
                  "text-sm font-medium",
                  scenario.percentChange > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatNumber(scenario.modifiedValue)}
                </span>
              </div>
            </div>

            {/* Impacted metrics */}
            {scenario.impactedMetrics.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Projected Impact on Related Metrics:</p>
                {scenario.impactedMetrics.map((impact) => (
                  <div key={impact.metric} className="flex items-center justify-between text-sm">
                    <span>{impact.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        impact.changePercent > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {impact.changePercent > 0 ? "+" : ""}{impact.changePercent.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({formatNumber(impact.baseline)} → {formatNumber(impact.projected)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main Smart Analytics Panel
export function SmartAnalyticsPanel() {
  const { rawData, schema } = useDashboardStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("insights");

  // Forecasting state
  const [forecastField, setForecastField] = useState<string>("");
  const [forecastDateField, setForecastDateField] = useState<string>("");
  const [forecast, setForecast] = useState<Forecast | null>(null);

  const numericFields = useMemo(() => {
    return schema?.columns
      ?.filter((col) => col.type === "numeric" || col.isMetric)
      ?.map((col) => col.name) || [];
  }, [schema]);

  const dateFields = useMemo(() => {
    return schema?.columns
      ?.filter((col) => col.type === "datetime" || col.name.toLowerCase().includes("date"))
      ?.map((col) => col.name) || [];
  }, [schema]);

  // Auto-detect fields for forecasting
  useEffect(() => {
    if (numericFields.length > 0 && !forecastField) {
      setForecastField(numericFields[0]);
    }
    if (dateFields.length > 0 && !forecastDateField) {
      setForecastDateField(dateFields[0]);
    }
  }, [numericFields, dateFields, forecastField, forecastDateField]);

  const generateAllInsights = () => {
    if (!rawData || !schema) return;

    setIsLoading(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const newInsights = generateInsights(rawData, schema);
      setInsights(newInsights);
      setDismissedInsights(new Set());
      setIsLoading(false);
    }, 100);
  };

  // Generate insights on mount
  useEffect(() => {
    if (rawData && schema && insights.length === 0) {
      generateAllInsights();
    }
  }, [rawData, schema]);

  const runForecast = () => {
    if (!rawData || !forecastField || !forecastDateField) return;

    setIsLoading(true);
    setTimeout(() => {
      const result = generateForecast(rawData, forecastDateField, forecastField, 6);
      setForecast(result);
      setIsLoading(false);
    }, 100);
  };

  const visibleInsights = insights.filter((i) => !dismissedInsights.has(i.id));

  if (!rawData || rawData.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Upload data to see AI insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Analytics
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateAllInsights}
            disabled={isLoading}
            className="gap-1"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col px-4">
        <TabsList className="grid grid-cols-3 mb-3">
          <TabsTrigger value="insights" className="text-xs gap-1">
            <Lightbulb className="h-3 w-3" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs gap-1">
            <LineChart className="h-3 w-3" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="whatif" className="text-xs gap-1">
            <Calculator className="h-3 w-3" />
            What-If
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : visibleInsights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No insights to show</p>
                <Button variant="link" size="sm" onClick={generateAllInsights}>
                  Regenerate
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {visibleInsights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onDismiss={() => setDismissedInsights((prev) => new Set([...prev, insight.id]))}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="forecast" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4 pb-4">
              {/* Field selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Date Field</Label>
                  <Select value={forecastDateField} onValueChange={setForecastDateField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Metric to Forecast</Label>
                  <Select value={forecastField} onValueChange={setForecastField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={runForecast}
                disabled={!forecastField || !forecastDateField || isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Generate Forecast
              </Button>

              {forecast && forecast.predicted.length > 0 && (
                <ForecastChart forecast={forecast} metricName={forecastField} />
              )}

              {forecast && forecast.predicted.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>Not enough historical data to generate forecast.</p>
                  <p className="text-xs mt-1">Need at least 3 data points.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="whatif" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <WhatIfPanel data={rawData || []} schema={schema || { columns: [] }} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// Smart Analytics Dialog (for use in header/toolbar)
export function SmartAnalyticsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Insights
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Analytics
          </DialogTitle>
          <DialogDescription>
            AI-powered insights, forecasting, and what-if scenario analysis
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden -mx-6 px-6">
          <SmartAnalyticsPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
