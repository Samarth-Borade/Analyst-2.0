"use client";

import React from "react"

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseCSV, analyzeData, generateDataStatistics, getSmartSample } from "@/lib/data-utils";
import { getCachedStatistics, generateDataHash } from "@/lib/llm-utils";
import { useDashboardStore } from "@/lib/store";
import * as XLSX from "xlsx";

interface FileUploadProps {
  onAnalysisComplete: () => void;
}

export function FileUpload({ onAnalysisComplete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setRawData, setSchema, setPages, setIsLoading, isLoading, setAiMessage } =
    useDashboardStore();

  const processFile = useCallback(
    async (file: File) => {
      setFile(file);
      setError(null);
      setIsLoading(true);
      setAiMessage("Processing your file...");

      try {
        let data: Record<string, unknown>[];

        if (file.name.endsWith(".csv")) {
          const text = await file.text();
          data = parseCSV(text);
        } else if (
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls")
        ) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet);
        } else {
          throw new Error("Unsupported file format");
        }

        if (data.length === 0) {
          throw new Error("No data found in file");
        }

        setRawData(data, file.name);
        const schema = analyzeData(data);
        setSchema(schema);
        setAiMessage("Analyzing your data and generating dashboard...");

        // Generate hash for caching
        const dataHash = generateDataHash(data);
        
        // Get cached statistics or compute new ones
        const { data: statistics, fromCache } = getCachedStatistics(
          `stats-${file.name}`,
          dataHash,
          () => generateDataStatistics(data)
        );
        
        if (fromCache) {
          console.log("[Cache] Using cached statistics for:", file.name);
        }
        
        const smartSample = getSmartSample(data, 3); // Just 3 representative rows

        // Call AI to generate dashboard
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schema,
            sampleData: smartSample,
            statistics, // Send statistics for better insights
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to analyze data (HTTP ${response.status})`;
          try {
            const bodyText = await response.text();
            try {
              const bodyJson = JSON.parse(bodyText);
              errorMessage =
                bodyJson?.details || bodyJson?.error || errorMessage;
            } catch {
              if (bodyText?.trim()) errorMessage = bodyText;
            }
          } catch {
            // ignore
          }
          console.error("/api/analyze error:", errorMessage);
          throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // Validate response structure
        if (!result.pages || !Array.isArray(result.pages)) {
          console.error("Invalid API response structure:", result);
          throw new Error("Invalid response from analysis API - missing or invalid pages");
        }
        
        setPages(result.pages);
        setAiMessage(result.summary || "Dashboard generated successfully");
        onAnalysisComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [setRawData, setSchema, setPages, setIsLoading, setAiMessage, onAnalysisComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        processFile(droppedFile);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processFile(selectedFile);
      }
    },
    [processFile]
  );

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
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
        {isLoading ? (
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
        ) : file ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Drop your data file here
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
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
