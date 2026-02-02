"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVisualization, DEFAULT_DASHBOARD_STYLE } from "@/lib/visualization-context";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface StyledChartCardProps {
  children: React.ReactNode;
  className?: string;
}

export function StyledChartCard({ children, className }: StyledChartCardProps) {
  const visualization = useVisualization();
  const dashboardStyle = visualization?.dashboardStyle || DEFAULT_DASHBOARD_STYLE;

  const cardClasses = useMemo(() => {
    const { cardStyle, cornerRadius, showShadows } = dashboardStyle;

    const styleClasses = {
      flat: "bg-card border-0",
      elevated: "bg-card shadow-lg border-0",
      bordered: "bg-card border border-border",
      glass: "bg-card/80 backdrop-blur-sm border border-border/50",
    }[cardStyle];

    const radiusClasses = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-lg",
      lg: "rounded-xl",
      full: "rounded-2xl",
    }[cornerRadius];

    const shadowClasses = showShadows && cardStyle !== "elevated" ? "shadow-sm" : "";

    return cn(styleClasses, radiusClasses, shadowClasses);
  }, [dashboardStyle]);

  return (
    <Card className={cn("h-full", cardClasses, className)}>
      {children}
    </Card>
  );
}
