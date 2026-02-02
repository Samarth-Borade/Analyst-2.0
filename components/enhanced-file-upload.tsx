"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  ArrowRight,
  Plus,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseCSV, analyzeData, generateDataStatistics, getSmartSample } from "@/lib/data-utils";
import { getCachedStatistics, generateDataHash } from "@/lib/llm-utils";
import { useDashboardStore, DataSchema } from "@/lib/store";
import { DataPreview } from "@/components/data-preview";
import * as XLSX from "xlsx";

interface EnhancedFileUploadProps {
  onAnalysisComplete: () => void;
  mode?: "initial" | "add-more"; // initial = first upload, add-more = adding to existing
}

export function EnhancedFileUpload({ onAnalysisComplete, mode = "initial" }: EnhancedFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "processing">("upload");
  
  const {
    setRawData,
    setSchema,
    setPages,
    setIsLoading,
    isLoading,
    setAiMessage,
    previewData,
    setPreviewData,
    selectedColumns,
    setSelectedColumns,
    toggleColumn,
    addDataSource,
    dataSources,
  } = useDashboardStore();

  // Check if file already exists in data sources
  const existingFileNames = dataSources.map(ds => ds.name.toLowerCase());

  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [parsedSchema, setParsedSchema] = useState<DataSchema | null>(null);

  // Reset state when component mounts (dialog opens)
  useEffect(() => {
    setFile(null);
    setError(null);
    setParsedData([]);
    setParsedSchema(null);
    setPreviewData(null);
    setStep("upload");
    // Don't reset selectedColumns here as it's global state
  }, [setPreviewData]);

  // Filter data based on selected columns
  const filteredData = useMemo(() => {
    if (!parsedData.length || !selectedColumns.length) return parsedData;
    return parsedData.map(row => {
      const filtered: Record<string, unknown> = {};
      selectedColumns.forEach(col => {
        filtered[col] = row[col];
      });
      return filtered;
    });
  }, [parsedData, selectedColumns]);

  const parseFile = useCallback(async (fileToProcess: File) => {
    setFile(fileToProcess);
    setError(null);

    try {
      let data: Record<string, unknown>[];

      if (fileToProcess.name.endsWith(".csv")) {
        const text = await fileToProcess.text();
        data = parseCSV(text);
      } else if (fileToProcess.name.endsWith(".xlsx") || fileToProcess.name.endsWith(".xls")) {
        const buffer = await fileToProcess.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        throw new Error("Unsupported file format");
      }

      if (data.length === 0) {
        throw new Error("No data found in file");
      }

      const schema = analyzeData(data);
      
      // Set all columns as selected by default
      const allColumns = schema.columns.map(c => c.name);
      setSelectedColumns(allColumns);
      
      setParsedData(data);
      setParsedSchema(schema);
      setPreviewData(data);
      setStep("preview");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setFile(null);
    }
  }, [setSelectedColumns, setPreviewData]);

  const handleProceed = useCallback(async () => {
    if (!parsedSchema || !file || selectedColumns.length === 0) return;

    setStep("processing");
    setIsLoading(true);

    try {
      // Filter schema to only include selected columns
      const filteredSchema: DataSchema = {
        ...parsedSchema,
        columns: parsedSchema.columns.filter(c => selectedColumns.includes(c.name)),
      };

      // Add to data sources (this handles adding to the array)
      addDataSource(file.name, filteredData, filteredSchema);

      // For "add-more" mode, we just add the data source without regenerating dashboard
      if (mode === "add-more") {
        setAiMessage(`Added "${file.name}" to your data sources`);
        setPreviewData(null);
        setIsLoading(false);
        onAnalysisComplete();
        return;
      }

      // For initial upload, generate dashboard
      setAiMessage("Analyzing your data and generating dashboard...");
      setRawData(filteredData, file.name);
      setSchema(filteredSchema);

      // Generate hash for caching
      const dataHash = generateDataHash(filteredData);
      
      // Get cached statistics or compute new ones
      const { data: statistics } = getCachedStatistics(
        `stats-${file.name}`,
        dataHash,
        () => generateDataStatistics(filteredData)
      );
      
      const smartSample = getSmartSample(filteredData, 3);

      // Call AI to generate dashboard
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: filteredSchema,
          sampleData: smartSample,
          statistics,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to analyze data (HTTP ${response.status})`;
        try {
          const bodyText = await response.text();
          const bodyJson = JSON.parse(bodyText);
          errorMessage = bodyJson?.details || bodyJson?.error || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.pages || !Array.isArray(result.pages)) {
        throw new Error("Invalid response from analysis API");
      }
      
      setPages(result.pages);
      setAiMessage(result.summary || "Dashboard generated successfully");
      setPreviewData(null);
      onAnalysisComplete();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  }, [
    parsedSchema, file, selectedColumns, filteredData, mode,
    setRawData, setSchema, setIsLoading, setAiMessage, setPages,
    addDataSource, setPreviewData, onAnalysisComplete
  ]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) parseFile(droppedFile);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) parseFile(selectedFile);
  }, [parseFile]);

  const handleSelectAll = useCallback(() => {
    if (parsedSchema) {
      setSelectedColumns(parsedSchema.columns.map(c => c.name));
    }
  }, [parsedSchema, setSelectedColumns]);

  const handleDeselectAll = useCallback(() => {
    setSelectedColumns([]);
  }, [setSelectedColumns]);

  const clearFile = () => {
    setFile(null);
    setError(null);
    setParsedData([]);
    setParsedSchema(null);
    setPreviewData(null);
    setSelectedColumns([]);
    setStep("upload");
  };

  const handleAddMoreData = () => {
    clearFile();
    // Stay on upload view for adding more files
  };

  // Upload step
  if (step === "upload") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            file && "border-primary/30 bg-primary/5"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                {mode === "add-more" ? "Add another data file" : "Drop your data file here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports CSV, XLS, and XLSX files
              </p>
            </div>
            <label>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
              />
              <Button variant="outline" asChild>
                <span className="cursor-pointer">Browse Files</span>
              </Button>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Show existing data sources if in add-more mode */}
        {mode === "add-more" && dataSources.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Existing Data Sources ({dataSources.length})
            </h4>
            <div className="space-y-2">
              {dataSources.map((ds) => (
                <div
                  key={ds.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-mono">{ds.name}</span>
                  <span className="text-xs">({ds.data.length} rows)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Check if this file already exists
  const fileAlreadyExists = file && existingFileNames.includes(file.name.toLowerCase());

  // Preview step
  if (step === "preview" && parsedSchema && parsedData.length > 0) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* File info header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{file?.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file?.size ? file.size / 1024 : 0).toFixed(1)} KB • {parsedData.length} rows • {parsedSchema.columns.length} columns
              </p>
              {fileAlreadyExists && (
                <p className="text-xs text-amber-500 mt-1">
                  ⚠️ This file already exists and will be updated
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFile}>
            <X className="h-4 w-4 mr-2" />
            Choose Different File
          </Button>
        </div>

        {/* Data preview with column selection */}
        <DataPreview
          data={parsedData}
          schema={parsedSchema}
          selectedColumns={selectedColumns}
          onToggleColumn={toggleColumn}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleAddMoreData}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add More Data Files
          </Button>

          <div className="flex items-center gap-3">
            {selectedColumns.length === 0 && (
              <p className="text-sm text-amber-500">
                Please select at least one column
              </p>
            )}
            <Button
              onClick={handleProceed}
              disabled={selectedColumns.length === 0}
              className="gap-2 px-6"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              Let&apos;s Go!
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Processing step
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-2 border-dashed rounded-xl p-12 border-primary/30 bg-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">
              Analyzing your data...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Our AI is understanding your dataset and generating the best dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
