"use client";

import { useState } from "react";
import { Moon, Sun, Download, Home, FileSpreadsheet, Plus, Database, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboardStore } from "@/lib/store";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";

interface DashboardHeaderProps {
  onReset: () => void;
}

export function DashboardHeader({ onReset }: DashboardHeaderProps) {
  const { theme, toggleTheme, fileName, setCurrentView } = useDashboardStore();
  const [showAddData, setShowAddData] = useState(false);

  return (
    <>
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

        <div className="flex items-center gap-2">
          {/* Add Data Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddData(true)}
            className="h-9 w-9"
            title="Add more data"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          {/* Data View Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView("data")}
            className="h-9 w-9"
            title="View data sources"
          >
            <Database className="h-4 w-4" />
          </Button>
          
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

      {/* Add Data Dialog */}
      <Dialog open={showAddData} onOpenChange={setShowAddData}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add More Data
            </DialogTitle>
          </DialogHeader>
          <EnhancedFileUpload
            onAnalysisComplete={() => setShowAddData(false)}
            mode="add-more"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
