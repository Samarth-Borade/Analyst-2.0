"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  GitBranch,
  GitCommit,
  RotateCcw,
  Save,
  Trash2,
  ChevronRight,
  Clock,
  User,
  AlertCircle,
  Check,
  Loader2,
  Eye,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { versionsApi, DashboardVersion } from "@/lib/api";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// ============ Version Item ============

interface VersionItemProps {
  version: DashboardVersion;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function VersionItem({
  version,
  isLatest,
  isSelected,
  onSelect,
  onPreview,
  onRestore,
  onDelete,
}: VersionItemProps) {
  const date = new Date(version.createdAt);
  const timeAgo = getTimeAgo(date);

  return (
    <div
      className={cn(
        "p-3 border rounded-lg cursor-pointer transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GitCommit className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">v{version.versionNumber}</span>
              {isLatest && (
                <Badge variant="secondary" className="text-xs py-0">
                  Latest
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {version.commitMessage || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview this version</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!isLatest && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore();
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restore this version</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete this version</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {version.createdByEmail}
        </span>
      </div>
    </div>
  );
}

// ============ Save Version Dialog ============

interface SaveVersionDialogProps {
  dashboardId: string;
  onSaved: () => void;
  onBeforeSave?: () => Promise<string | void>; // Can return new dashboard ID
}

export function SaveVersionDialog({ dashboardId: initialDashboardId, onSaved, onBeforeSave }: SaveVersionDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get current dashboard state from store
  const { projects, currentProjectId, fileName } = useDashboardStore();
  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleSave = async () => {
    if (!initialDashboardId) return;

    setIsSaving(true);
    setError(null);
    try {
      console.log("📝 SaveVersion: Initial dashboard ID:", initialDashboardId);
      
      // Get current configuration from store
      const configuration = currentProject ? {
        dataSources: currentProject.dataSources.map((ds) => ({
          id: ds.id,
          name: ds.name,
          schema: ds.schema,
        })),
        relations: currentProject.relations,
        pages: currentProject.pages,
      } : undefined;
      
      const title = currentProject?.name || fileName || "Untitled Dashboard";
      
      console.log("📝 SaveVersion: Saving with configuration:", configuration ? "yes" : "no");
      
      // Create version with configuration - this will auto-create dashboard if needed
      const result = await versionsApi.create(
        initialDashboardId, 
        message || undefined, 
        configuration,
        title
      );
      
      console.log("✅ SaveVersion: Version created successfully!", result);
      setMessage("");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      console.error("❌ Failed to save version:", err);
      const errorMessage = err?.message || "Unknown error";
      setError(`Failed to save version: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Save Version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Save Version
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="commit-message">Version Description (optional)</Label>
            <Input
              id="commit-message"
              placeholder="e.g., Added sales chart, Updated filters..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Describe what changed in this version to make it easier to find later.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setError(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Version History Panel ============

interface VersionHistoryPanelProps {
  dashboardId: string;
  onRestore?: (configuration: unknown) => void;
}

export function VersionHistoryPanel({
  dashboardId,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<DashboardVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!dashboardId) return;

    setLoading(true);
    try {
      const data = await versionsApi.list(dashboardId);
      setVersions(data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handlePreview = async (version: DashboardVersion) => {
    try {
      const fullVersion = await versionsApi.get(dashboardId, version.id);
      setPreviewVersion(fullVersion);
    } catch (error) {
      console.error("Failed to load version:", error);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Are you sure you want to restore this version? The current state will be saved first.")) {
      return;
    }

    setRestoring(true);
    try {
      const result = await versionsApi.restore(dashboardId, versionId, true);
      alert(result.message);
      loadVersions();
      if (onRestore) {
        onRestore(result.restoredConfiguration);
      }
    } catch (error) {
      console.error("Failed to restore version:", error);
      alert("Failed to restore version. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm("Are you sure you want to delete this version? This cannot be undone.")) {
      return;
    }

    try {
      await versionsApi.delete(dashboardId, versionId);
      loadVersions();
    } catch (error) {
      console.error("Failed to delete version:", error);
      alert("Failed to delete version. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No versions saved yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Save your first version to enable rollback
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {restoring && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Restoring version...</span>
        </div>
      )}

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {versions.map((version, index) => (
            <VersionItem
              key={version.id}
              version={version}
              isLatest={index === 0}
              isSelected={selectedVersion === version.id}
              onSelect={() => setSelectedVersion(version.id)}
              onPreview={() => handlePreview(version)}
              onRestore={() => handleRestore(version.id)}
              onDelete={() => handleDelete(version.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Preview Modal */}
      {previewVersion && (
        <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Version {previewVersion.versionNumber} Preview
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{previewVersion.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">
                    {new Date(previewVersion.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="font-medium">
                    {previewVersion.commitMessage || "No description"}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-muted-foreground mb-2 block">
                  Configuration Summary
                </Label>
                <div className="text-sm">
                  {(() => {
                    const config = previewVersion.configuration as any;
                    const pageCount = config?.pages?.length || 0;
                    const chartCount =
                      config?.pages?.reduce(
                        (sum: number, p: any) => sum + (p.charts?.length || 0),
                        0
                      ) || 0;
                    return (
                      <div className="flex gap-4">
                        <span>
                          <strong>{pageCount}</strong> page{pageCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          <strong>{chartCount}</strong> chart{chartCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewVersion(null)}>
                Close
              </Button>
              <Button onClick={() => handleRestore(previewVersion.id)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore This Version
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============ Version History Dialog ============

interface VersionHistoryDialogProps {
  dashboardId: string;
  onRestore?: (configuration: unknown) => void;
}

export function VersionHistoryDialog({
  dashboardId,
  onRestore,
}: VersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRestore = (configuration: unknown) => {
    setOpen(false);
    if (onRestore) {
      onRestore(configuration);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Version history">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            View and restore previous versions of your dashboard
          </p>
          <SaveVersionDialog
            dashboardId={dashboardId}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        </div>

        <VersionHistoryPanel
          key={refreshKey}
          dashboardId={dashboardId}
          onRestore={handleRestore}
        />
      </DialogContent>
    </Dialog>
  );
}

// ============ Auto-Version Hook ============

/**
 * Hook to automatically save versions on significant changes
 */
export function useAutoVersion(dashboardId: string | null, interval: number = 5 * 60 * 1000) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveVersion = useCallback(async (message?: string) => {
    if (!dashboardId) return;

    try {
      await versionsApi.create(dashboardId, message || "Auto-save");
      setLastSaved(new Date());
      console.log("Auto-saved version");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [dashboardId]);

  // Auto-save at interval
  useEffect(() => {
    if (!dashboardId || interval <= 0) return;

    const timer = setInterval(() => {
      saveVersion("Auto-save");
    }, interval);

    return () => clearInterval(timer);
  }, [dashboardId, interval, saveVersion]);

  return { saveVersion, lastSaved };
}

// ============ Helpers ============

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
