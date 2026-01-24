import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColumnType = "numeric" | "categorical" | "datetime" | "text";

export interface Column {
  name: string;
  type: ColumnType;
  sample: string[];
  uniqueCount: number;
  nullCount: number;
  isMetric: boolean;
  isDimension: boolean;
}

export interface DataSchema {
  columns: Column[];
  rowCount: number;
  summary: string;
}

export type ChartType =
  // KPI & Single Value Visuals
  | "kpi"
  | "card"
  | "multi-row-card"
  | "gauge"
  // Bar & Column Charts
  | "bar"
  | "stacked-bar"
  | "clustered-bar"
  | "100-stacked-bar"
  | "column"
  | "stacked-column"
  | "clustered-column"
  | "100-stacked-column"
  // Line, Area & Combination Charts
  | "line"
  | "area"
  | "stacked-area"
  | "100-stacked-area"
  | "combo"
  | "line-clustered-column"
  | "line-stacked-column"
  // Pie & Donut Charts
  | "pie"
  | "donut"
  // Scatter & Distribution Charts
  | "scatter"
  | "bubble"
  | "histogram"
  | "box-plot"
  // Table & Matrix Visuals
  | "table"
  | "matrix"
  // Map & Geo Spatial Visuals
  | "map"
  | "filled-map"
  | "bubble-map"
  // Advanced & Specialized Visuals
  | "heatmap"
  | "treemap"
  | "waterfall"
  | "funnel"
  | "radar"
  | "ribbon"
  | "sankey"
  | "bullet"
  // Filtering & Interaction Visuals
  | "slicer"
  | "list-slicer"
  | "dropdown-slicer"
  | "date-slicer"
  | "numeric-slicer";

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  filters?: Record<string, string[]>;
  colors?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filterColumn?: string;
  filterValues?: string[];
  // Trend data for KPI cards (should come from LLM analysis)
  trend?: "up" | "down" | "flat";
  trendValue?: number;
  // Columns to display in table/matrix (if not set, show all columns)
  columns?: string[];
  // Title position: top or bottom (default: top)
  titlePosition?: "top" | "bottom";
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface DashboardPage {
  id: string;
  name: string;
  charts: ChartConfig[];
  // Optional centered page title
  showTitle?: boolean;
}

export interface FilterState {
  column: string;
  values: string[];
}

export interface DataSource {
  id: string;
  name: string;
  data: Record<string, unknown>[];
  schema: DataSchema;
}

export interface DataRelation {
  id: string;
  sourceId: string;
  targetId: string;
  sourceColumn: string;
  targetColumn: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  dataSources: DataSource[];
  relations: DataRelation[];
  pages: DashboardPage[];
}

interface DashboardState {
  // Project Management
  projects: Project[];
  currentProjectId: string | null;
  
  // Data
  rawData: Record<string, unknown>[] | null;
  schema: DataSchema | null;
  fileName: string | null;
  
  // Multiple Data Sources
  dataSources: DataSource[];
  relations: DataRelation[];

  // Dashboard
  pages: DashboardPage[];
  currentPageId: string | null;
  filters: FilterState[];

  // UI
  theme: "light" | "dark";
  isLoading: boolean;
  aiMessage: string | null;
  promptHistory: string[];
  sidebarCollapsed: boolean;
  currentView: "home" | "upload" | "dashboard" | "relations";

  // Project Actions
  createProject: (name: string) => string;
  openProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  saveCurrentProject: () => void;
  
  // Data Source Actions
  addDataSource: (name: string, data: Record<string, unknown>[], schema: DataSchema) => string;
  removeDataSource: (id: string) => void;
  
  // Relation Actions
  addRelation: (relation: Omit<DataRelation, "id">) => void;
  removeRelation: (id: string) => void;

  // Data Actions
  setRawData: (data: Record<string, unknown>[], fileName: string) => void;
  setSchema: (schema: DataSchema) => void;
  setPages: (pages: DashboardPage[]) => void;
  setCurrentPage: (pageId: string) => void;
  addPage: (page: DashboardPage) => void;
  updatePage: (pageId: string, updates: Partial<DashboardPage>) => void;
  deletePage: (pageId: string) => void;
  updateChart: (
    pageId: string,
    chartId: string,
    updates: Partial<ChartConfig>
  ) => void;
  addChart: (pageId: string, chart: ChartConfig) => void;
  deleteChart: (pageId: string, chartId: string) => void;
  setFilters: (filters: FilterState[]) => void;
  toggleTheme: () => void;
  setIsLoading: (loading: boolean) => void;
  setAiMessage: (message: string | null) => void;
  addToPromptHistory: (prompt: string) => void;
  toggleSidebar: () => void;
  setCurrentView: (view: "home" | "upload" | "dashboard" | "relations") => void;
  reset: () => void;
}

const initialState = {
  projects: [] as Project[],
  currentProjectId: null as string | null,
  rawData: null as Record<string, unknown>[] | null,
  schema: null as DataSchema | null,
  fileName: null as string | null,
  dataSources: [] as DataSource[],
  relations: [] as DataRelation[],
  pages: [] as DashboardPage[],
  currentPageId: null as string | null,
  filters: [] as FilterState[],
  theme: "dark" as const,
  isLoading: false,
  aiMessage: null as string | null,
  promptHistory: [] as string[],
  sidebarCollapsed: false,
  currentView: "home" as const,
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      createProject: (name: string) => {
        const id = `project-${Date.now()}`;
        const newProject: Project = {
          id,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dataSources: [],
          relations: [],
          pages: [],
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: id,
          currentView: "upload",
          rawData: null,
          schema: null,
          fileName: null,
          dataSources: [],
          relations: [],
          pages: [],
          currentPageId: null,
        }));
        return id;
      },

      openProject: (projectId: string) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        
        if (project) {
          // Validate pages and dataSources before setting
          const validPages = Array.isArray(project.pages) ? project.pages : [];
          const validDataSources = Array.isArray(project.dataSources) ? project.dataSources : [];
          const validRelations = Array.isArray(project.relations) ? project.relations : [];
          
          console.log("Opening project:", projectId, {
            pages: validPages.length,
            dataSources: validDataSources.length,
          });
          
          set({
            currentProjectId: projectId,
            dataSources: validDataSources,
            relations: validRelations,
            pages: validPages,
            currentPageId: validPages.length > 0 ? validPages[0].id : null,
            rawData: validDataSources.length > 0 ? validDataSources[0].data : null,
            schema: validDataSources.length > 0 ? validDataSources[0].schema : null,
            fileName: validDataSources.length > 0 ? validDataSources[0].name : null,
            currentView: validPages.length > 0 ? "dashboard" : "upload",
            isLoading: false,
            aiMessage: null,
          });
          
          // Force zustand to persist the state
          if (typeof window !== "undefined") {
            setTimeout(() => {
              useDashboardStore.persist.rehydrate();
            }, 50);
          }
        } else {
          console.warn("Project not found:", projectId);
        }
      },

      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          ...(state.currentProjectId === projectId
            ? {
                currentProjectId: null,
                rawData: null,
                schema: null,
                fileName: null,
                dataSources: [],
                relations: [],
                pages: [],
                currentPageId: null,
                currentView: "home",
              }
            : {}),
        }));
      },

      saveCurrentProject: () => {
        const state = get();
        if (!state.currentProjectId) return;
        
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  dataSources: s.dataSources,
                  relations: s.relations,
                  pages: s.pages,
                }
              : p
          ),
        }));
      },

      addDataSource: (name, data, schema) => {
        const id = `datasource-${Date.now()}`;
        const newDataSource: DataSource = { id, name, data, schema };
        set((state) => ({
          dataSources: [...state.dataSources, newDataSource],
          rawData: state.rawData || data,
          schema: state.schema || schema,
          fileName: state.fileName || name,
        }));
        get().saveCurrentProject();
        return id;
      },

      removeDataSource: (id) => {
        set((state) => {
          const newDataSources = state.dataSources.filter((ds) => ds.id !== id);
          const newRelations = state.relations.filter(
            (r) => r.sourceId !== id && r.targetId !== id
          );
          return {
            dataSources: newDataSources,
            relations: newRelations,
            rawData: newDataSources[0]?.data || null,
            schema: newDataSources[0]?.schema || null,
            fileName: newDataSources[0]?.name || null,
          };
        });
        get().saveCurrentProject();
      },

      addRelation: (relation) => {
        const id = `relation-${Date.now()}`;
        set((state) => ({
          relations: [...state.relations, { ...relation, id }],
        }));
        get().saveCurrentProject();
      },

      removeRelation: (id) => {
        set((state) => ({
          relations: state.relations.filter((r) => r.id !== id),
        }));
        get().saveCurrentProject();
      },

      setRawData: (data, fileName) => {
        set({ rawData: data, fileName });
        // Also add as data source if we have a current project
        const state = get();
        if (state.currentProjectId && data.length > 0) {
          const schema = state.schema;
          if (schema) {
            const existingSource = state.dataSources.find((ds) => ds.name === fileName);
            if (!existingSource) {
              get().addDataSource(fileName, data, schema);
            }
          }
        }
      },

      setSchema: (schema) => set({ schema }),

      setPages: (pages) => {
        if (!Array.isArray(pages)) {
          console.error("setPages received non-array value:", pages);
          return;
        }
        console.log("Setting pages:", pages.length);
        set({ pages, currentPageId: pages.length > 0 ? pages[0].id : null });
        // Save immediately to ensure persistence
        setTimeout(() => {
          console.log("Saving project after setPages");
          get().saveCurrentProject();
        }, 0);
      },

      setCurrentPage: (pageId) => set({ currentPageId: pageId }),

      addPage: (page) => {
        set((state) => ({
          pages: [...state.pages, page],
          currentPageId: page.id,
        }));
        get().saveCurrentProject();
      },

      updatePage: (pageId, updates) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId ? { ...p, ...updates } : p
          ),
        }));
        get().saveCurrentProject();
      },

      deletePage: (pageId) => {
        set((state) => {
          const newPages = state.pages.filter((p) => p.id !== pageId);
          return {
            pages: newPages,
            currentPageId:
              state.currentPageId === pageId
                ? newPages[0]?.id || null
                : state.currentPageId,
          };
        });
        get().saveCurrentProject();
      },

      updateChart: (pageId, chartId, updates) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  charts: p.charts.map((c) =>
                    c.id === chartId ? { ...c, ...updates } : c
                  ),
                }
              : p
          ),
        }));
        get().saveCurrentProject();
      },

      addChart: (pageId, chart) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId ? { ...p, charts: [...p.charts, chart] } : p
          ),
        }));
        get().saveCurrentProject();
      },

      deleteChart: (pageId, chartId) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId
              ? { ...p, charts: p.charts.filter((c) => c.id !== chartId) }
              : p
          ),
        }));
        get().saveCurrentProject();
      },

      setFilters: (filters) => set({ filters }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),

      setIsLoading: (isLoading) => set({ isLoading }),

      setAiMessage: (aiMessage) => set({ aiMessage }),

      addToPromptHistory: (prompt) =>
        set((state) => ({
          promptHistory: [prompt, ...state.promptHistory].slice(0, 50),
        })),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCurrentView: (currentView) => set({ currentView }),

      reset: () =>
        set({
          ...initialState,
          projects: get().projects,
          theme: get().theme,
        }),
    }),
    {
      name: "ai-analyst-storage",
      partialize: (state) => ({
        projects: state.projects,
        theme: state.theme,
        currentProjectId: state.currentProjectId,
        currentView: state.currentView,
        dataSources: state.dataSources,
        relations: state.relations,
        pages: state.pages,
        currentPageId: state.currentPageId,
        schema: state.schema,
        fileName: state.fileName,
        // Note: Not persisting rawData (too large) - will be restored from dataSources
      }),
    }
  )
);
