"use client";

import { useState } from "react";
import { 
  Layout, 
  Palette, 
  Check, 
  X, 
  Sparkles,
  Copy,
  Grid3X3,
  Type,
  Layers,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  useVisualization, 
  COLOR_PALETTES, 
  DASHBOARD_TEMPLATES,
  DEFAULT_DASHBOARD_STYLE,
  type DashboardTemplate,
  type DashboardStyle,
} from "@/lib/visualization-context";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  onSelectTemplate: (template: DashboardTemplate) => void;
}

export function TemplatePicker({ onSelectTemplate }: TemplatePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { templates } = useVisualization();

  const categories = ["all", "sales", "marketing", "finance", "operations", "general"];
  
  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="capitalize"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card 
            key={template.id}
            className="cursor-pointer hover:border-primary transition-colors group"
            onClick={() => onSelectTemplate(template)}
          >
            <CardContent className="p-4">
              <div className="text-4xl mb-3">{template.thumbnail}</div>
              <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs capitalize">
                  {template.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {template.pages.length} page{template.pages.length > 1 ? "s" : ""}
                </Badge>
              </div>
              
              {/* Color Preview */}
              <div className="flex gap-1 mt-3">
                {(template.style.colorPalette || COLOR_PALETTES.default).slice(0, 5).map((color, i) => (
                  <div 
                    key={i}
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StyleCustomizer() {
  const { 
    dashboardStyle, 
    updateDashboardStyle, 
    applyColorPalette, 
    resetToDefaultStyle 
  } = useVisualization();

  return (
    <div className="space-y-6">
      {/* Color Palette */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color Palette
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(COLOR_PALETTES) as Array<keyof typeof COLOR_PALETTES>).map(paletteName => (
            <button
              key={paletteName}
              onClick={() => applyColorPalette(paletteName)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border transition-all",
                dashboardStyle.colorPalette === COLOR_PALETTES[paletteName]
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex gap-0.5">
                {COLOR_PALETTES[paletteName].slice(0, 5).map((color, i) => (
                  <div 
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs capitalize">{paletteName}</span>
              {dashboardStyle.colorPalette === COLOR_PALETTES[paletteName] && (
                <Check className="h-3 w-3 ml-auto text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Card Style */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Card Style
        </Label>
        <Select 
          value={dashboardStyle.cardStyle} 
          onValueChange={(v) => updateDashboardStyle({ cardStyle: v as DashboardStyle["cardStyle"] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="elevated">Elevated</SelectItem>
            <SelectItem value="bordered">Bordered</SelectItem>
            <SelectItem value="glass">Glass</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Corner Radius */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" />
          Corner Radius
        </Label>
        <div className="flex gap-2">
          {(["none", "sm", "md", "lg", "full"] as const).map(radius => (
            <button
              key={radius}
              onClick={() => updateDashboardStyle({ cornerRadius: radius })}
              className={cn(
                "flex-1 py-2 text-xs rounded border transition-all capitalize",
                dashboardStyle.cornerRadius === radius
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              {radius}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Gap */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Grid Spacing</Label>
        <div className="flex gap-2">
          {(["compact", "normal", "spacious"] as const).map(gap => (
            <button
              key={gap}
              onClick={() => updateDashboardStyle({ gridGap: gap })}
              className={cn(
                "flex-1 py-2 text-xs rounded border transition-all capitalize",
                dashboardStyle.gridGap === gap
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              {gap}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          Font Style
        </Label>
        <Select 
          value={dashboardStyle.fontFamily} 
          onValueChange={(v) => updateDashboardStyle({ fontFamily: v as DashboardStyle["fontFamily"] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="mono">Monospace</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="rounded">Rounded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Effects */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Effects</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="shadows"
              checked={dashboardStyle.showShadows}
              onCheckedChange={(checked) => updateDashboardStyle({ showShadows: !!checked })}
            />
            <Label htmlFor="shadows" className="text-sm">Show shadows</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="gradients"
              checked={dashboardStyle.useGradients}
              onCheckedChange={(checked) => updateDashboardStyle({ useGradients: !!checked })}
            />
            <Label htmlFor="gradients" className="text-sm">Use gradients</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="animations"
              checked={dashboardStyle.animationsEnabled}
              onCheckedChange={(checked) => updateDashboardStyle({ animationsEnabled: !!checked })}
            />
            <Label htmlFor="animations" className="text-sm">Enable animations</Label>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <Button variant="outline" className="w-full" onClick={resetToDefaultStyle}>
        Reset to Default
      </Button>
    </div>
  );
}

export function DashboardStyleDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const [confirmTemplate, setConfirmTemplate] = useState<DashboardTemplate | null>(null);
  const { selectTemplate, dashboardStyle } = useVisualization();
  const { pages, setPages, rawData } = useDashboardStore();

  const hasExistingCharts = pages.length > 0 && pages.some(p => p.charts.length > 0);

  const applyTemplateStyle = (template: DashboardTemplate) => {
    // Only apply the style, keep existing charts
    selectTemplate(template);
    setConfirmTemplate(null);
    setOpen(false);
  };

  const applyTemplateLayout = (template: DashboardTemplate) => {
    // Apply both style and layout - map template fields to actual data fields
    selectTemplate(template);
    
    // Get available fields from data
    const data = rawData || [];
    const dataFields = data.length > 0 ? Object.keys(data[0]) : [];
    const numericFields = dataFields.filter(field => 
      data.some((row: Record<string, unknown>) => typeof row[field] === 'number' || !isNaN(Number(row[field])))
    );
    const textFields = dataFields.filter(field => 
      data.some((row: Record<string, unknown>) => typeof row[field] === 'string' && isNaN(Number(row[field] as string)))
    );
    
    const newPages = template.pages.map((page, pageIndex) => ({
      id: `page-${Date.now()}-${pageIndex}`,
      name: page.name,
      charts: page.chartLayouts.map((layout, chartIndex) => {
        // Try to intelligently map suggested fields to actual data fields
        let xAxis = layout.suggestedDimension;
        let yAxis = layout.suggestedMetric;
        
        // If suggested fields don't exist, pick from available fields
        if (xAxis && !dataFields.includes(xAxis)) {
          xAxis = textFields[0] || dataFields[0];
        }
        if (yAxis && !dataFields.includes(yAxis)) {
          yAxis = numericFields[chartIndex % numericFields.length] || numericFields[0];
        }
        
        // Default fallbacks if no suggestions
        if (!xAxis && textFields.length > 0) xAxis = textFields[0];
        if (!yAxis && numericFields.length > 0) yAxis = numericFields[0];
        
        return {
          id: `chart-${Date.now()}-${pageIndex}-${chartIndex}`,
          type: layout.type as any,
          title: `${layout.type.charAt(0).toUpperCase() + layout.type.slice(1)} Chart`,
          width: layout.width,
          height: layout.height,
          x: 0,
          y: 0,
          xAxis,
          yAxis,
        };
      }),
      showTitle: true,
    }));

    if (newPages.length > 0) {
      setPages(newPages);
    }
    
    setConfirmTemplate(null);
    setOpen(false);
  };

  const handleSelectTemplate = (template: DashboardTemplate) => {
    if (hasExistingCharts) {
      // Show confirmation to choose style-only or full layout
      setConfirmTemplate(template);
    } else {
      // No existing charts, apply full template
      applyTemplateLayout(template);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Customize
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Dashboard Customization
            </DialogTitle>
            <DialogDescription>
              Choose a template or customize your dashboard style
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-2 w-64">
              <TabsTrigger value="templates" className="gap-2">
                <Layout className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-2">
                <Palette className="h-4 w-4" />
                Style
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="flex-1 overflow-auto mt-4">
              <TemplatePicker onSelectTemplate={handleSelectTemplate} />
            </TabsContent>
            
            <TabsContent value="style" className="flex-1 overflow-auto mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <StyleCustomizer />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog when user has existing charts */}
      <Dialog open={!!confirmTemplate} onOpenChange={(open) => !open && setConfirmTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              You have existing charts. How would you like to apply the "{confirmTemplate?.name}" template?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => confirmTemplate && applyTemplateStyle(confirmTemplate)}
            >
              <Palette className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Style Only</div>
                <div className="text-xs text-muted-foreground">Apply colors and styling, keep your current charts</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => confirmTemplate && applyTemplateLayout(confirmTemplate)}
            >
              <Layout className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Full Layout</div>
                <div className="text-xs text-muted-foreground">Replace charts with template layout using your data</div>
              </div>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => setConfirmTemplate(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Quick style prompts for AI
export const STYLE_PROMPT_SUGGESTIONS = [
  "Make the dashboard more colorful with a sunset theme",
  "Use a professional corporate blue color scheme",
  "Apply a dark minimal style with no shadows",
  "Make charts have rounded corners and glass effect",
  "Use a monochrome color palette",
  "Add gradients and larger spacing between cards",
  "Apply a pastel color scheme with soft shadows",
];
