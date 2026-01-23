"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Change bar chart colors to blue",
  "Add a line chart showing revenue over time",
  "Create a new page for regional analysis",
  "Show top 10 products by sales",
  "Add a KPI for average order value",
  "Make the dashboard darker",
];

export function PromptBar() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    schema,
    pages,
    currentPageId,
    updateChart,
    addChart,
    deleteChart,
    addPage,
    updatePage,
    toggleTheme,
    setAiMessage,
    addToPromptHistory,
  } = useDashboardStore();

  const currentPage = pages.find((p) => p.id === currentPageId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && e.target === document.body) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing || !schema) return;

    setIsProcessing(true);
    addToPromptHistory(prompt);
    setAiMessage("Processing your request...");

    try {
      const response = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentDashboard: { pages, currentPageId },
          schema,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to process prompt (HTTP ${response.status})`;
        try {
          const bodyText = await response.text();
          try {
            const bodyJson = JSON.parse(bodyText);
            errorMessage = bodyJson?.details || bodyJson?.error || errorMessage;
          } catch {
            if (bodyText?.trim()) errorMessage = bodyText;
          }
        } catch {
          // ignore
        }
        console.error("/api/prompt error:", errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Apply the action
      switch (result.action) {
        case "update_chart":
          if (result.targetPageId && result.targetChartId && result.chartUpdate) {
            updateChart(result.targetPageId, result.targetChartId, result.chartUpdate);
          }
          break;

        case "add_chart":
          if (result.targetPageId && result.newChart) {
            addChart(result.targetPageId, result.newChart);
          } else if (currentPageId && result.newChart) {
            addChart(currentPageId, result.newChart);
          }
          break;

        case "delete_chart":
          if (result.targetPageId && result.targetChartId) {
            deleteChart(result.targetPageId, result.targetChartId);
          }
          break;

        case "add_page":
          if (result.newPage) {
            addPage(result.newPage);
          }
          break;

        case "update_page":
          if (result.targetPageId && result.pageUpdate) {
            updatePage(result.targetPageId, result.pageUpdate);
          }
          break;

        case "update_theme":
          if (result.themeUpdate) {
            toggleTheme();
          }
          break;
      }

      setAiMessage(result.message || "Changes applied successfully!");
      setPrompt("");
    } catch (error) {
      setAiMessage(
        error instanceof Error
          ? error.message
          : "Sorry, I couldn't process that request. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
      <div className="max-w-3xl mx-auto">
        {showExamples && (
          <div className="mb-3 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-mono"
                onClick={() => {
                  setPrompt(example);
                  setShowExamples(false);
                  inputRef.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-lg transition-all",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
          )}
        >
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setShowExamples(true)}
            onBlur={() => setTimeout(() => setShowExamples(false), 200)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Describe what you want to change..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground font-mono"
            disabled={isProcessing || !currentPage}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block font-mono">
              Press / to focus
            </span>
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isProcessing || !currentPage}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
