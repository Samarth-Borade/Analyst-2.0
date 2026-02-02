"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Sun, Download, Home, FileSpreadsheet, Plus, Database, Zap, Loader2, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboardStore } from "@/lib/store";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";
import { UserButton } from "@/components/auth-modal";
import { getActiveSyncs } from "@/lib/firebase-sync";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "@/components/share-dialog";
import { AuditLogViewer } from "@/components/audit-log";
import { CollaboratorAvatars } from "@/components/collaboration";
import { SmartAnalyticsDialog } from "@/components/smart-analytics";
import { ThemeToggle, AccessibilitySettingsDialog } from "@/components/accessibility";
import { VersionHistoryDialog, SaveVersionDialog } from "@/components/version-history";

interface DashboardHeaderProps {
  onReset: () => void;
}

export function DashboardHeader({ onReset }: DashboardHeaderProps) {
  const { theme, toggleTheme, fileName, setCurrentView, pages, currentPageId, setCurrentPage, currentProjectId, setPages, syncProjectToBackend, isAuthenticated } = useDashboardStore();
  const [showAddData, setShowAddData] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync dashboard before saving version - returns the new dashboard ID
  const handleSyncAndRefresh = async (): Promise<string | undefined> => {
    if (!currentProjectId || !isAuthenticated) return undefined;
    setIsSyncing(true);
    try {
      const newId = await syncProjectToBackend(currentProjectId);
      setVersionRefreshKey((k) => k + 1);
      return newId;
    } catch (error) {
      console.error("Failed to sync dashboard:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Check for active Firebase syncs
  useEffect(() => {
    const checkSync = () => {
      const syncs = getActiveSyncs();
      setIsLiveSyncing(syncs.size > 0);
    };
    
    checkSync();
    const interval = setInterval(checkSync, 1000);
    return () => clearInterval(interval);
  }, []);

  // Export dashboard as PDF with all pages
  const exportToPDF = useCallback(async () => {
    if (pages.length === 0) {
      alert("No pages to export");
      return;
    }

    setIsExporting(true);

    try {
      // Dynamic import to avoid SSR issues
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      // Find the dashboard canvas element for current page first
      const canvasElement = document.querySelector('.dashboard-canvas-content') as HTMLElement;
      
      if (!canvasElement) {
        alert("Could not find dashboard content to export. Make sure you're on the dashboard view.");
        setIsExporting(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const titleHeight = 15;
      const contentHeight = pageHeight - (margin * 2) - titleHeight;

      // Store original page
      const originalPageId = currentPageId;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Switch to this page and wait for render
        setCurrentPage(page.id);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Re-query the canvas element after page switch
        const currentCanvasElement = document.querySelector('.dashboard-canvas-content') as HTMLElement;
        
        if (!currentCanvasElement) {
          console.warn(`Could not find canvas for page: ${page.name}`);
          continue;
        }

        // Add new page if not first
        if (i > 0) {
          pdf.addPage();
        }

        // Add page title with styling
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 30, 30);
        
        // Page title
        const pageTitle = page.name || `Page ${i + 1}`;
        pdf.text(pageTitle, pageWidth / 2, margin + 8, { align: "center" });
        
        // Add a subtle line under the title
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + titleHeight - 2, pageWidth - margin, margin + titleHeight - 2);

        // Page number
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i + 1} of ${pages.length}`, pageWidth - margin, pageHeight - 5, { align: "right" });

        // Capture using html-to-image (better CSS support)
        const dataUrl = await toPng(currentCanvasElement, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
          skipFonts: true,
          filter: (node) => {
            // Skip problematic elements if needed
            return true;
          },
        });

        // Create an image to get dimensions
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = dataUrl;
        });

        // Calculate image dimensions to fit the page
        const imgWidth = img.width;
        const imgHeight = img.height;
        const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;

        // Center the image
        const xOffset = margin + (contentWidth - finalWidth) / 2;
        const yOffset = margin + titleHeight + (contentHeight - finalHeight) / 2;

        // Add the image to PDF
        pdf.addImage(dataUrl, "PNG", xOffset, yOffset, finalWidth, finalHeight);
      }

      // Restore original page
      if (originalPageId) {
        setCurrentPage(originalPageId);
      }

      // Generate filename
      const dashboardName = fileName?.replace(/\.[^/.]+$/, "") || "dashboard";
      const timestamp = new Date().toISOString().split("T")[0];
      pdf.save(`${dashboardName}_${timestamp}.pdf`);

    } catch (error) {
      console.error("Error exporting PDF:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to export PDF: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  }, [pages, currentPageId, setCurrentPage, fileName, theme]);

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
          {isLiveSyncing && (
            <Badge variant="outline" className="gap-1.5 text-green-600 border-green-600/50 bg-green-500/10">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <Zap className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborators */}
          <CollaboratorAvatars />
          
          {/* Smart Analytics */}
          <SmartAnalyticsDialog />
          
          {/* Share Button */}
          <ShareDialog dashboardTitle={fileName || "Dashboard"} />
          
          {/* Activity Log */}
          <AuditLogViewer />
          
          {/* Version History */}
          {currentProjectId && isAuthenticated && (
            <>
              <SaveVersionDialog
                dashboardId={currentProjectId}
                onSaved={() => setVersionRefreshKey((k) => k + 1)}
                onBeforeSave={handleSyncAndRefresh}
              />
              <VersionHistoryDialog
                key={versionRefreshKey}
                dashboardId={currentProjectId}
                onRestore={(configuration) => {
                  // Restore pages from the version configuration
                  const config = configuration as { pages?: unknown[] };
                  if (config?.pages) {
                    setPages(config.pages as any);
                  }
                }}
              />
            </>
          )}
          
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
          
          <ThemeToggle className="h-9 w-9" />
          
          <AccessibilitySettingsDialog />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={exportToPDF}
            disabled={isExporting}
            className="h-9 w-9"
            title="Download dashboard as PDF"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-9 w-9"
          >
            <Home className="h-4 w-4" />
          </Button>
          {/* User Profile / Login Button */}
          <UserButton />
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
