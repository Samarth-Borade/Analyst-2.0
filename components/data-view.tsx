"use client";

import { useState } from "react";
import {
  Table2,
  Hash,
  Calendar,
  Type,
  BarChart3,
  FileSpreadsheet,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDashboardStore } from "@/lib/store";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";

export function DataView() {
  const { schema, rawData, fileName, setCurrentView, dataSources } = useDashboardStore();
  const [showAddData, setShowAddData] = useState(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<string | null>(null);

  const getColumnIcon = (type: string) => {
    switch (type) {
      case "numeric":
        return <Hash className="h-4 w-4 text-blue-500" />;
      case "datetime":
        return <Calendar className="h-4 w-4 text-green-500" />;
      case "categorical":
        return <BarChart3 className="h-4 w-4 text-purple-500" />;
      default:
        return <Type className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "numeric":
        return "default";
      case "datetime":
        return "secondary";
      case "categorical":
        return "outline";
      default:
        return "outline";
    }
  };

  // Use dataSources to show all tables
  const tables = dataSources.map((ds) => {
    const metrics = ds.schema.columns.filter((c) => c.isMetric);
    const dimensions = ds.schema.columns.filter((c) => c.isDimension);
    return {
      id: ds.id,
      name: ds.name,
      rowCount: ds.data.length,
      columns: ds.schema.columns,
      data: ds.data,
      metrics,
      dimensions,
    };
  });

  // Get currently selected table for preview
  const selectedTableData = previewTable 
    ? dataSources.find(ds => ds.id === previewTable)
    : null;

  if (dataSources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Table2 className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">No Data Loaded</h2>
          <p className="text-muted-foreground max-w-md">
            Upload a data file to see your data sources here
          </p>
          <Button onClick={() => setShowAddData(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Data
          </Button>
        </div>

        <Dialog open={showAddData} onOpenChange={setShowAddData}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Data
              </DialogTitle>
            </DialogHeader>
            <EnhancedFileUpload
              onAnalysisComplete={() => setShowAddData(false)}
              mode="initial"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-mono">
              Data Sources
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your data tables and view their structure
            </p>
          </div>
          <Button onClick={() => setShowAddData(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Data
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tables.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Rows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tables.reduce((acc, t) => acc + t.rowCount, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {tables.reduce((acc, t) => acc + t.metrics.length, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                {tables.reduce((acc, t) => acc + t.dimensions.length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables List */}
        <div className="space-y-4">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-mono">
                        {table.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {table.rowCount.toLocaleString()} rows •{" "}
                        {table.columns.length} columns
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTable(table.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedTable(
                          expandedTable === table.id ? null : table.id
                        )
                      }
                    >
                      {expandedTable === table.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedTable === table.id && (
                <CardContent className="pt-0">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Column Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Sample Values</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell>{getColumnIcon(column.type)}</TableCell>
                            <TableCell className="font-mono font-medium">
                              {column.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTypeBadgeVariant(column.type)}>
                                {column.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {column.isMetric && (
                                <Badge variant="default" className="bg-blue-500">
                                  Metric
                                </Badge>
                              )}
                              {column.isDimension && (
                                <Badge variant="secondary">Dimension</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground font-mono text-sm">
                              {column.sample?.slice(0, 3).join(", ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentView("data-modeling")}
              >
                <Table2 className="h-4 w-4 mr-2" />
                View Data Model
              </Button>
              <Button variant="outline" onClick={() => setCurrentView("dashboard")}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Data Preview Dialog */}
      <Dialog open={!!previewTable} onOpenChange={() => setPreviewTable(null)}>
        <DialogContent className="max-w-[98vw] w-[98vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Data Preview - {selectedTableData?.name || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-auto">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    {selectedTableData?.schema.columns.map((col) => (
                      <TableHead key={col.name} className="font-mono">
                        <div className="flex items-center gap-2">
                          {getColumnIcon(col.type)}
                          {col.name}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTableData?.data.slice(0, 100).map((row: Record<string, unknown>, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      {selectedTableData?.schema.columns.map((col) => (
                        <TableCell key={col.name} className="font-mono text-sm">
                          {row[col.name]?.toString() || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {selectedTableData && selectedTableData.data.length > 100 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Showing first 100 rows of {selectedTableData.data.length.toLocaleString()} total
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
