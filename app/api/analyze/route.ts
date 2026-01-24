import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { estimateTokens, logTokenUsage } from "@/lib/llm-utils";

const chartConfigSchema = z.object({
  id: z.string(),
  type: z.enum([
    "kpi",
    "bar",
    "stacked-bar",
    "clustered-bar",
    "line",
    "area",
    "stacked-area",
    "scatter",
    "bubble",
    "pie",
    "donut",
    "heatmap",
    "treemap",
    "waterfall",
    "funnel",
    "gauge",
    "radar",
    "table",
    "matrix",
  ]),
  title: z.string(),
  xAxis: z.string().optional(),
  yAxis: z.union([z.string(), z.array(z.string())]).optional(),
  groupBy: z.string().optional(),
  aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
  // Trend data for KPI cards - LLM should analyze data to determine realistic trends
  trend: z.enum(["up", "down", "flat"]).optional(),
  trendValue: z.number().optional(),
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});

const dashboardSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      charts: z.array(chartConfigSchema),
    })
  ),
  summary: z.string(),
});

// Helper function to extract JSON from markdown code blocks
function extractJSON(text: string): string {
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(codeBlockRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  return text.trim();
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        {
          error: "Missing GROQ_API_KEY",
          details:
            "Set GROQ_API_KEY in Vercel Project Settings → Environment Variables and redeploy.",
        },
        { status: 500 }
      );
    }

    const { schema, sampleData, statistics } = await req.json();

    // Build optimized context - prefer statistics over raw samples
    const dataContext = statistics 
      ? `Data Statistics (use these for insights):
${JSON.stringify(statistics, null, 2)}

Sample Data (3 representative rows):
${JSON.stringify(sampleData?.slice(0, 3) || [], null, 2)}`
      : `Sample Data (first 5 rows):
${JSON.stringify(sampleData, null, 2)}`;

    const prompt = `You are an expert data analyst. Based on the following dataset schema and statistics, generate an optimal dashboard configuration.

Dataset Schema:
${JSON.stringify(schema, null, 2)}

${dataContext}

Generate a dashboard with multiple pages:

1. Page 1: "Overview" - with:
   - 3-4 KPI cards for the most important numeric metrics (use type: "kpi")
   - A bar chart for the most interesting categorical comparison
   - A line chart if there's time series data
   - A table showing key data

2. Additional pages with descriptive names like:
   - "Sales Analysis" (if sales data exists)
   - "Category Breakdown" (if categorical data exists)
   - "Regional Performance" (if regional data exists)
   - "Trends" (if time series data exists)

Available chart types:
- kpi: Single value metric card (IMPORTANT: Must include "trend" and "trendValue" properties)
- bar: Vertical bar chart
- clustered-bar: Multiple bars grouped by category
- stacked-bar: Stacked bar chart
- line: Line chart for trends
- area: Area chart
- stacked-area: Stacked area chart
- scatter: Scatter plot for correlations
- bubble: Bubble chart (scatter with size)
- pie: Pie chart for proportions
- donut: Donut chart
- heatmap: Heat map for matrix data
- treemap: Treemap for hierarchical data
- waterfall: Waterfall chart for cumulative effect
- funnel: Funnel chart for conversion
- gauge: Gauge for single metrics with targets
- radar: Radar/spider chart for multi-dimensional comparison
- table: Data table
- matrix: Pivot table with drill-down

IMPORTANT FOR KPI CARDS:
- Every KPI card MUST include "trend" (one of: "up", "down", "flat") and "trendValue" (a number representing percentage change, e.g., 8.5 for 8.5%)
- Analyze the data to determine realistic trend values based on the data patterns
- If the data has time series, compare recent vs earlier periods to calculate actual trends
- If no time comparison is possible, use data distribution insights to suggest realistic trends
- trendValue should be a reasonable percentage (typically 0-30%)

Rules for page generation:
- Each page MUST have a clear, descriptive name (not empty, not just "Page")
- KPI charts should only have yAxis (the metric to display), no xAxis
- Bar/Line/Area charts need both xAxis (dimension) and yAxis (metric)
- Use realistic chart sizes: width 1-4, height 1-2
- Position charts in a grid layout (x: 0-3, y: increments of 1-2)
- Only use columns that exist in the schema
- Prefer clarity over decoration
- Generate unique IDs for each chart and page

Return a valid dashboard configuration JSON with clear page names and a summary explaining the dashboard. Return ONLY valid JSON, no markdown or explanation.`;

    // Track token usage
    const startTime = Date.now();
    const inputTokens = estimateTokens(prompt);

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
    });

    // Log token usage
    const outputTokens = estimateTokens(text);
    logTokenUsage({
      timestamp: Date.now(),
      endpoint: '/api/analyze',
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model: 'llama-3.3-70b-versatile',
      latencyMs: Date.now() - startTime,
    });

    // Extract JSON from potential markdown code blocks
    const cleanedText = extractJSON(text);
    
    try {
      const result = JSON.parse(cleanedText);
      return Response.json(result);
    } catch (parseError) {
      console.error("Failed to parse model JSON:", parseError);
      console.error("Model output preview:", cleanedText.slice(0, 500));
      return Response.json(
        {
          error: "Model returned invalid JSON",
          details:
            parseError instanceof Error ? parseError.message : "Unknown parse error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      {
        error: "Failed to analyze data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}