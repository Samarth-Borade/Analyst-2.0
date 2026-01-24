"use client";

import { CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartTitleProps {
  title: string;
  position?: "top" | "bottom";
  className?: string;
  children?: React.ReactNode;
}

export function ChartTitleHeader({ title, position = "top", className, children }: ChartTitleProps) {
  if (position === "bottom") return null;
  
  return (
    <CardHeader className={cn("pb-2", className)}>
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {title}
        </CardTitle>
        {children}
      </div>
    </CardHeader>
  );
}

export function ChartTitleFooter({ title, position = "top", className }: ChartTitleProps) {
  if (position !== "bottom") return null;
  
  return (
    <CardFooter className={cn("pt-2 pb-3", className)}>
      <CardTitle className="text-sm font-medium text-card-foreground font-mono w-full text-center">
        {title}
      </CardTitle>
    </CardFooter>
  );
}
