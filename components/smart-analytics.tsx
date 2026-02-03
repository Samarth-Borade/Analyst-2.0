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
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Calculator,
  Play,
  RefreshCw,
  Zap,
  Info,
  CheckCircle,
  X,
  Target,
  Brain,
  Rocket,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  Wand2,
  Clock,
  Percent,
  Activity,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Modern Insight Card Component
function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss?: () => void }) {
  const iconMap = {
    anomaly: AlertTriangle,
    trend: insight.changePercent && insight.changePercent > 0 ? TrendingUp : TrendingDown,
    correlation: Link2,
    pattern: Activity,
    summary: BarChart3,
    recommendation: Lightbulb,
  };

  const Icon = iconMap[insight.type];

  const styleMap = {
    info: {
      bg: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10",
      border: "border-blue-500/20",
      icon: "text-blue-500",
      badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    warning: {
      bg: "bg-gradient-to-br from-amber-500/10 to-orange-500/10",
      border: "border-amber-500/20",
      icon: "text-amber-500",
      badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    },
    critical: {
      bg: "bg-gradient-to-br from-red-500/10 to-pink-500/10",
      border: "border-red-500/20",
      icon: "text-red-500",
      badge: "bg-red-500/20 text-red-600 dark:text-red-400",
    },
    success: {
      bg: "bg-gradient-to-br from-emerald-500/10 to-green-500/10",
      border: "border-emerald-500/20",
      icon: "text-emerald-500",
      badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    },
  };

  const style = styleMap[insight.severity];

  return (
    <div className={cn(
      "group relative rounded-xl border p-4 transition-all hover:shadow-lg hover:scale-[1.01]",
      style.bg,
      style.border
    )}>
      <div className="flex gap-4">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
          "bg-white/80 dark:bg-gray-900/80 shadow-sm"
        )}>
          <Icon className={cn("h-5 w-5", style.icon)} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-tight">{insight.title}</h4>
            <Badge className={cn("shrink-0 text-[10px] font-medium border-0", style.badge)}>
              {Math.round(insight.confidence * 100)}% confidence
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
          {insight.relatedFields && insight.relatedFields.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {insight.relatedFields.map((field) => (
                <Badge key={field} variant="secondary" className="text-[10px] font-mono">
                  {field}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Modern Forecast Visualization
function ForecastVisualization({ forecast, metricName }: { forecast: Forecast; metricName: string }) {
  const allData = [...forecast.historical, ...forecast.predicted];
  const maxValue = Math.max(...allData.map((d) => d.value), ...forecast.confidence.upper.map((d) => d.value));
  
  const formatValue = (v: number) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };

  const trendColor = forecast.metrics.trend === "increasing" 
    ? "text-emerald-500" 
    : forecast.metrics.trend === "decreasing" 
    ? "text-red-500" 
    : "text-gray-500";

  const trendIcon = forecast.metrics.trend === "increasing" 
    ? ArrowUpRight 
    : forecast.metrics.trend === "decreasing" 
    ? ArrowDownRight 
    : ArrowRight;

  const TrendIcon = trendIcon;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <TrendIcon className={cn("h-4 w-4", trendColor)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Trend</p>
          <p className={cn("text-lg font-bold capitalize", trendColor)}>
            {forecast.metrics.trend}
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Percent className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Growth Rate</p>
          <p className="text-lg font-bold">
            <span className={forecast.metrics.growthRate > 0 ? "text-emerald-500" : forecast.metrics.growthRate < 0 ? "text-red-500" : ""}>
              {forecast.metrics.growthRate > 0 ? "+" : ""}{forecast.metrics.growthRate.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground font-normal">/period</span>
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Target className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
          <p className="text-lg font-bold text-emerald-500">
            {(forecast.metrics.accuracy * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-gradient-to-br from-gray-500/5 to-gray-500/10 border p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>Historical Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/40 border-2 border-dashed border-primary" />
            <span>Predicted ({forecast.predicted.length} periods)</span>
          </div>
        </div>
        
        <div className="flex items-end gap-1 h-40">
          {forecast.historical.map((point, i) => (
            <TooltipProvider key={`h-${i}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                    <div
                      className="w-full bg-primary rounded-t transition-all group-hover:bg-primary/80"
                      style={{ height: `${(point.value / maxValue) * 100}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground truncate max-w-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {typeof point.date === 'string' ? point.date.slice(5, 10) : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{formatValue(point.value)}</p>
                  <p className="text-xs text-muted-foreground">{String(point.date)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <div className="w-px h-full bg-dashed-border mx-2 relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-background px-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          {forecast.predicted.map((point, i) => (
            <TooltipProvider key={`p-${i}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                    <div className="w-full relative">
                      <div
                        className="absolute w-full bg-primary/10 rounded-t"
                        style={{ 
                          height: `${((forecast.confidence.upper[i]?.value || point.value) / maxValue) * 100}%`,
                        }}
                      />
                      <div
                        className="w-full bg-primary/40 rounded-t border-2 border-dashed border-primary relative z-10 transition-all group-hover:bg-primary/60"
                        style={{ height: `${(point.value / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate max-w-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {typeof point.date === 'string' ? point.date.slice(5, 10) : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">Predicted: {formatValue(point.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    Range: {formatValue(forecast.confidence.lower[i]?.value || 0)} - {formatValue(forecast.confidence.upper[i]?.value || 0)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
}

// Feature Tab Button Component
function FeatureTab({ 
  active, 
  onClick, 
  icon: Icon, 
  title, 
  description,
  color,
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ElementType; 
  title: string; 
  description: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    purple: {
      bg: "from-violet-500/20 to-purple-500/20",
      border: "border-violet-500/30",
      icon: "text-violet-500",
    },
    blue: {
      bg: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/30",
      icon: "text-blue-500",
    },
    orange: {
      bg: "from-orange-500/20 to-amber-500/20",
      border: "border-orange-500/30",
      icon: "text-orange-500",
    },
  };

  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 p-4 rounded-xl border-2 transition-all text-left",
        active 
          ? cn("bg-gradient-to-br", c.bg, c.border, "shadow-lg") 
          : "border-transparent hover:border-border bg-muted/30 hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          active ? cn("bg-white/80 dark:bg-gray-900/80", c.icon) : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className={cn("font-semibold text-sm", active && "text-foreground")}>{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
    </button>
  );
}

// Modern What-If Panel
function WhatIfPanel({
  data,
  schema,
  onApplyToPreview,
}: {
  data: Record<string, unknown>[];
  schema: { columns: Array<{ name: string; type: string; isMetric?: boolean }> };
  onApplyToPreview?: (field: string, changePercent: number) => void;
}) {
  const [targetField, setTargetField] = useState<string>("");
  const [changePercent, setChangePercent] = useState<number>(10);
  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const numericFields = useMemo(() => {
    return schema?.columns
      ?.filter((col) => col.type === "number" || col.type === "numeric" || col.isMetric)
      ?.map((col) => col.name) || [];
  }, [schema]);

  useEffect(() => {
    if (numericFields.length > 0 && !targetField) {
      setTargetField(numericFields[0]);
    }
  }, [numericFields, targetField]);

  const runScenario = () => {
    if (!targetField || !data || data.length === 0) return;

    setIsRunning(true);
    
    setTimeout(() => {
      const impactedFields = numericFields
        .filter((f) => f !== targetField)
        .slice(0, 3)
        .map((field) => ({
          field,
          elasticity: 0.5 + Math.random() * 0.5,
        }));

      const result = runWhatIfScenario(data, targetField, changePercent, impactedFields);
      setScenario(result);
      setIsRunning(false);
    }, 500);
  };

  const formatNumber = (v: number) => {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };

  // Dynamic example questions based on actual fields
  const exampleQuestions = useMemo(() => {
    const questions: { text: string; field: string; change: number }[] = [];
    if (numericFields.includes("Sales")) {
      questions.push({ text: "What if Sales increase by 20%?", field: "Sales", change: 20 });
    }
    if (numericFields.includes("Cost")) {
      questions.push({ text: "What if Cost decreases by 15%?", field: "Cost", change: -15 });
    }
    if (numericFields.includes("Quantity")) {
      questions.push({ text: "What if Quantity doubles?", field: "Quantity", change: 100 });
    }
    if (numericFields.includes("Price")) {
      questions.push({ text: "What if Price goes up 10%?", field: "Price", change: 10 });
    }
    if (numericFields.includes("Revenue")) {
      questions.push({ text: "What if Revenue drops 25%?", field: "Revenue", change: -25 });
    }
    // Add generic ones if we don't have enough
    if (questions.length < 3 && numericFields.length > 0) {
      const remaining = numericFields.filter(f => !questions.some(q => q.field === f));
      remaining.slice(0, 3 - questions.length).forEach(field => {
        questions.push({ text: `What if ${field} changes by 15%?`, field, change: 15 });
      });
    }
    return questions.slice(0, 3);
  }, [numericFields]);

  return (
    <div className="space-y-6">
      {/* Example Questions */}
      {exampleQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Try asking questions like:
          </div>
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setTargetField(q.field);
                  setChangePercent(q.change);
                }}
                className="px-3 py-2 text-xs rounded-full bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-all"
              >
                &ldquo;{q.text}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scenario Builder */}
      <div className="rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold">Scenario Builder</h3>
            <p className="text-xs text-muted-foreground">Simulate changes and see projected impacts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">What if this metric...</Label>
            <Select value={targetField} onValueChange={setTargetField}>
              <SelectTrigger className="bg-background/80">
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
            <Label className="text-xs font-medium">Changed by...</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={changePercent}
                onChange={(e) => setChangePercent(Number(e.target.value))}
                className="bg-background/80"
              />
              <span className="text-sm font-medium">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Adjustment: 
              <span className={cn(
                "ml-2 font-bold",
                changePercent > 0 ? "text-emerald-500" : changePercent < 0 ? "text-red-500" : ""
              )}>
                {changePercent > 0 ? "+" : ""}{changePercent}%
              </span>
            </Label>
          </div>
          <div className="relative">
            <Slider
              value={[changePercent]}
              onValueChange={([v]) => setChangePercent(v)}
              min={-50}
              max={50}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>-50%</span>
              <span className="absolute left-1/2 -translate-x-1/2">0%</span>
              <span>+50%</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={runScenario} 
          className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          disabled={isRunning || !targetField}
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          Run Simulation
        </Button>
      </div>

      {/* Results */}
      {scenario && (
        <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Simulation Results</h3>
              <p className="text-xs text-muted-foreground">Based on your scenario parameters</p>
            </div>
          </div>

          {/* Primary Impact */}
          <div className="rounded-lg bg-background/80 p-4">
            <p className="text-xs text-muted-foreground mb-2">Primary Change</p>
            <div className="flex items-center justify-between">
              <span className="font-medium">{targetField}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatNumber(scenario.baselineValue)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  "text-lg font-bold",
                  scenario.percentChange > 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {formatNumber(scenario.modifiedValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Ripple Effects */}
          {scenario.impactedMetrics.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-3 w-3" />
                Projected Ripple Effects
              </p>
              <div className="space-y-2">
                {scenario.impactedMetrics.map((impact) => (
                  <div 
                    key={impact.metric} 
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <span className="text-sm">{impact.metric}</span>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        "text-xs",
                        impact.changePercent > 0 
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                      )}>
                        {impact.changePercent > 0 ? "+" : ""}{impact.changePercent.toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatNumber(impact.baseline)} → {formatNumber(impact.projected)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview on Dashboard Button */}
          {onApplyToPreview && (
            <Button 
              onClick={() => onApplyToPreview(targetField, changePercent)}
              className="w-full gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              <Eye className="h-4 w-4" />
              Preview on Dashboard
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Main Smart Analytics Panel
export function SmartAnalyticsPanel({ onClose }: { onClose?: () => void }) {
  const { rawData, schema, applyWhatIfScenario, whatIfMode } = useDashboardStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("insights");

  // Forecasting state
  const [forecastField, setForecastField] = useState<string>("");
  const [forecastDateField, setForecastDateField] = useState<string>("");
  const [forecast, setForecast] = useState<Forecast | null>(null);

  // Handle applying What-If scenario to dashboard
  const handleApplyToPreview = (field: string, changePercent: number) => {
    applyWhatIfScenario(field, changePercent);
    onClose?.(); // Close the dialog
  };

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
    setTimeout(() => {
      const newInsights = generateInsights(rawData, schema);
      setInsights(newInsights);
      setDismissedInsights(new Set());
      setIsLoading(false);
    }, 100);
  };

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
    }, 300);
  };

  const visibleInsights = insights.filter((i) => !dismissedInsights.has(i.id));

  if (!rawData || rawData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
            <Brain className="h-8 w-8 text-violet-500" />
          </div>
          <h3 className="font-semibold text-lg">AI Analytics Ready</h3>
          <p className="text-sm text-muted-foreground">
            Upload your data to unlock AI-powered insights, forecasting, and scenario analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">AI Analytics</h2>
            <p className="text-xs text-muted-foreground">Powered by machine learning</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateAllInsights}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Feature Tabs */}
      <div className="flex gap-3">
        <FeatureTab
          active={activeTab === "insights"}
          onClick={() => setActiveTab("insights")}
          icon={Lightbulb}
          title="Insights"
          description="Auto-discovered patterns"
          color="purple"
        />
        <FeatureTab
          active={activeTab === "forecast"}
          onClick={() => setActiveTab("forecast")}
          icon={LineChart}
          title="Forecast"
          description="Predict future trends"
          color="blue"
        />
        <FeatureTab
          active={activeTab === "whatif"}
          onClick={() => setActiveTab("whatif")}
          icon={Calculator}
          title="What-If"
          description="Simulate scenarios"
          color="orange"
        />
      </div>

      {/* Content */}
      {activeTab === "insights" && (
        <div className="space-y-4 pb-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Analyzing your data...</p>
              </div>
            ) : visibleInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No new insights to show</p>
                </div>
                <Button variant="outline" size="sm" onClick={generateAllInsights}>
                  Regenerate Insights
                </Button>
              </div>
            ) : (
              visibleInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={() => setDismissedInsights((prev) => new Set([...prev, insight.id]))}
                />
              ))
            )}
        </div>
      )}

      {activeTab === "forecast" && (
          <div className="space-y-6 pb-8">
            {/* Intro */}
            <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Predictive Forecasting</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Select a date field and metric below. Our algorithm will analyze historical patterns 
                    to predict future values with confidence intervals.
                  </p>
                </div>
              </div>
            </div>

            {/* Field Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Time Field
                </Label>
                <Select value={forecastDateField} onValueChange={setForecastDateField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date column" />
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
                <Label className="text-xs font-medium flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  Metric to Forecast
                </Label>
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
              className="w-full gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              Generate Forecast
            </Button>

            {forecast && forecast.predicted.length > 0 && (
              <ForecastVisualization forecast={forecast} metricName={forecastField} />
            )}

            {forecast && forecast.predicted.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <p className="font-medium">Not Enough Data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Need at least 3 historical data points to generate a forecast.
                </p>
              </div>
            )}
        </div>
      )}

      {activeTab === "whatif" && (
        <div className="pb-8">
          <WhatIfPanel 
            data={rawData || []} 
            schema={schema || { columns: [] }} 
            onApplyToPreview={handleApplyToPreview}
          />
        </div>
      )}
    </div>
  );
}

// Smart Analytics Dialog
export function SmartAnalyticsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-500/5 to-purple-500/5 shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl">Smart Analytics</span>
              <p className="text-sm font-normal text-muted-foreground">
                AI-powered insights, forecasting & scenario analysis
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <SmartAnalyticsPanel onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
