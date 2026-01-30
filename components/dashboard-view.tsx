"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardCanvas } from "@/components/dashboard-canvas";
import { DashboardHeader } from "@/components/dashboard-header";
import { PromptBar } from "@/components/prompt-bar";
import { DataView } from "@/components/data-view";
import { DataModelingView } from "@/components/data-modeling-view";
import { useDashboardStore } from "@/lib/store";
import { startFirebaseSync, isFirebaseSyncing } from "@/lib/firebase-sync";
import { AlertTriangle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DashboardViewProps {
  onReset: () => void;
}

export function DashboardView({ onReset }: DashboardViewProps) {
  const { currentView, rawData, dataSources, pages } = useDashboardStore();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-start Firebase sync for Firebase data sources when dashboard loads
  useEffect(() => {
    dataSources.forEach((ds) => {
      // Check if it's a Firebase data source (either has config or name contains Firebase)
      const isFirebaseSource = ds.firebaseConfig || ds.name.includes('(Firebase)');
      
      if (isFirebaseSource && !isFirebaseSyncing(ds.id)) {
        // If we have firebase config, use it
        if (ds.firebaseConfig) {
          console.log('🔄 Auto-starting Firebase sync for:', ds.name);
          startFirebaseSync(
            ds.id,
            ds.firebaseConfig.connectionId,
            ds.firebaseConfig.path,
            ds.firebaseConfig.databaseType
          );
        } else {
          // Try to extract path from name (e.g., "sales/liveOrders (Firebase)" -> "sales/liveOrders")
          const pathMatch = ds.name.match(/^(.+)\s*\(Firebase\)$/);
          if (pathMatch) {
            const path = pathMatch[1].trim();
            // Get the first available Firebase connection
            const { getConnections } = require('@/lib/firebase-connector');
            const connections = getConnections();
            if (connections.length > 0) {
              console.log('🔄 Auto-starting Firebase sync (inferred) for:', ds.name, 'path:', path);
              startFirebaseSync(
                ds.id,
                connections[0].id,
                path,
                connections[0].databaseType || 'realtime'
              );
            } else {
              console.warn('⚠️ No Firebase connections available to start sync for:', ds.name);
            }
          }
        }
      }
    });
  }, [dataSources]);

  // Check if we have pages/charts but no data to display
  const hasCharts = pages.some(p => p.charts && p.charts.length > 0);
  const hasData = (rawData && rawData.length > 0) || dataSources.some(ds => ds.data && ds.data.length > 0);
  const needsDataReupload = hasCharts && !hasData && !dismissed;

  const renderContent = () => {
    switch (currentView) {
      case "data":
        return <DataView />;
      case "data-modeling":
        return <DataModelingView />;
      case "dashboard":
      default:
        return <DashboardCanvas />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader onReset={onReset} />
      
      {/* Data missing warning banner */}
      {needsDataReupload && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Your dashboard layout is restored, but you need to re-upload your data file to display charts.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowUploadDialog(true)}
              className="text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/20"
            >
              <Upload className="h-3 w-3 mr-1" />
              Re-upload Data
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {currentView !== "data-modeling" && <DashboardSidebar />}
        {renderContent()}
      </div>
      {currentView === "dashboard" && <PromptBar />}
      
      {/* Re-upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Re-upload Your Data
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Upload the same data file you used before to restore your charts. Your dashboard layout has been preserved.
          </p>
          <EnhancedFileUpload
            onAnalysisComplete={() => setShowUploadDialog(false)}
            mode="add-more"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
