"use client";

import { Moon, Sun, Download, Home, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store";

interface DashboardHeaderProps {
  onReset: () => void;
}

export function DashboardHeader({ onReset }: DashboardHeaderProps) {
  const { theme, toggleTheme, fileName, aiMessage } = useDashboardStore();

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">AI</span>
          </div>
          <span className="font-semibold text-foreground font-mono">AI Analyst</span>
        </div>
        {fileName && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {aiMessage && (
        <div className="hidden md:block max-w-md text-sm text-muted-foreground truncate px-4 font-mono">
          {aiMessage}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          className="h-9 w-9"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
