"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Hash,
  Calendar,
  Type,
  BarChart3,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/lib/store";

export function DashboardSidebar() {
  const {
    schema,
    pages,
    currentPageId,
    setCurrentPage,
    addPage,
    updatePage,
    deletePage,
    sidebarCollapsed,
    toggleSidebar,
  } = useDashboardStore();

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [truncatedPages, setTruncatedPages] = useState<Set<string>>(new Set());
  const pageNameRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Check which page names are truncated
  useEffect(() => {
    const checkTruncation = () => {
      const newTruncated = new Set<string>();
      pageNameRefs.current.forEach((el, pageId) => {
        if (el && el.scrollWidth > el.clientWidth) {
          newTruncated.add(pageId);
        }
      });
      setTruncatedPages(newTruncated);
    };
    
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [pages]);

  const handleAddPage = () => {
    const newPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      charts: [],
    };
    addPage(newPage);
  };

  const startEditingPage = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditName(currentName);
  };

  const savePageName = () => {
    if (editingPageId && editName.trim()) {
      updatePage(editingPageId, { name: editName.trim() });
    }
    setEditingPageId(null);
    setEditName("");
  };

  const cancelEdit = () => {
    setEditingPageId(null);
    setEditName("");
  };

  const getColumnIcon = (type: string) => {
    switch (type) {
      case "numeric":
        return <Hash className="h-3.5 w-3.5" />;
      case "datetime":
        return <Calendar className="h-3.5 w-3.5" />;
      case "categorical":
        return <BarChart3 className="h-3.5 w-3.5" />;
      default:
        return <Type className="h-3.5 w-3.5" />;
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-12 h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {pages.map((page) => (
          <Button
            key={page.id}
            variant={currentPageId === page.id ? "secondary" : "ghost"}
            size="icon"
            className="mb-1"
            onClick={() => setCurrentPage(page.id)}
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-sidebar-foreground font-mono">Dashboard</h2>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Pages Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
              Pages
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleAddPage}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {pages.map((page) => (
              <div
                key={page.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  currentPageId === page.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                )}
                onClick={() => setCurrentPage(page.id)}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {editingPageId === page.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-sm font-mono"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePageName();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        savePageName();
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {truncatedPages.has(page.id) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span 
                            ref={(el) => {
                              if (el) pageNameRefs.current.set(page.id, el);
                            }}
                            className="flex-1 truncate text-sm font-mono"
                          >
                            {page.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-mono">
                          {page.name}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span 
                        ref={(el) => {
                          if (el) pageNameRefs.current.set(page.id, el);
                        }}
                        className="flex-1 truncate text-sm font-mono"
                      >
                        {page.name}
                      </span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingPage(page.id, page.name);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {pages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePage(page.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fields Section */}
        {schema && (
          <div className="p-4 border-t border-sidebar-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 font-mono">
              Fields
            </h3>

            {/* Metrics */}
            <div className="mb-4">
              <h4 className="text-xs text-muted-foreground mb-2 font-mono">Metrics</h4>
              <div className="space-y-1">
                {schema.columns
                  .filter((c) => c.isMetric)
                  .map((column) => (
                    <div
                      key={column.name}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground rounded hover:bg-sidebar-accent/50 cursor-pointer font-mono"
                    >
                      {getColumnIcon(column.type)}
                      <span className="truncate">{column.name}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Dimensions */}
            <div className="pb-40">
              <h4 className="text-xs text-muted-foreground mb-2 font-mono">Dimensions</h4>
              <div className="space-y-1">
                {schema.columns
                  .filter((c) => c.isDimension)
                  .map((column) => (
                    <div
                      key={column.name}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground rounded hover:bg-sidebar-accent/50 cursor-pointer font-mono"
                    >
                      {getColumnIcon(column.type)}
                      <span className="truncate">{column.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
