"use client";

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Database,
  Link2,
  Upload,
  X,
  GripVertical,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore, DataSource, DataRelation } from "@/lib/store";
import { FileUpload } from "@/components/file-upload";
import { analyzeData } from "@/lib/data-utils";
import { cn } from "@/lib/utils";

interface TablePosition {
  id: string;
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  tableId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ConnectionState {
  isConnecting: boolean;
  sourceId: string | null;
  sourceColumn: string | null;
}

export function RelationsView() {
  const {
    dataSources,
    relations,
    addDataSource,
    removeDataSource,
    addRelation,
    removeRelation,
    setCurrentView,
  } = useDashboardStore();

  const [showUpload, setShowUpload] = useState(false);
  const [tablePositions, setTablePositions] = useState<TablePosition[]>([]);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    tableId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    sourceId: null,
    sourceColumn: null,
  });
  const [selectedRelation, setSelectedRelation] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize table positions when data sources change
  useEffect(() => {
    const existingIds = tablePositions.map((p) => p.id);
    const newPositions: TablePosition[] = [];

    dataSources.forEach((ds, index) => {
      if (!existingIds.includes(ds.id)) {
        newPositions.push({
          id: ds.id,
          x: 50 + (index % 3) * 320,
          y: 50 + Math.floor(index / 3) * 300,
        });
      }
    });

    if (newPositions.length > 0) {
      setTablePositions((prev) => [...prev, ...newPositions]);
    }

    // Remove positions for deleted data sources
    const currentIds = dataSources.map((ds) => ds.id);
    setTablePositions((prev) => prev.filter((p) => currentIds.includes(p.id)));
  }, [dataSources, tablePositions]);

  const handleFileUpload = async (
    data: Record<string, unknown>[],
    fileName: string
  ) => {
    const schema = analyzeData(data);
    addDataSource(fileName, data, schema);
    setShowUpload(false);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      if (connectionState.isConnecting) return;

      const rect = (e.target as HTMLElement)
        .closest(".table-card")
        ?.getBoundingClientRect();
      if (!rect) return;

      setDragState({
        isDragging: true,
        tableId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
    },
    [connectionState.isConnecting]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging || !dragState.tableId || !canvasRef.current)
        return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragState.offsetX;
      const newY = e.clientY - canvasRect.top - dragState.offsetY;

      setTablePositions((prev) =>
        prev.map((p) =>
          p.id === dragState.tableId
            ? { ...p, x: Math.max(0, newX), y: Math.max(0, newY) }
            : p
        )
      );
    },
    [dragState]
  );

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      tableId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);

  const startConnection = (sourceId: string, sourceColumn: string) => {
    setConnectionState({
      isConnecting: true,
      sourceId,
      sourceColumn,
    });
  };

  const endConnection = (targetId: string, targetColumn: string) => {
    if (
      connectionState.isConnecting &&
      connectionState.sourceId &&
      connectionState.sourceColumn &&
      connectionState.sourceId !== targetId
    ) {
      // Check if relation already exists
      const exists = relations.some(
        (r) =>
          (r.sourceId === connectionState.sourceId &&
            r.targetId === targetId &&
            r.sourceColumn === connectionState.sourceColumn &&
            r.targetColumn === targetColumn) ||
          (r.sourceId === targetId &&
            r.targetId === connectionState.sourceId &&
            r.sourceColumn === targetColumn &&
            r.targetColumn === connectionState.sourceColumn)
      );

      if (!exists) {
        addRelation({
          sourceId: connectionState.sourceId,
          targetId,
          sourceColumn: connectionState.sourceColumn,
          targetColumn,
        });
      }
    }
    cancelConnection();
  };

  const cancelConnection = () => {
    setConnectionState({
      isConnecting: false,
      sourceId: null,
      sourceColumn: null,
    });
  };

  const getTablePosition = (tableId: string): TablePosition => {
    return (
      tablePositions.find((p) => p.id === tableId) || { id: tableId, x: 0, y: 0 }
    );
  };

  const getColumnCenter = (
    tableId: string,
    columnName: string,
    isSource: boolean
  ): { x: number; y: number } => {
    const pos = getTablePosition(tableId);
    const ds = dataSources.find((d) => d.id === tableId);
    if (!ds) return { x: pos.x, y: pos.y };

    const columnIndex = ds.schema.columns.findIndex(
      (c) => c.name === columnName
    );
    const cardWidth = 280;
    const headerHeight = 48;
    const columnHeight = 32;

    return {
      x: pos.x + (isSource ? cardWidth : 0),
      y: pos.y + headerHeight + columnIndex * columnHeight + columnHeight / 2,
    };
  };

  const renderRelationLines = () => {
    return relations.map((relation) => {
      const start = getColumnCenter(
        relation.sourceId,
        relation.sourceColumn,
        true
      );
      const end = getColumnCenter(
        relation.targetId,
        relation.targetColumn,
        false
      );

      // Create a curved path
      const midX = (start.x + end.x) / 2;
      const controlOffset = Math.abs(end.x - start.x) * 0.5;

      const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;

      return (
        <g
          key={relation.id}
          className="cursor-pointer"
          onClick={() =>
            setSelectedRelation(
              selectedRelation === relation.id ? null : relation.id
            )
          }
        >
          <path
            d={path}
            fill="none"
            stroke={
              selectedRelation === relation.id
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground))"
            }
            strokeWidth={selectedRelation === relation.id ? 3 : 2}
            strokeDasharray={selectedRelation === relation.id ? "none" : "5,5"}
            className="transition-all"
          />
          {/* Connection dots */}
          <circle
            cx={start.x}
            cy={start.y}
            r={4}
            fill="hsl(var(--primary))"
          />
          <circle cx={end.x} cy={end.y} r={4} fill="hsl(var(--primary))" />
        </g>
      );
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Data Relations</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRelation && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                removeRelation(selectedRelation);
                setSelectedRelation(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Relation
            </Button>
          )}
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Data Source
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Data Sources List */}
        <div className="w-64 border-r border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Data Sources ({dataSources.length})
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {dataSources.map((ds) => (
                <Card
                  key={ds.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm truncate max-w-[140px]">
                          {ds.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDataSource(ds.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {ds.schema.columns.length} columns
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ds.schema.rowCount} rows
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {dataSources.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data sources</p>
                  <p className="text-xs">Add a CSV or Excel file</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Relations List */}
          <div className="border-t border-border">
            <div className="p-4 border-b border-border">
              <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Relations ({relations.length})
              </h2>
            </div>
            <ScrollArea className="h-48">
              <div className="p-2 space-y-2">
                {relations.map((rel) => {
                  const source = dataSources.find((d) => d.id === rel.sourceId);
                  const target = dataSources.find((d) => d.id === rel.targetId);
                  return (
                    <Card
                      key={rel.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedRelation === rel.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      )}
                      onClick={() =>
                        setSelectedRelation(
                          selectedRelation === rel.id ? null : rel.id
                        )
                      }
                    >
                      <CardContent className="p-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate max-w-[60px]">
                            {source?.name}
                          </span>
                          <span className="text-muted-foreground">.</span>
                          <span className="text-primary">{rel.sourceColumn}</span>
                        </div>
                        <div className="flex items-center justify-center my-1">
                          <Link2 className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate max-w-[60px]">
                            {target?.name}
                          </span>
                          <span className="text-muted-foreground">.</span>
                          <span className="text-primary">{rel.targetColumn}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {relations.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Link2 className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No relations</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-[radial-gradient(circle,hsl(var(--muted)/0.4)_1px,transparent_1px)] bg-[length:20px_20px]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => {
            if (connectionState.isConnecting) {
              cancelConnection();
            }
          }}
        >
          {/* SVG for relation lines */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ minWidth: "2000px", minHeight: "1500px" }}
          >
            <g className="pointer-events-auto">{renderRelationLines()}</g>
          </svg>

          {/* Table Cards */}
          {dataSources.map((ds) => {
            const pos = getTablePosition(ds.id);
            return (
              <Card
                key={ds.id}
                className={cn(
                  "table-card absolute w-[280px] shadow-lg",
                  dragState.tableId === ds.id && "opacity-80"
                )}
                style={{
                  left: pos.x,
                  top: pos.y,
                  zIndex: dragState.tableId === ds.id ? 100 : 1,
                }}
              >
                <CardHeader
                  className="p-3 cursor-move flex flex-row items-center gap-2 bg-primary/5 border-b"
                  onMouseDown={(e) => handleMouseDown(e, ds.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Table2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm flex-1 truncate">
                    {ds.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {ds.schema.columns.map((col) => (
                    <div
                      key={col.name}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-accent/50 cursor-pointer transition-colors",
                        connectionState.isConnecting &&
                          connectionState.sourceId === ds.id &&
                          connectionState.sourceColumn === col.name &&
                          "bg-primary/10"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connectionState.isConnecting) {
                          endConnection(ds.id, col.name);
                        } else {
                          startConnection(ds.id, col.name);
                        }
                      }}
                    >
                      <span className="text-sm truncate">{col.name}</span>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono shrink-0"
                      >
                        {col.type}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Connection mode indicator */}
          {connectionState.isConnecting && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
              <Link2 className="h-4 w-4" />
              <span className="text-sm">
                Click another column to create relation, or click canvas to
                cancel
              </span>
            </div>
          )}

          {/* Empty state */}
          {dataSources.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No Data Sources</h3>
                <p className="text-muted-foreground mb-4">
                  Add CSV or Excel files to start creating data relations
                </p>
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Data Source
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add Data Source</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUpload(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <FileUpload onUpload={handleFileUpload} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
