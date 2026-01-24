import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { z, ZodError } from "zod";

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
    "add_chart",
    "delete_chart",
    "add_page",
    "update_page",
    "delete_page",
    "update_theme",
    "add_filter",
    "sort_data",
    "filter_data",
  ]),
  targetChartId: z.string().optional(),
  targetPageId: z.string().optional(),
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
  message: z.string(),
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

    const { prompt, currentDashboard, schema } = await req.json();

    // Find all table charts in the current dashboard
    const tableCharts: Array<{pageId: string; chartId: string; title: string}> = [];
    let allColumnNames: string[] = [];
    
    if (currentDashboard?.pages) {
      for (const page of currentDashboard.pages) {
        for (const chart of page.charts) {
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
    
    // Extract all available column names from schema
    if (schema?.columns) {
      allColumnNames = schema.columns.map((col: { name: string }) => col.name);
    }

    const systemPrompt = `You are an AI assistant that helps users modify their data dashboards. 
Based on the user's natural language request, determine what action to take and return the appropriate update configuration.

Current Dashboard:
${JSON.stringify(currentDashboard, null, 2)}

Available Table Charts:
${tableCharts.length > 0 ? JSON.stringify(tableCharts, null, 2) : "No table charts found"}

Available Column Names (for sorting and filtering):
${allColumnNames.length > 0 ? allColumnNames.join(", ") : "No columns found"}

Dataset Schema:
${JSON.stringify(schema, null, 2)}

User Request: "${prompt}"

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

- Chart/Page IDs must be unique, use format: "chart-" + random string or "page-" + random string
- Only use column names that exist in the schema
- For KPI charts: only set yAxis (no xAxis)
- For bar/line/area charts: set both xAxis and yAxis
- Chart sizes: width 1-4, height 1-4
- Position: x: 0-3, y: calculate based on existing charts
- Colors as hex: "#7c3aed" (purple), "#ef4444" (red), "#22c55e" (green), "#3b82f6" (blue), "#f59e0b" (amber), "#06b6d4" (cyan)
- Always include a friendly "message" field

Return ONLY valid JSON, no markdown, no explanation, no code blocks.`;

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: systemPrompt,
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