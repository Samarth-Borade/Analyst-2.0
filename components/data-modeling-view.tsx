"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  GitBranch,
  Hash,
  Calendar,
  Type,
  BarChart3,
  FileSpreadsheet,
  ArrowRight,
  Key,
  Link2,
  Loader2,
  Lightbulb,
  GripVertical,
  Trash2,
  Info,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDashboardStore, DataRelation, ColumnType } from "@/lib/store";
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

const CARDINALITY_OPTIONS = [
  { value: "one-to-one", label: "1:1", description: "One to One" },
  { value: "one-to-many", label: "1:N", description: "One to Many" },
  { value: "many-to-one", label: "N:1", description: "Many to One" },
  { value: "many-to-many", label: "N:N", description: "Many to Many" },
] as const;

const COLUMN_TYPES: { value: ColumnType; label: string; icon: React.ReactNode }[] = [
  { value: "numeric", label: "Numeric", icon: <Hash className="h-3.5 w-3.5 text-blue-500" /> },
  { value: "categorical", label: "Categorical", icon: <BarChart3 className="h-3.5 w-3.5 text-purple-500" /> },
  { value: "datetime", label: "Date/Time", icon: <Calendar className="h-3.5 w-3.5 text-green-500" /> },
  { value: "text", label: "Text", icon: <Type className="h-3.5 w-3.5 text-gray-500" /> },
];

export function DataModelingView() {
  const { 
    dataSources, 
    relations, 
    addRelation, 
    removeRelation, 
    updateRelation,
    updateColumnType,
    setCurrentView 
  } = useDashboardStore();
  
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
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const [editingRelation, setEditingRelation] = useState<DataRelation | null>(null);
  const [showColumnTypeDialog, setShowColumnTypeDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<{ dsId: string; colName: string; currentType: ColumnType } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize table positions
  useEffect(() => {
    const existingIds = tablePositions.map((p) => p.id);
    const newPositions: TablePosition[] = [];

    dataSources.forEach((ds, index) => {
      if (!existingIds.includes(ds.id)) {
        const col = index % 3;
        const row = Math.floor(index / 3);
        newPositions.push({
          id: ds.id,
          x: 80 + col * 350,
          y: 80 + row * 320,
        });
      }
    });

    if (newPositions.length > 0) {
      setTablePositions((prev) => [...prev, ...newPositions]);
    }

    const currentIds = dataSources.map((ds) => ds.id);
    setTablePositions((prev) => prev.filter((p) => currentIds.includes(p.id)));
  }, [dataSources]);

  const getColumnIcon = (type: string) => {
    switch (type) {
      case "numeric":
        return <Hash className="h-3.5 w-3.5 text-blue-500" />;
      case "datetime":
        return <Calendar className="h-3.5 w-3.5 text-green-500" />;
      case "categorical":
        return <BarChart3 className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <Type className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  // Auto-detect relationships between tables
  const analyzeRelationships = useCallback(() => {
    if (dataSources.length < 2) return;
    
    setIsAnalyzing(true);
    
    const newRelations: Omit<DataRelation, "id">[] = [];
    
    for (let i = 0; i < dataSources.length; i++) {
      for (let j = i + 1; j < dataSources.length; j++) {
        const table1 = dataSources[i];
        const table2 = dataSources[j];
        
        table1.schema.columns.forEach((col1) => {
          table2.schema.columns.forEach((col2) => {
            const name1 = col1.name.toLowerCase().replace(/[_\s-]/g, "");
            const name2 = col2.name.toLowerCase().replace(/[_\s-]/g, "");
            
            const isMatch = name1 === name2 || 
              (name1.includes("id") && name2.includes("id") && name1.replace("id", "") === name2.replace("id", "")) ||
              name1.endsWith(name2) || name2.endsWith(name1);
            
            if (isMatch) {
              const exists = relations.some(
                (r) =>
                  (r.sourceId === table1.id && r.targetId === table2.id && r.sourceColumn === col1.name && r.targetColumn === col2.name) ||
                  (r.sourceId === table2.id && r.targetId === table1.id && r.sourceColumn === col2.name && r.targetColumn === col1.name)
              );
              
              if (!exists) {
                const isCol1Unique = col1.uniqueCount === table1.data.length;
                const isCol2Unique = col2.uniqueCount === table2.data.length;
                
                let cardinality: DataRelation["cardinality"] = "one-to-many";
                if (isCol1Unique && isCol2Unique) cardinality = "one-to-one";
                else if (!isCol1Unique && !isCol2Unique) cardinality = "many-to-many";
                else if (isCol1Unique) cardinality = "one-to-many";
                else cardinality = "many-to-one";
                
                newRelations.push({
                  sourceId: table1.id,
                  targetId: table2.id,
                  sourceColumn: col1.name,
                  targetColumn: col2.name,
                  cardinality,
                });
              }
            }
          });
        });
      }
    }
    
    newRelations.forEach((rel) => addRelation(rel));
    
    setTimeout(() => setIsAnalyzing(false), 500);
  }, [dataSources, relations, addRelation]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
    if (connectionState.isConnecting) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.column-row')) return;
    
    const rect = (e.target as HTMLElement).closest(".table-card")?.getBoundingClientRect();
    if (!rect) return;

    setDragState({
      isDragging: true,
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  }, [connectionState.isConnecting]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.tableId || !canvasRef.current) return;

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
  }, [dragState]);

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

  // Connection handlers
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
      setEditingRelation({
        id: "",
        sourceId: connectionState.sourceId,
        targetId,
        sourceColumn: connectionState.sourceColumn,
        targetColumn,
        cardinality: "one-to-many",
        isManualMatch: true,
      });
      setShowRelationDialog(true);
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

  const confirmRelation = () => {
    if (editingRelation) {
      if (editingRelation.id) {
        updateRelation(editingRelation.id, { cardinality: editingRelation.cardinality });
      } else {
        addRelation({
          sourceId: editingRelation.sourceId,
          targetId: editingRelation.targetId,
          sourceColumn: editingRelation.sourceColumn,
          targetColumn: editingRelation.targetColumn,
          cardinality: editingRelation.cardinality,
          isManualMatch: editingRelation.isManualMatch,
        });
      }
    }
    setShowRelationDialog(false);
    setEditingRelation(null);
  };

  const getTablePosition = (tableId: string): TablePosition => {
    return tablePositions.find((p) => p.id === tableId) || { id: tableId, x: 0, y: 0 };
  };

  const getColumnCenter = (tableId: string, columnName: string, isSource: boolean): { x: number; y: number } => {
    const pos = getTablePosition(tableId);
    const ds = dataSources.find((d) => d.id === tableId);
    if (!ds) return { x: pos.x, y: pos.y };

    const columnIndex = ds.schema.columns.findIndex((c) => c.name === columnName);
    const cardWidth = 300;
    const headerHeight = 44;
    const columnHeight = 36;

    return {
      x: pos.x + (isSource ? cardWidth : 0),
      y: pos.y + headerHeight + columnIndex * columnHeight + columnHeight / 2,
    };
  };

  // Render relationship lines with cardinality symbols (Power BI style)
  const renderRelationLines = () => {
    return relations.map((relation) => {
      const start = getColumnCenter(relation.sourceId, relation.sourceColumn, true);
      const end = getColumnCenter(relation.targetId, relation.targetColumn, false);
      
      const midX = (start.x + end.x) / 2;
      const controlOffset = Math.min(Math.abs(end.x - start.x) * 0.4, 80);
      
      const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;
      
      const isSelected = selectedRelation === relation.id;
      const cardinalityLabel = CARDINALITY_OPTIONS.find(c => c.value === relation.cardinality)?.label || "1:N";
      
      // Use CSS variable fallbacks for proper theming
      const primaryColor = "var(--svg-primary, #7c3aed)";
      const mutedColor = "var(--svg-muted, #6b7280)";
      const textColor = "var(--svg-text, #374151)";
      const cardBg = "var(--svg-card-bg, #ffffff)";
      const cardBorder = "var(--svg-card-border, #e5e7eb)";
      
      const lineColor = isSelected ? primaryColor : mutedColor;
      const symbolColor = isSelected ? primaryColor : textColor;
      
      return (
        <g
          key={relation.id}
          className="cursor-pointer"
          onClick={() => setSelectedRelation(isSelected ? null : relation.id)}
          onDoubleClick={() => {
            setEditingRelation(relation);
            setShowRelationDialog(true);
          }}
        >
          {/* Main line */}
          <path
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth={isSelected ? 3 : 2}
            className="transition-all"
          />
          
          {/* Source cardinality indicator (1 or N) */}
          <g transform={`translate(${start.x + 12}, ${start.y})`}>
            {relation.cardinality === "one-to-one" || relation.cardinality === "one-to-many" ? (
              <line x1="0" y1="-8" x2="0" y2="8" stroke={symbolColor} strokeWidth="2" />
            ) : (
              <>
                <line x1="-4" y1="-8" x2="4" y2="0" stroke={symbolColor} strokeWidth="2" />
                <line x1="-4" y1="8" x2="4" y2="0" stroke={symbolColor} strokeWidth="2" />
                <line x1="4" y1="0" x2="8" y2="0" stroke={symbolColor} strokeWidth="2" />
              </>
            )}
          </g>
          
          {/* Target cardinality indicator (1 or N) */}
          <g transform={`translate(${end.x - 12}, ${end.y})`}>
            {relation.cardinality === "one-to-one" || relation.cardinality === "many-to-one" ? (
              <line x1="0" y1="-8" x2="0" y2="8" stroke={symbolColor} strokeWidth="2" />
            ) : (
              <>
                <line x1="4" y1="-8" x2="-4" y2="0" stroke={symbolColor} strokeWidth="2" />
                <line x1="4" y1="8" x2="-4" y2="0" stroke={symbolColor} strokeWidth="2" />
                <line x1="-4" y1="0" x2="-8" y2="0" stroke={symbolColor} strokeWidth="2" />
              </>
            )}
          </g>
          
          {/* Connection dots */}
          <circle cx={start.x} cy={start.y} r={5} fill={primaryColor} />
          <circle cx={end.x} cy={end.y} r={5} fill={primaryColor} />
          
          {/* Cardinality label in middle */}
          <g transform={`translate(${midX}, ${(start.y + end.y) / 2})`}>
            <rect 
              x="-16" y="-10" width="32" height="20" rx="4" 
              fill={isSelected ? "#f3f0ff" : cardBg} 
              stroke={isSelected ? primaryColor : cardBorder} 
              strokeWidth="1.5" 
            />
            <text textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill={textColor}>
              {cardinalityLabel}
            </text>
          </g>
        </g>
      );
    });
  };

  if (dataSources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background w-full">
        <div className="text-center space-y-4">
          <GitBranch className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">No Data to Model</h2>
          <p className="text-muted-foreground max-w-md">
            Upload multiple data files to create relationships between tables
          </p>
          <Button onClick={() => setCurrentView("upload")}>Upload Data</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 flex flex-col bg-background w-full">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("dashboard")}>
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Data Model</h1>
              <Badge variant="secondary" className="ml-2">
                {dataSources.length} tables • {relations.length} relationships
              </Badge>
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
            <Button variant="outline" size="sm" onClick={() => setShowHelp(!showHelp)}>
              <Info className="h-4 w-4 mr-2" />
              {showHelp ? "Hide" : "Show"} Help
            </Button>
            <Button
              size="sm"
              onClick={analyzeRelationships}
              disabled={isAnalyzing || dataSources.length < 2}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Auto-Detect Relations
            </Button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="bg-primary/5 border-b border-primary/20 px-4 py-3 shrink-0">
            <div className="max-w-4xl mx-auto flex items-start gap-4">
              <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">How to use Data Modeling (Power BI style):</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• <strong>Drag tables</strong> to rearrange them on the canvas</li>
                  <li>• <strong>Click a column</strong> then click another column in a different table to create a relationship</li>
                  <li>• <strong>Click a line</strong> to select it, <strong>double-click</strong> to edit cardinality (1:1, 1:N, N:1, N:N)</li>
                  <li>• <strong>Right-click a column</strong> to change its data type</li>
                  <li>• Use <strong>Auto-Detect</strong> to find matching columns automatically (even with different names!)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Canvas - Full width and height */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto"
          style={{ 
            backgroundColor: 'var(--canvas-bg-color, #f9fafb)',
            backgroundImage: 'radial-gradient(circle, var(--canvas-dot-color, #d1d5db) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            minHeight: 'calc(100vh - 120px)',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              cancelConnection();
              setSelectedRelation(null);
            }
          }}
        >
          {/* SVG layer for relationship lines */}
          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%", minWidth: "3000px", minHeight: "2000px" }}
          >
            <g className="pointer-events-auto">
              {renderRelationLines()}
            </g>
          </svg>

          {/* Table cards */}
          {dataSources.map((ds) => {
            const pos = getTablePosition(ds.id);
            const isPrimaryKey = (colName: string) =>
              colName.toLowerCase().includes("id") ||
              colName.toLowerCase() === "key" ||
              colName.toLowerCase().endsWith("_id");

            return (
              <div
                key={ds.id}
                className={cn(
                  "table-card absolute bg-card border-2 rounded-lg shadow-lg overflow-hidden transition-shadow",
                  dragState.tableId === ds.id && "shadow-xl",
                  connectionState.isConnecting && connectionState.sourceId !== ds.id && "ring-2 ring-primary/50"
                )}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: 300,
                  cursor: dragState.isDragging && dragState.tableId === ds.id ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => handleMouseDown(e, ds.id)}
              >
                {/* Table Header */}
                <div className="bg-primary text-primary-foreground px-3 py-2.5 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 opacity-50" />
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-semibold text-sm truncate flex-1">{ds.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {ds.data.length} rows
                  </Badge>
                </div>

                {/* Columns */}
                <div className="max-h-[280px] overflow-y-auto">
                  {ds.schema.columns.map((col) => (
                    <Tooltip key={col.name}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "column-row px-3 py-2 flex items-center gap-2 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                            isPrimaryKey(col.name) && "bg-amber-50 dark:bg-amber-950/30",
                            connectionState.isConnecting && connectionState.sourceId === ds.id && connectionState.sourceColumn === col.name && "bg-primary/20"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (connectionState.isConnecting) {
                              if (connectionState.sourceId !== ds.id) {
                                endConnection(ds.id, col.name);
                              }
                            } else {
                              startConnection(ds.id, col.name);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setEditingColumn({ dsId: ds.id, colName: col.name, currentType: col.type as ColumnType });
                            setShowColumnTypeDialog(true);
                          }}
                        >
                          {getColumnIcon(col.type)}
                          <span className="font-mono text-xs flex-1 truncate">{col.name}</span>
                          <div className="flex items-center gap-1">
                            {isPrimaryKey(col.name) && (
                              <Key className="h-3 w-3 text-amber-500" />
                            )}
                            {col.isMetric && (
                              <Badge variant="default" className="text-[9px] h-4 px-1 bg-blue-500">M</Badge>
                            )}
                            {col.isDimension && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1">D</Badge>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="space-y-1">
                          <p className="font-mono font-medium">{col.name}</p>
                          <p className="text-xs">Type: {col.type}</p>
                          <p className="text-xs">Unique values: {col.uniqueCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click to create relationship • Right-click to change type
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Connection indicator */}
          {connectionState.isConnecting && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
              <Link2 className="h-4 w-4" />
              <span className="text-sm">Click a column in another table to connect, or click empty space to cancel</span>
            </div>
          )}
        </div>

        {/* Relation Edit Dialog */}
        <Dialog open={showRelationDialog} onOpenChange={setShowRelationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRelation?.id ? "Edit Relationship" : "Create Relationship"}
              </DialogTitle>
            </DialogHeader>
            
            {editingRelation && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="font-mono font-medium">
                      {dataSources.find(d => d.id === editingRelation.sourceId)?.name}
                    </p>
                    <Badge variant="outline" className="mt-1">{editingRelation.sourceColumn}</Badge>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="font-mono font-medium">
                      {dataSources.find(d => d.id === editingRelation.targetId)?.name}
                    </p>
                    <Badge variant="outline" className="mt-1">{editingRelation.targetColumn}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cardinality</label>
                  <Select
                    value={editingRelation.cardinality}
                    onValueChange={(value) => setEditingRelation({
                      ...editingRelation,
                      cardinality: value as DataRelation["cardinality"]
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARDINALITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="font-mono mr-2">{opt.label}</span>
                          <span className="text-muted-foreground">{opt.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {editingRelation.cardinality === "one-to-one" && "Each row in the source matches exactly one row in the target"}
                    {editingRelation.cardinality === "one-to-many" && "One row in source can match many rows in target (e.g., Customer → Orders)"}
                    {editingRelation.cardinality === "many-to-one" && "Many rows in source can match one row in target"}
                    {editingRelation.cardinality === "many-to-many" && "Rows in both tables can match multiple rows in the other"}
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRelationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmRelation}>
                {editingRelation?.id ? "Update" : "Create"} Relationship
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Column Type Edit Dialog */}
        <Dialog open={showColumnTypeDialog} onOpenChange={setShowColumnTypeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Column Type</DialogTitle>
            </DialogHeader>
            
            {editingColumn && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Change the data type for <span className="font-mono font-medium">{editingColumn.colName}</span>
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  {COLUMN_TYPES.map((type) => (
                    <button
                      key={type.value}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        editingColumn.currentType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setEditingColumn({ ...editingColumn, currentType: type.value })}
                    >
                      {type.icon}
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowColumnTypeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (editingColumn) {
                  updateColumnType(editingColumn.dsId, editingColumn.colName, editingColumn.currentType);
                }
                setShowColumnTypeDialog(false);
                setEditingColumn(null);
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
