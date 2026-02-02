"use client";

import { useState, useEffect } from "react";
import {
  History,
  Eye,
  Pencil,
  Trash2,
  Share2,
  UserMinus,
  Plus,
  Filter,
  Download,
  ChevronDown,
  Clock,
  User,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "share" 
  | "unshare" 
  | "view"
  | "export"
  | "duplicate"
  | "permission_change";

export interface AuditLogEntry {
  id: string;
  dashboardId: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  details?: {
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    chartId?: string;
    chartTitle?: string;
    targetEmail?: string;
    permission?: string;
    description?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ACTION_CONFIG: Record<AuditAction, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
}> = {
  create: {
    label: "Created",
    icon: <Plus className="h-3.5 w-3.5" />,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  update: {
    label: "Updated",
    icon: <Pencil className="h-3.5 w-3.5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  delete: {
    label: "Deleted",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  share: {
    label: "Shared",
    icon: <Share2 className="h-3.5 w-3.5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  unshare: {
    label: "Removed Access",
    icon: <UserMinus className="h-3.5 w-3.5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  view: {
    label: "Viewed",
    icon: <Eye className="h-3.5 w-3.5" />,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
  export: {
    label: "Exported",
    icon: <Download className="h-3.5 w-3.5" />,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  duplicate: {
    label: "Duplicated",
    icon: <Plus className="h-3.5 w-3.5" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  permission_change: {
    label: "Permission Changed",
    icon: <Activity className="h-3.5 w-3.5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
};

interface AuditLogViewerProps {
  dashboardId?: string;
  trigger?: React.ReactNode;
}

export function AuditLogViewer({ dashboardId, trigger }: AuditLogViewerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<AuditAction | "all">("all");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Mock data for demo
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      // Simulate fetching audit logs
      setTimeout(() => {
        setLogs([
          {
            id: "1",
            dashboardId: dashboardId || "demo",
            userId: "user1",
            userEmail: "you@company.com",
            action: "update",
            details: {
              field: "chart",
              chartTitle: "Revenue by Month",
              description: "Changed chart type from bar to line",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
          },
          {
            id: "2",
            dashboardId: dashboardId || "demo",
            userId: "user2",
            userEmail: "colleague@company.com",
            action: "share",
            details: {
              targetEmail: "manager@company.com",
              permission: "edit",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
          },
          {
            id: "3",
            dashboardId: dashboardId || "demo",
            userId: "user3",
            userEmail: "manager@company.com",
            action: "view",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          },
          {
            id: "4",
            dashboardId: dashboardId || "demo",
            userId: "user1",
            userEmail: "you@company.com",
            action: "update",
            details: {
              field: "filter",
              description: "Added date filter: Last 30 days",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
          },
          {
            id: "5",
            dashboardId: dashboardId || "demo",
            userId: "user1",
            userEmail: "you@company.com",
            action: "create",
            details: {
              chartTitle: "Customer Segmentation",
              description: "Added new pie chart",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          },
          {
            id: "6",
            dashboardId: dashboardId || "demo",
            userId: "user2",
            userEmail: "colleague@company.com",
            action: "permission_change",
            details: {
              targetEmail: "viewer@external.com",
              oldValue: "view",
              newValue: "edit",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
          },
          {
            id: "7",
            dashboardId: dashboardId || "demo",
            userId: "user1",
            userEmail: "you@company.com",
            action: "export",
            details: {
              description: "Exported as PDF",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
          },
          {
            id: "8",
            dashboardId: dashboardId || "demo",
            userId: "user1",
            userEmail: "you@company.com",
            action: "create",
            details: {
              description: "Dashboard created",
            },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
          },
        ]);
        setIsLoading(false);
      }, 500);
    }
  }, [open, dashboardId]);

  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.action === filter);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getActionDescription = (log: AuditLogEntry): string => {
    const { action, details, userEmail } = log;
    
    switch (action) {
      case "create":
        if (details?.chartTitle) return `created chart "${details.chartTitle}"`;
        return "created the dashboard";
      case "update":
        if (details?.chartTitle) return `updated "${details.chartTitle}"`;
        if (details?.field) return `updated ${details.field}`;
        return "made changes";
      case "delete":
        if (details?.chartTitle) return `deleted chart "${details.chartTitle}"`;
        return "deleted item";
      case "share":
        return `shared with ${details?.targetEmail || "someone"}`;
      case "unshare":
        return `removed access for ${details?.targetEmail || "someone"}`;
      case "view":
        return "viewed the dashboard";
      case "export":
        return details?.description || "exported the dashboard";
      case "duplicate":
        return "duplicated the dashboard";
      case "permission_change":
        return `changed ${details?.targetEmail}'s permission from ${details?.oldValue} to ${details?.newValue}`;
      default:
        return action;
    }
  };

  const groupLogsByDate = (logs: AuditLogEntry[]) => {
    const groups: Record<string, AuditLogEntry[]> = {};
    
    logs.forEach(log => {
      const date = log.createdAt;
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      let key: string;
      if (days === 0) key = "Today";
      else if (days === 1) key = "Yesterday";
      else if (days < 7) key = "This Week";
      else if (days < 30) key = "This Month";
      else key = "Older";
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    
    return groups;
  };

  const groupedLogs = groupLogsByDate(filteredLogs);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </DialogTitle>
          <DialogDescription>
            Track all changes and activity on this dashboard
          </DialogDescription>
        </DialogHeader>

        {/* Filter */}
        <div className="flex items-center gap-2 py-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as AuditAction | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {filteredLogs.length} entries
          </Badge>
        </div>

        {/* Log List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {Object.entries(groupedLogs).map(([dateGroup, groupLogs]) => (
                <div key={dateGroup}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {dateGroup}
                  </h3>
                  <div className="space-y-2">
                    {groupLogs.map((log) => {
                      const config = ACTION_CONFIG[log.action];
                      const isExpanded = expandedLog === log.id;
                      
                      return (
                        <Collapsible 
                          key={log.id} 
                          open={isExpanded}
                          onOpenChange={(open) => setExpandedLog(open ? log.id : null)}
                        >
                          <div className={cn(
                            "rounded-lg border transition-colors",
                            isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
                          )}>
                            <CollapsibleTrigger className="w-full p-3 flex items-start gap-3 text-left">
                              <div className={cn(
                                "rounded-full p-1.5 mt-0.5",
                                config.bgColor,
                                config.color
                              )}>
                                {config.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate">
                                    {log.userEmail}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {getActionDescription(log)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(log.createdAt)}
                                  </span>
                                </div>
                              </div>
                              {log.details && (
                                <ChevronDown className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              )}
                            </CollapsibleTrigger>
                            
                            {log.details && (
                              <CollapsibleContent>
                                <div className="px-3 pb-3 ml-9 text-sm space-y-1">
                                  {log.details.description && (
                                    <p className="text-muted-foreground">
                                      {log.details.description}
                                    </p>
                                  )}
                                  {log.details.chartTitle && !log.details.description && (
                                    <p className="text-muted-foreground">
                                      Chart: {log.details.chartTitle}
                                    </p>
                                  )}
                                  {log.details.targetEmail && (
                                    <p className="text-muted-foreground">
                                      User: {log.details.targetEmail}
                                    </p>
                                  )}
                                  {log.details.permission && (
                                    <p className="text-muted-foreground">
                                      Permission: <Badge variant="outline" className="text-xs ml-1">{log.details.permission}</Badge>
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground/70">
                                    {log.createdAt.toLocaleString()}
                                  </p>
                                </div>
                              </CollapsibleContent>
                            )}
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Hook to log audit events (for use throughout the app)
export function useAuditLog() {
  const logEvent = async (
    dashboardId: string,
    action: AuditAction,
    details?: AuditLogEntry["details"]
  ) => {
    // In production, this would call the backend API
    console.log("[Audit Log]", { dashboardId, action, details, timestamp: new Date() });
    
    // Example API call:
    // await fetch('/api/audit-log', {
    //   method: 'POST',
    //   body: JSON.stringify({ dashboardId, action, details }),
    // });
  };

  return { logEvent };
}
