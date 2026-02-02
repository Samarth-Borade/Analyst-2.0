import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { z, ZodError } from "zod";
import { compressDashboardForLLM } from "@/lib/data-utils";
import { estimateTokens, logTokenUsage } from "@/lib/llm-utils";
import { generateInsights, generateForecast, runWhatIfScenario } from "@/lib/analytics-engine";

// Helper function to convert Zod errors to user-friendly messages
function formatZodError(error: ZodError): string {
  const issues = error.issues;
  
  const friendlyMessages: string[] = [];
  
  for (const issue of issues) {
    const path = issue.path.join(" → ");
    
    if (issue.code === "invalid_enum_value") {
      const received = (issue as any).received;
      const options = (issue as any).options as string[];
      
      // Create friendly messages for specific fields
      if (path.includes("titlePosition")) {
        friendlyMessages.push(
          `Sorry, "${received}" is not a valid title position. You can use "top" or "bottom".`
        );
      } else if (path.includes("aggregation")) {
        friendlyMessages.push(
          `Sorry, "${received}" is not a valid aggregation. Try: sum, avg, count, min, or max.`
        );
      } else if (path.includes("sortOrder")) {
        friendlyMessages.push(
          `Sorry, "${received}" is not a valid sort order. Use "asc" (ascending) or "desc" (descending).`
        );
      } else if (path.includes("type")) {
        friendlyMessages.push(
          `Sorry, "${received}" is not a supported chart type. Try: bar, line, pie, kpi, table, etc.`
        );
      } else {
        friendlyMessages.push(
          `Sorry, "${received}" is not valid. Available options: ${options.join(", ")}.`
        );
      }
    } else if (issue.code === "invalid_type") {
      friendlyMessages.push(
        `I couldn't understand part of your request. Please try rephrasing it.`
      );
    } else {
      friendlyMessages.push(
        `Something went wrong processing your request. Please try again with different wording.`
      );
    }
  }
  
  return friendlyMessages.length > 0 
    ? friendlyMessages[0] 
    : "I couldn't process that request. Please try rephrasing it.";
}

const updateSchema = z.object({
  action: z.enum([
    "update_chart",
    "update_all_charts", // Bulk update all charts matching criteria
    "add_chart",
    "delete_chart",
    "add_page",
    "update_page",
    "delete_page",
    "update_theme",
    "update_dashboard_style", // New: Update dashboard styling (colors, fonts, layouts)
    "add_filter",
    "sort_data",
    "filter_data",
    // Data transformation actions
    "transform_data",
    "create_relation",
    // Smart Analytics actions
    "generate_insights",    // Auto-detect anomalies, trends, correlations
    "generate_forecast",    // Predict future values based on historical data
    "run_what_if",          // What-if scenario analysis
    "reject", // For requests that violate data ethics or are impossible
  ]),
  // For reject action - explain why
  rejectReason: z.enum([
    "data_manipulation", // Trying to fake/change actual data values
    "impossible_action", // Technically not possible
    "ambiguous_request", // Need more clarification
    "no_matching_chart", // Can't find the chart user is referring to
    "other",
  ]).optional(),
  targetChartId: z.string().optional(),
  targetPageId: z.string().optional(),
  // For bulk operations - filter by chart type
  targetChartType: z.enum([
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
    "all", // Target all chart types
  ]).optional(),
  chartUpdate: z
    .object({
      type: z
        .enum([
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
        ])
        .optional(),
      title: z.string().optional(),
      titlePosition: z.enum(["top", "bottom"]).optional(),
      xAxis: z.string().optional(),
      yAxis: z.union([z.string(), z.array(z.string())]).optional(),
      groupBy: z.string().optional(),
      aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
      // Trend data for KPI cards
      trend: z.enum(["up", "down", "flat"]).optional(),
      trendValue: z.number().optional(),
      // Columns to display in table (array of column names)
      columns: z.array(z.string()).optional(),
      colors: z.array(z.string()).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      filterColumn: z.string().optional(),
      filterValues: z.array(z.string()).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .optional(),
  newChart: z
    .object({
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
      title: z.string().default("New Chart"),
      titlePosition: z.enum(["top", "bottom"]).optional(),
      xAxis: z.string().optional(),
      yAxis: z.union([z.string(), z.array(z.string())]).optional(),
      groupBy: z.string().optional(),
      aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
      // Trend data for KPI cards - LLM should provide realistic values
      trend: z.enum(["up", "down", "flat"]).optional(),
      trendValue: z.number().optional(),
      // Columns to display in table (array of column names)
      columns: z.array(z.string()).optional(),
      width: z.number().default(2),
      height: z.number().default(2),
      x: z.number().default(0),
      y: z.number().default(0),
    })
    .optional(),
  newPage: z
    .object({
      id: z.string(),
      name: z.string(),
      charts: z.array(z.any()),
      showTitle: z.boolean().optional(),
    })
    .optional(),
  pageUpdate: z
    .object({
      name: z.string().optional(),
      showTitle: z.boolean().optional(),
    })
    .optional(),
  themeUpdate: z.enum(["light", "dark"]).optional(),
  filterUpdate: z
    .object({
      column: z.string(),
      values: z.array(z.string()),
    })
    .optional(),
  // Data transformation action
  dataTransform: z
    .object({
      operation: z.enum([
        "remove_nulls",      // Remove rows with null values in specified column
        "fill_nulls",        // Fill null values with a default
        "rename_column",     // Rename a column
        "change_type",       // Change column data type  
        "create_calculated", // Create a calculated column
        "filter_rows",       // Filter rows based on condition
        "aggregate",         // Group and aggregate data
        "merge_columns",     // Combine multiple columns
      ]),
      targetDataSource: z.string().optional(),
      column: z.string().optional(),
      columns: z.array(z.string()).optional(),
      newName: z.string().optional(),
      newType: z.enum(["numeric", "categorical", "datetime", "text"]).optional(),
      fillValue: z.union([z.string(), z.number()]).optional(),
      formula: z.string().optional(),
      condition: z.string().optional(),
      groupBy: z.string().optional(),
      aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
    })
    .optional(),
  // Create relationship between tables
  relationCreate: z
    .object({
      sourceTable: z.string(),
      targetTable: z.string(),
      sourceColumn: z.string(),
      targetColumn: z.string(),
      cardinality: z.enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]),
    })
    .optional(),
  // Dashboard styling updates
  styleUpdate: z
    .object({
      colorPalette: z.enum([
        "default",
        "ocean",
        "sunset",
        "forest",
        "lavender",
        "monochrome",
        "pastel",
        "corporate",
      ]).optional(),
      cardStyle: z.enum(["flat", "elevated", "bordered", "glass"]).optional(),
      cornerRadius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
      gridGap: z.enum(["compact", "normal", "spacious"]).optional(),
      fontFamily: z.enum(["default", "mono", "serif", "rounded"]).optional(),
      showShadows: z.boolean().optional(),
      useGradients: z.boolean().optional(),
    })
    .optional(),
  // Smart Analytics configuration
  analyticsRequest: z
    .object({
      type: z.enum(["insights", "forecast", "what_if"]),
      // For insights
      columns: z.array(z.string()).optional(), // Which columns to analyze
      // For forecast
      dateColumn: z.string().optional(),
      valueColumn: z.string().optional(),
      periods: z.number().optional(), // How many periods to forecast
      // For what-if
      baseMetric: z.string().optional(),
      adjustments: z.array(z.object({
        column: z.string(),
        changePercent: z.number(),
      })).optional(),
    })
    .optional(),
  // Analytics results (to be filled by server)
  analyticsResult: z.any().optional(),
  message: z.string(),
  // AI-generated follow-up question suggestions
  suggestedQuestions: z.array(z.string()).max(3).optional(),
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

    const { prompt, currentDashboard, schema, chatHistory = [] } = await req.json();

    // Get the current page ID and name for context
    const currentPageId = currentDashboard?.currentPageId;
    const currentPage = currentDashboard?.pages?.find((p: { id: string }) => p.id === currentPageId);
    const currentPageName = currentPage?.name || "Unknown";

    // Format chat history for context
    const conversationContext = chatHistory.length > 0 
      ? `\n=== CONVERSATION HISTORY (for context) ===\n${chatHistory.map((msg: { role: string; content: string; action?: string }) => 
          `${msg.role.toUpperCase()}: ${msg.content}${msg.action ? ` [Action: ${msg.action}]` : ''}`
        ).join('\n')}\n=== END CONVERSATION HISTORY ===\n`
      : '';

    // Compress dashboard for LLM context (reduces tokens significantly)
    const compressedDashboard = compressDashboardForLLM(currentDashboard);

    // Find all table charts in the current dashboard
    const tableCharts: Array<{pageId: string; chartId: string; title: string}> = [];
    let allColumnNames: string[] = [];
    
    if (currentDashboard?.pages) {
      for (const page of currentDashboard.pages) {
        for (const chart of (page.charts || [])) {
          if (chart.type === "table" || chart.type === "matrix") {
            tableCharts.push({
              pageId: page.id,
              chartId: chart.id,
              title: chart.title
            });
          }
        }
      }
    }
    
    // Get charts on current page for quick reference
    const currentPageCharts = currentPage?.charts?.map((c: { id: string; type: string; title: string }) => ({
      id: c.id,
      type: c.type,
      title: c.title
    })) || [];
    
    // Extract all available column names from schema
    if (schema?.columns) {
      allColumnNames = schema.columns.map((col: { name: string }) => col.name);
    }

    // Compress schema - only send column names and types, not full sample data
    const compressedSchema = schema?.columns ? {
      columns: schema.columns.map((col: { name: string; type: string; isMetric: boolean; isDimension: boolean }) => ({
        name: col.name,
        type: col.type,
        isMetric: col.isMetric,
        isDimension: col.isDimension,
      })),
      rowCount: schema.rowCount,
    } : schema;

    const systemPrompt = `You are an AI assistant that helps users modify their data dashboards. 
Based on the user's natural language request, determine what action to take and return the appropriate update configuration.
${conversationContext}
=== CONVERSATIONAL CONTEXT RULES ===
- Use the conversation history above to understand context and references
- If user says "make it bigger" or "change that one", refer to the LAST chart/action mentioned
- If user says "show me the same data but by region", apply to the most recently created/modified chart
- Support multi-step requests like "First add a bar chart, then make it blue" - execute the full sequence
- When user references "that chart", "the same one", "it", etc., use context to identify which chart

=== DATA INSIGHTS ===
- In your "message" field, include a brief insight about the data when relevant
- Example: "Added sales by region chart. 💡 Tip: The West region appears to have the highest values."
- Keep insights short (1 sentence) and only add when genuinely useful

=== DATA ETHICS & INTEGRITY RULES (CRITICAL) ===

You MUST refuse any request that attempts to manipulate, fake, or falsify data values. This is non-negotiable.

WHAT YOU CANNOT DO (use action: "reject" with rejectReason: "data_manipulation"):
- Change the actual VALUE displayed in a KPI card (e.g., "make sales show 20K instead of 18K")
- Fake or inflate numbers in any chart
- Modify the underlying data calculations to show false results
- "Round up" or "adjust" actual metric values
- Make a chart "show" a specific number that isn't the real computed value

WHAT YOU CAN DO (legitimate modifications):
- Change DISPLAY properties: colors, titles, sizes, positions, chart types
- Change AGGREGATION METHOD: sum → avg, count → max (this changes HOW data is calculated, not faking it)
- Change WHICH COLUMN is displayed: show Revenue instead of Profit
- Change GROUPING/AXIS: group by Region instead of Category
- Add/remove charts, pages, filters
- Sort and filter data (showing subset of REAL data)
- Change visual styling and formatting

EXAMPLE REJECTIONS:
- "Make the revenue card show 1 million" → REJECT (data manipulation)
- "Change 18K to 20K on the sales KPI" → REJECT (data manipulation)
- "Inflate the numbers by 10%" → REJECT (data manipulation)
- "Round up all values to look better" → REJECT (data manipulation)

EXAMPLE ACCEPTANCES:
- "Change the revenue card to show average instead of sum" → ACCEPT (changing aggregation method)
- "Show Profit instead of Revenue on that KPI" → ACCEPT (changing which column)
- "Make the KPI card blue" → ACCEPT (display property)
- "Change bar chart to show top 10 only" → ACCEPT (filtering real data)

For rejections, use this format:
{
  "action": "reject",
  "rejectReason": "data_manipulation",
  "message": "I can't change the displayed value from 18K to 20K as that would falsify the data. The KPI shows the actual sum from your dataset. However, I can help you: (1) change which column is displayed, (2) change the aggregation method (sum/avg/count), or (3) modify the visual styling. What would you like to do?"
}

=== END DATA ETHICS RULES ===

IMPORTANT - CURRENT PAGE CONTEXT:
- The user is currently viewing page: "${currentPageName}" (ID: ${currentPageId})
- Charts on current page: ${currentPageCharts.length > 0 ? JSON.stringify(currentPageCharts) : "None"}

CRITICAL RULE FOR PAGE CONTEXT:
- If the user does NOT specify a page name (like "first page", "Overview page", "all pages"), then ALWAYS apply changes to the CURRENT PAGE ONLY (${currentPageId})
- If user says "change bar chart color" without mentioning a page → target the bar chart on the CURRENT page "${currentPageName}"
- If user says "change bar chart color on Overview page" → target the bar chart on the Overview page
- If user says "change ALL bar charts" or "all pages" → use action "update_all_charts" (see below)
- NEVER default to the first page unless the user explicitly mentions "first page" or the first page name

Current Dashboard (all pages):
${JSON.stringify(compressedDashboard, null, 2)}

Available Table Charts:
${tableCharts.length > 0 ? JSON.stringify(tableCharts, null, 2) : "No table charts found"}

Available Column Names (for sorting and filtering):
${allColumnNames.length > 0 ? allColumnNames.join(", ") : "No columns found"}

Dataset Schema (compressed):
${JSON.stringify(compressedSchema, null, 2)}

User Request: "${prompt}"

Remember: The user is on page "${currentPageName}" (${currentPageId}). Unless they specify another page, apply changes to THIS page.

Analyze the request and return a JSON object with the following structure:

For adding a new chart:
{
  "action": "add_chart",
  "targetPageId": "page-id-where-to-add",
  "newChart": {
    "id": "chart-xyz123",
    "type": "bar",
    "title": "Descriptive Chart Title",
    "xAxis": "column_name",
    "yAxis": "column_name",
    "aggregation": "sum",
    "width": 2,
    "height": 2,
    "x": 0,
    "y": 0
  },
  "message": "Added a bar chart showing..."
}

For updating a chart (including sorting and filtering):
{
  "action": "update_chart",
  "targetPageId": "page-id-of-the-chart",
  "targetChartId": "chart-id-to-update",
  "chartUpdate": {
    "title": "New Title",
    "colors": ["#7c3aed", "#ef4444"],
    "sortBy": "column_name",
    "sortOrder": "desc",
    "filterColumn": "column_name",
    "filterValues": ["value1", "value2"]
  },
  "message": "Updated chart and sorted by column_name in descending order"
}

BULK UPDATE - For updating ALL charts of a type across ALL pages:
When user says "all bar charts", "every pie chart", "all charts", use this action:
{
  "action": "update_all_charts",
  "targetChartType": "bar",
  "chartUpdate": {
    "colors": ["#3b82f6"]
  },
  "message": "Updated all bar charts to blue across all pages"
}
- Use targetChartType: "bar", "line", "pie", "kpi", etc. to target specific chart types
- Use targetChartType: "all" to update every single chart
- This will apply the chartUpdate to ALL matching charts on ALL pages

Example - For resizing a chart:
{
  "action": "update_chart",
  "targetPageId": "page-overview",
  "targetChartId": "chart-id",
  "chartUpdate": {
    "width": 3,
    "height": 2
  },
  "message": "Resized the chart to be wider"
}

Example - For moving a chart:
{
  "action": "update_chart",
  "targetPageId": "page-overview",
  "targetChartId": "chart-id",
  "chartUpdate": {
    "x": 2,
    "y": 0
  },
  "message": "Moved the chart to a new position"
}

Example - For sorting a table by Sales descending:
{
  "action": "update_chart",
  "targetPageId": "page-overview",
  "targetChartId": "table-sales-data",
  "chartUpdate": {
    "sortBy": "Sales",
    "sortOrder": "desc"
  },
  "message": "Sorted the table by Sales in descending order (highest first)"
}

For deleting a chart:
{
  "action": "delete_chart",
  "targetPageId": "page-id-of-the-chart",
  "targetChartId": "chart-id-to-delete",
  "message": "Deleted the chart"
}

For adding a new page:
{
  "action": "add_page",
  "newPage": {
    "id": "page-xyz123",
    "name": "Descriptive Page Name",
    "charts": [],
    "showTitle": true
  },
  "message": "Added a new page called..."
}

For updating a page (name or title visibility):
{
  "action": "update_page",
  "targetPageId": "page-id-to-update",
  "pageUpdate": {
    "name": "New Page Name",
    "showTitle": true
  },
  "message": "Updated the page title"
}

For showing/hiding page title:
{
  "action": "update_page",
  "targetPageId": "current-page-id",
  "pageUpdate": {
    "showTitle": true
  },
  "message": "Now showing the page title"
}

For deleting a page:
{
  "action": "delete_page",
  "targetPageId": "page-id-to-delete",
  "message": "Deleted the page"
}

For updating dashboard styling (colors, fonts, layouts):
{
  "action": "update_dashboard_style",
  "styleUpdate": {
    "colorPalette": "ocean",
    "cardStyle": "elevated",
    "cornerRadius": "lg",
    "gridGap": "spacious",
    "showShadows": true,
    "useGradients": false
  },
  "message": "Applied ocean color theme with elevated cards and rounded corners"
}

Available color palettes: "default", "ocean", "sunset", "forest", "lavender", "monochrome", "pastel", "corporate"
Available card styles: "flat", "elevated", "bordered", "glass"
Available corner radius: "none", "sm", "md", "lg", "full"
Available grid gaps: "compact", "normal", "spacious"
Available font families: "default", "mono", "serif", "rounded"

When user asks about styling (e.g., "make it look more professional", "use blue colors", "modern look"):
- "professional/corporate" → colorPalette: "corporate", cardStyle: "bordered"
- "colorful/vibrant" → colorPalette: "sunset" or "default"
- "minimal/clean" → colorPalette: "monochrome", cardStyle: "flat", cornerRadius: "none"
- "modern/sleek" → cardStyle: "glass", cornerRadius: "lg", showShadows: true
- "blue/ocean theme" → colorPalette: "ocean"
- "dark theme" → this is handled by update_theme, not styling
- "pastel/soft colors" → colorPalette: "pastel"
- "nature/green" → colorPalette: "forest"

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
- table: Data table (supports "columns" property to specify which columns to display)
- matrix: Pivot table with drill-down

IMPORTANT FOR KPI CARDS:
- When adding or updating a KPI card, ALWAYS include "trend" ("up", "down", or "flat") and "trendValue" (number like 8.5 for 8.5%)
- Analyze the data context to determine realistic trend values
- trendValue should be a reasonable percentage (typically 0-30%)

IMPORTANT FOR TABLE CHARTS:
- Use the "columns" property (array of column names) to specify which columns to display
- To show specific columns: "columns": ["Product", "Sales", "Quantity"]
- To add a column: include all existing columns plus the new one in "columns" array
- To remove a column: include all columns except the one to remove in "columns" array
- If user asks to "show only X and Y columns", set columns to ["X", "Y"]
- Column names must match exactly with "Available Column Names" (case-sensitive)

CRITICAL RULES:
- When action is "add_chart", you MUST include a complete newChart object with ALL required fields: id, type, title, width, height, x, y
- When action is "add_page", generate a new page with an appropriate descriptive name based on the data (e.g., "Sales Analysis", "Regional Performance", "Trends")
- When user asks to sort/order a table:
  * Look at "Available Column Names" and find the column that matches the user's request (case-insensitive matching)
  * For example, if user says "sort by sales", look for columns like "Sales", "sales", "SALES", "Total Sales", etc.
  * Use the EXACT column name from the "Available Column Names" list
  * Find the table chart they're referring to in the "Available Table Charts" list
  * Use the exact pageId and chartId from that list
  * Include targetPageId, targetChartId, and chartUpdate with sortBy (exact column name) and sortOrder in your response
  * sortOrder must be "asc" (ascending) or "desc" (descending) - if user says "descending", "highest first", "most", "highest", "largest", use "desc"; otherwise use "asc"
  * Include a clear message like "Sorted by {column} in {order} order"
- For filtering requests, use filterColumn and filterValues to filter data
- For sorting requests, if there's only one table, target that one. If multiple tables, try to find the most relevant one
- IMPORTANT: sortBy MUST be an exact column name from the "Available Column Names" list - never hardcode or guess column names

RESIZING CHARTS:
- When user asks to make a chart "bigger", "larger", "wider", increase width (max 4) or height (max 4)
- When user asks to make a chart "smaller", "narrower", decrease width (min 1) or height (min 1)
- "full width" = width: 4
- "half width" = width: 2
- "quarter width" = width: 1
- "taller" = increase height
- "shorter" = decrease height

TITLE POSITION:
- Each chart can have its title at "top" (default) or "bottom"
- Use titlePosition: "top" for title above the chart
- Use titlePosition: "bottom" for title below the chart (caption style)
- When user asks to "move title to bottom", "put title at bottom", "show title below", set titlePosition: "bottom"
- When user asks to "move title to top", "put title at top", "show title above", set titlePosition: "top"

PAGE TITLE (centered heading):
- Each page can have a centered title shown at the top of the canvas
- Use showTitle: true to show the page name as a centered title
- Use showTitle: false to hide the page title
- When user asks to "show page title", "add page title", "show heading", use action: "update_page" with showTitle: true
- When user asks to "hide page title", "remove page title", "hide heading", use action: "update_page" with showTitle: false
- To rename a page, use pageUpdate with "name" property

MOVING/REORDERING CHARTS:
- When user asks to "move", "swap", or "reorder" charts, update the x and y positions
- x ranges from 0-3 (column position)
- y represents row position (0, 1, 2, etc.)

=== DATA TRANSFORMATION (Advanced) ===
When user asks to clean, transform, or modify data structure, use action: "transform_data" with dataTransform object:

Example - Remove null values:
{
  "action": "transform_data",
  "dataTransform": {
    "operation": "remove_nulls",
    "column": "Sales"
  },
  "message": "Removed rows with null values in the Sales column",
  "suggestedQuestions": ["Fill nulls with average", "Show data summary"]
}

Example - Rename column:
{
  "action": "transform_data",
  "dataTransform": {
    "operation": "rename_column",
    "column": "old_name",
    "newName": "new_name"
  },
  "message": "Renamed column 'old_name' to 'new_name'"
}

Example - Change column type:
{
  "action": "transform_data",
  "dataTransform": {
    "operation": "change_type",
    "column": "Date",
    "newType": "datetime"
  },
  "message": "Changed 'Date' column type to datetime"
}

Example - Create calculated column:
{
  "action": "transform_data",
  "dataTransform": {
    "operation": "create_calculated",
    "newName": "Profit_Margin",
    "formula": "Profit / Sales * 100"
  },
  "message": "Created calculated column 'Profit_Margin' = Profit / Sales * 100"
}

=== DATA RELATIONSHIPS ===
When user asks to join tables, create relationships, or link data:

Example - Create relationship:
{
  "action": "create_relation",
  "relationCreate": {
    "sourceTable": "sales_data",
    "targetTable": "customers_data",
    "sourceColumn": "Customer_ID",
    "targetColumn": "ID",
    "cardinality": "many-to-one"
  },
  "message": "Created relationship between sales_data and customers_data on Customer_ID → ID (Many to One)"
}

=== SMART ANALYTICS ===
When user asks about insights, trends, anomalies, predictions, or what-if scenarios:

Example - Generate Insights (detect anomalies, trends, correlations):
User: "analyze my sales data", "find insights", "what's interesting about my data", "detect anomalies"
{
  "action": "generate_insights",
  "analyticsRequest": {
    "type": "insights",
    "columns": ["Sales", "Profit", "Quantity"]
  },
  "message": "Analyzing your data for insights, trends, and anomalies..."
}

Example - Generate Forecast (predict future values):
User: "predict next quarter sales", "forecast profit for next 6 months", "what will revenue be next year"
{
  "action": "generate_forecast",
  "analyticsRequest": {
    "type": "forecast",
    "dateColumn": "Date",
    "valueColumn": "Sales",
    "periods": 6
  },
  "message": "Generating a 6-period forecast for Sales..."
}

Example - What-If Scenario:
User: "what if price increases by 10%", "show me sales if we cut costs by 20%", "simulate 15% growth"
{
  "action": "run_what_if",
  "analyticsRequest": {
    "type": "what_if",
    "baseMetric": "Profit",
    "adjustments": [
      {"column": "Price", "changePercent": 10}
    ]
  },
  "message": "Running what-if scenario: Price +10% → Impact on Profit"
}

- Chart/Page IDs must be unique, use format: "chart-" + random string or "page-" + random string
- Only use column names that exist in the schema
- For KPI charts: only set yAxis (no xAxis)
- For bar/line/area charts: set both xAxis and yAxis
- Chart sizes: width 1-4, height 1-4
- Position: x: 0-3, y: calculate based on existing charts
- Colors as hex: "#7c3aed" (purple), "#ef4444" (red), "#22c55e" (green), "#3b82f6" (blue), "#f59e0b" (amber), "#06b6d4" (cyan)
- Always include a friendly "message" field

FINAL REMINDER - PAGE CONTEXT:
⚠️ The user is currently on page "${currentPageName}" (ID: ${currentPageId}).
⚠️ Unless the user EXPLICITLY mentions another page by name (e.g., "on Overview page", "on the first page", "on all pages"), you MUST use targetPageId: "${currentPageId}"
⚠️ If there are multiple charts of the same type on the current page, pick the first one or ask for clarification in the message.

=== SUGGESTED FOLLOW-UP QUESTIONS ===
After completing the user's request, include a "suggestedQuestions" array with 2-3 helpful follow-up prompts the user might want to ask next.

These should be:
- Relevant to what the user just did (e.g., if they added a bar chart, suggest customizing it)
- Specific to their data columns and current dashboard state
- Action-oriented and concise (under 10 words each)
- Different from what they just asked

Examples:
- After adding a chart: ["Add a trend line", "Group by region", "Change to pie chart"]
- After changing colors: ["Make it larger", "Add a title", "Show top 10 only"]
- After sorting: ["Filter by category", "Add another column", "Export to table"]

Return ONLY valid JSON, no markdown, no explanation, no code blocks.`;

    // Track token usage
    const startTime = Date.now();
    const inputTokens = estimateTokens(systemPrompt);

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: systemPrompt,
    });

    // Log token usage
    const outputTokens = estimateTokens(text);
    logTokenUsage({
      timestamp: Date.now(),
      endpoint: '/api/prompt',
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model: 'llama-3.3-70b-versatile',
      latencyMs: Date.now() - startTime,
    });

    console.log("AI Response:", text); // Debug log

    // Extract JSON from potential markdown code blocks
    const cleanedText = extractJSON(text);
    
    console.log("Cleaned JSON:", cleanedText); // Debug log
    
    // Parse the JSON response
    const result = JSON.parse(cleanedText);
    
    console.log("Parsed result:", result); // Debug log
    
    // Validate with zod schema (will apply defaults for missing fields)
    const validatedResult = updateSchema.parse(result);
    
    console.log("Validated result:", validatedResult); // Debug log
    
    // Handle analytics actions - run the actual analysis on the server
    if (validatedResult.action === "generate_insights" && validatedResult.analyticsRequest) {
      try {
        const insights = generateInsights(
          rawData,
          validatedResult.analyticsRequest.columns || Object.keys(rawData[0] || {})
        );
        (validatedResult as any).analyticsResult = insights;
        (validatedResult as any).message = `Found ${insights.length} insights in your data.`;
      } catch (e) {
        console.error("Insights generation error:", e);
        (validatedResult as any).message = "Could not generate insights. Please check your data.";
      }
    }
    
    if (validatedResult.action === "generate_forecast" && validatedResult.analyticsRequest) {
      try {
        const req = validatedResult.analyticsRequest;
        const forecast = generateForecast(
          rawData,
          req.dateColumn || "Date",
          req.valueColumn || "Sales",
          req.periods || 6
        );
        (validatedResult as any).analyticsResult = forecast;
        (validatedResult as any).message = `Generated ${forecast.predictions.length}-period forecast for ${req.valueColumn || "Sales"}.`;
      } catch (e) {
        console.error("Forecast generation error:", e);
        (validatedResult as any).message = "Could not generate forecast. Please check your data has a date column and numeric values.";
      }
    }
    
    if (validatedResult.action === "run_what_if" && validatedResult.analyticsRequest) {
      try {
        const req = validatedResult.analyticsRequest;
        const whatIf = runWhatIfScenario(
          rawData,
          req.baseMetric || "Profit",
          req.adjustments || []
        );
        (validatedResult as any).analyticsResult = whatIf;
        const adjustmentDesc = (req.adjustments || [])
          .map(a => `${a.column} ${a.changePercent > 0 ? '+' : ''}${a.changePercent}%`)
          .join(", ");
        (validatedResult as any).message = `What-if analysis: ${adjustmentDesc} → ${whatIf.baseMetric} changes from ${whatIf.originalValue.toFixed(2)} to ${whatIf.projectedValue.toFixed(2)} (${whatIf.changePercent > 0 ? '+' : ''}${whatIf.changePercent.toFixed(1)}%)`;
      } catch (e) {
        console.error("What-if analysis error:", e);
        (validatedResult as any).message = "Could not run what-if analysis. Please check your data has numeric columns.";
      }
    }
    
    return Response.json(validatedResult);
  } catch (error) {
    console.error("Prompt error:", error);
    
    // Handle Zod validation errors with user-friendly messages
    if (error instanceof ZodError) {
      const friendlyMessage = formatZodError(error);
      console.error("Validation error:", error.issues);
      return Response.json(
        { 
          error: "Validation failed", 
          details: friendlyMessage 
        },
        { status: 400 }
      );
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error("JSON parse error:", error.message);
      return Response.json(
        { 
          error: "Failed to process", 
          details: "I had trouble understanding that request. Please try rephrasing it." 
        },
        { status: 400 }
      );
    }
    
    // Handle other errors
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    
    return Response.json(
      { 
        error: "Failed to process prompt", 
        details: "Something went wrong. Please try again with a different request." 
      },
      { status: 500 }
    );
  }
}