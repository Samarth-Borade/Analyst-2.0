"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Hash,
  Calendar,
  Type,
  BarChart3,
  FileSpreadsheet,
  Sparkles,
  Info,
  ArrowRight,
  Key,
  Link2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardStore } from "@/lib/store";

interface ColumnRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: "one-to-many" | "one-to-one" | "many-to-many";
  confidence: number;
  reason: string;
}

interface TableNode {
  id: string;
  name: string;
  columns: {
    name: string;
    type: string;
    isMetric: boolean;
    isDimension: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
  }[];
  x: number;
  y: number;
}

export function DataModelingView() {
  const { schema, rawData, fileName, setCurrentView, dataSources } = useDashboardStore();
  const [relationships, setRelationships] = useState<ColumnRelationship[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showLearnMore, setShowLearnMore] = useState(false);

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

  // Build table nodes from all data sources
  const tableNodes: TableNode[] = dataSources.map((ds, index) => ({
    id: ds.id,
    name: ds.name,
    columns: ds.schema.columns.map((col) => ({
      name: col.name,
      type: col.type,
      isMetric: col.isMetric,
      isDimension: col.isDimension,
      isPrimaryKey:
        col.name.toLowerCase().includes("id") ||
        col.name.toLowerCase() === "key" ||
        col.name.toLowerCase().includes("_id"),
      isForeignKey: false,
    })),
    x: 100 + (index % 2) * 400,
    y: 100 + Math.floor(index / 2) * 350,
  }));

  // Analyze column relationships between tables
  const analyzeRelationships = useCallback(async () => {
    if (dataSources.length === 0) return;

    setIsAnalyzing(true);

    // Simulate AI analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const suggestedRelationships: ColumnRelationship[] = [];

    // If we have multiple tables, find matching columns
    if (dataSources.length > 1) {
      for (let i = 0; i < dataSources.length; i++) {
        for (let j = i + 1; j < dataSources.length; j++) {
          const table1 = dataSources[i];
          const table2 = dataSources[j];

          // Find columns with matching names
          table1.schema.columns.forEach((col1) => {
            table2.schema.columns.forEach((col2) => {
              const name1 = col1.name.toLowerCase().replace(/[_\s]/g, "");
              const name2 = col2.name.toLowerCase().replace(/[_\s]/g, "");
              
              // Check for exact match or partial match
              if (name1 === name2 || name1.includes(name2) || name2.includes(name1)) {
                suggestedRelationships.push({
                  fromTable: table1.name,
                  fromColumn: col1.name,
                  toTable: table2.name,
                  toColumn: col2.name,
                  type: col1.type === "numeric" && col2.type === "numeric" ? "one-to-one" : "one-to-many",
                  confidence: name1 === name2 ? 0.9 : 0.7,
                  reason: `Column "${col1.name}" in ${table1.name} appears to match "${col2.name}" in ${table2.name}`,
                });
              }
            });
          });
        }
      }
    }

    // For single table or additional suggestions, add dimension-based suggestions
    dataSources.forEach((ds) => {
      ds.schema.columns
        .filter((col) => col.isDimension && col.type === "categorical")
        .forEach((col) => {
          // Check if this column exists in another table
          const existsInOther = dataSources.some(
            (other) =>
              other.id !== ds.id &&
              other.schema.columns.some(
                (c) => c.name.toLowerCase() === col.name.toLowerCase()
              )
          );
          
          if (!existsInOther && dataSources.length === 1) {
            suggestedRelationships.push({
              fromTable: ds.name,
              fromColumn: col.name,
              toTable: `${col.name} (potential lookup table)`,
              toColumn: "id",
              type: "many-to-many",
              confidence: 0.5,
              reason: `${col.name} appears to be a categorical dimension that could reference a separate lookup table`,
            });
          }
        });
    });

    setRelationships(suggestedRelationships);
    setIsAnalyzing(false);
  }, [dataSources]);

  useEffect(() => {
    if (dataSources.length > 0 && relationships.length === 0) {
      analyzeRelationships();
    }
  }, [dataSources, analyzeRelationships, relationships.length]);

  if (dataSources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <GitBranch className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">
            No Data to Model
          </h2>
          <p className="text-muted-foreground max-w-md">
            Upload a data file to visualize your data model
          </p>
          <Button onClick={() => setCurrentView("upload")}>
            Upload Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 bg-background p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-3">
                <GitBranch className="h-6 w-6" />
                Data Modeling
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize your data structure and relationships
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
              >
                <Info className="h-4 w-4 mr-2" />
                {showHelp ? "Hide" : "Show"} Guide
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={analyzeRelationships}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isAnalyzing ? "Analyzing..." : "Re-analyze"}
              </Button>
            </div>
          </div>

          {/* Newbie-friendly Help Section */}
          {showHelp && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  What is Data Modeling?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Data modeling helps you understand the structure of your data.
                  Think of it like a blueprint of your data - it shows you what
                  columns you have, what type of information they contain, and how
                  different pieces of data might relate to each other.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <Hash className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Metrics (Numbers)</h4>
                      <p className="text-xs text-muted-foreground">
                        Values you can measure, like sales or quantity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Dimensions (Categories)</h4>
                      <p className="text-xs text-muted-foreground">
                        Ways to group data, like region or product name
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                      <Key className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Keys (Identifiers)</h4>
                      <p className="text-xs text-muted-foreground">
                        Unique IDs that can link tables together
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLearnMore(!showLearnMore)}
                  className="text-primary"
                >
                  {showLearnMore ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Learn More About Relationships
                    </>
                  )}
                </Button>

                {showLearnMore && (
                  <div className="bg-background rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">
                      Understanding Table Relationships
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      When you have multiple data files, they can be connected
                      through shared columns. This is called a relationship:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>
                        <strong>One-to-One:</strong> Each row in Table A matches
                        exactly one row in Table B (e.g., user → profile)
                      </li>
                      <li>
                        <strong>One-to-Many:</strong> One row in Table A can
                        match many rows in Table B (e.g., customer → orders)
                      </li>
                      <li>
                        <strong>Many-to-Many:</strong> Rows in both tables can
                        match multiple rows in the other (e.g., students ↔
                        courses)
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> Upload more data files to see how
                      the AI can automatically detect relationships between your
                      tables!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* UML-style Table Diagram */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Table Schema {tableNodes.length > 1 && `(${tableNodes.length} tables)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-6">
                {tableNodes.map((tableNode) => {
                  const ds = dataSources.find(d => d.id === tableNode.id);
                  return (
                    <div key={tableNode.id} className="inline-block border-2 border-primary rounded-lg overflow-hidden min-w-[300px] max-w-[400px] shadow-lg">
                      {/* Table Header */}
                      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        <span className="font-bold font-mono truncate">{tableNode.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
                          {ds?.data.length || 0} rows
                        </Badge>
                      </div>

                      {/* Columns */}
                      <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                        {tableNode.columns.map((col) => (
                          <Tooltip key={col.name}>
                            <TooltipTrigger asChild>
                              <div
                                className={`px-4 py-2 flex items-center gap-3 hover:bg-muted/50 cursor-default ${
                                  col.isPrimaryKey ? "bg-amber-50 dark:bg-amber-950/30" : ""
                                }`}
                              >
                                <span className="flex-shrink-0">
                                  {getColumnIcon(col.type)}
                                </span>
                                <span className="font-mono text-sm flex-1 truncate">
                                  {col.name}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {col.isPrimaryKey && (
                                    <Key className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  {col.isMetric && (
                                    <Badge
                                      variant="default"
                                      className="text-[10px] h-5 bg-blue-500"
                                    >
                                      M
                                    </Badge>
                                  )}
                                  {col.isDimension && (
                                    <Badge variant="secondary" className="text-[10px] h-5">
                                      D
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-mono font-medium">{col.name}</p>
                                <p className="text-xs">Type: {col.type}</p>
                                {col.isMetric && (
                                  <p className="text-xs text-blue-400">
                                    This is a metric column - use it for calculations
                                    like sums, averages, etc.
                                  </p>
                                )}
                                {col.isDimension && (
                                  <p className="text-xs text-purple-400">
                                    This is a dimension - use it to group or filter
                                    your data.
                                  </p>
                                )}
                                {col.isPrimaryKey && (
                                  <p className="text-xs text-amber-400">
                                    This column appears to be a unique identifier (key).
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          {relationships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Based on your data structure, here are some insights:
                  </p>
                  {relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Link2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            {rel.fromColumn}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {rel.toTable}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rel.reason}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-2 text-xs"
                        >
                          Confidence: {Math.round(rel.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Pro Tip
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload additional data files to enable automatic relationship
                      detection. The AI will analyze column names and data patterns
                      to suggest how your tables connect!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setCurrentView("data")}>
                  <Table2 className="h-4 w-4 mr-2" />
                  View Data Sources
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentView("dashboard")}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
