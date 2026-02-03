"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, MessageSquare, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store";
import { useVisualization, COLOR_PALETTES } from "@/lib/visualization-context";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Change bar chart colors to blue",
  "Add a line chart showing revenue over time",
  "Create a new page for regional analysis",
  "Show top 10 products by sales",
  "Use a professional corporate theme",
  "Make the dashboard look more modern",
];

export function PromptBar() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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
    aiMessage,
    setAiMessage,
    addToPromptHistory,
    pendingPrompt,
    setPendingPrompt,
    suggestedQuestions,
    setSuggestedQuestions,
    chatHistory,
    addToChatHistory,
    createCalculatedColumn,
  } = useDashboardStore();

  // Get visualization context for style updates
  const { updateDashboardStyle, applyColorPalette } = useVisualization();

  const currentPage = pages.find((p) => p.id === currentPageId);

  // Listen for pending prompts from chart picker
  useEffect(() => {
    if (pendingPrompt) {
      setPrompt(pendingPrompt);
      setPendingPrompt(null);
      // Focus the input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [pendingPrompt, setPendingPrompt]);

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

    const userPrompt = prompt.trim();
    setIsProcessing(true);
    addToPromptHistory(userPrompt);
    setAiMessage("Processing your request...");
    setSuggestedQuestions([]); // Clear previous suggestions
    setShowExamples(false); // Hide examples while processing

    try {
      const response = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          currentDashboard: { pages, currentPageId },
          schema,
          chatHistory: chatHistory.slice(-6), // Send last 6 messages for context
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

        case "update_all_charts":
          // Bulk update: apply chartUpdate to all charts matching targetChartType across all pages
          if (result.chartUpdate) {
            const targetType = result.targetChartType;
            let updatedCount = 0;
            
            for (const page of pages) {
              for (const chart of page.charts) {
                // If targetChartType is "all" or matches the chart type
                if (targetType === "all" || chart.type === targetType) {
                  updateChart(page.id, chart.id, result.chartUpdate);
                  updatedCount++;
                }
              }
            }
            
            console.log(`[Bulk Update] Updated ${updatedCount} charts of type "${targetType}"`);
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

        case "update_dashboard_style":
          // Dashboard styling updates via prompts
          if (result.styleUpdate) {
            const { colorPalette, ...otherStyles } = result.styleUpdate;
            
            // Apply color palette if specified
            if (colorPalette && colorPalette in COLOR_PALETTES) {
              applyColorPalette(colorPalette as keyof typeof COLOR_PALETTES);
            }
            
            // Apply other style updates
            if (Object.keys(otherStyles).length > 0) {
              updateDashboardStyle(otherStyles);
            }
            
            console.log(`[Style Update] Applied:`, result.styleUpdate);
          }
          break;

        case "transform_data":
          // Data transformation requested
          if (result.dataTransform) {
            const { operation, targetDataSource, newName, formula, column } = result.dataTransform;
            console.log(`[Transform] Operation: ${operation}`);
            
            if (operation === "create_calculated" && newName && formula) {
              // Create a calculated column in the data source
              const success = createCalculatedColumn(targetDataSource, newName, formula);
              if (success) {
                console.log(`[Transform] Created calculated column: ${newName} = ${formula}`);
              } else {
                console.error(`[Transform] Failed to create calculated column: ${newName}`);
              }
            }
            // Other operations can be handled here in the future
          }
          break;

        case "create_relation":
          // Relationship creation requested
          if (result.relationCreate) {
            console.log(`[Relation] ${result.relationCreate.sourceTable} → ${result.relationCreate.targetTable}`);
            // This would trigger the relation creation in the data modeling view
          }
          break;

        case "reject":
          // Request was rejected for ethical or technical reasons
          // The message already contains the explanation - no action needed
          console.log(`[Rejected] Reason: ${result.rejectReason || 'unknown'}`);
          break;
      }

      setAiMessage(result.message || "Changes applied successfully!");
      
      // Store suggested follow-up questions if provided
      if (result.suggestedQuestions && Array.isArray(result.suggestedQuestions)) {
        setSuggestedQuestions(result.suggestedQuestions);
      }
      
      // Add to chat history for context memory
      addToChatHistory({ role: "user", content: userPrompt });
      addToChatHistory({ role: "assistant", content: result.message, action: result.action });
      
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
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        {/* AI Message Display */}
        {aiMessage && (
          <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-mono leading-relaxed">
                    {aiMessage}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setAiMessage("");
                    setSuggestedQuestions([]);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Follow-up Questions - Show when available (takes priority over examples) */}
        {suggestedQuestions.length > 0 && (
          <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground font-mono">Try next:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors font-mono"
                  onClick={() => {
                    setPrompt(question);
                    setSuggestedQuestions([]);
                    inputRef.current?.focus();
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Example prompts - Only show when focused AND no suggestions available */}
        {showExamples && suggestedQuestions.length === 0 && (
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
