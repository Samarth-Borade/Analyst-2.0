import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, dashboardApi, promptApi, getToken, userApi, dataSourceApi } from "./api";
import { startFirebaseSync, stopAllFirebaseSyncs } from "./firebase-sync";

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
  // Axis titles for charts with X and Y axes
  xAxisTitle?: string;
  yAxisTitle?: string;
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
  // Formula for calculated metrics (e.g., "Cost / Sales" for cost per sale)
  // Supports: column names, +, -, *, /, parentheses, and numbers
  formula?: string;
  // Human-readable name for the formula result (e.g., "Cost Per Sale")
  formulaLabel?: string;
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
  // User overrides for column types (smart type detection)
  columnTypeOverrides?: Record<string, ColumnType>;
  // Firebase connection info for live sync
  firebaseConfig?: {
    connectionId: string;
    path: string;
    databaseType: 'firestore' | 'realtime';
  };
}

export interface DataRelation {
  id: string;
  sourceId: string;
  targetId: string;
  sourceColumn: string;
  targetColumn: string;
  // Relationship cardinality like Power BI
  cardinality: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  // Whether columns were manually matched by user (even if names differ)
  isManualMatch?: boolean;
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
  // Auth
  isAuthenticated: boolean;
  user: { id: string; email: string; fullName: string } | null;
  
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

  // What-If Scenario Mode
  whatIfMode: boolean;
  whatIfScenario: {
    field: string;
    changePercent: number;
    originalData: Record<string, unknown>[] | null;
  } | null;

  // UI
  theme: "light" | "dark";
  isLoading: boolean;
  aiMessage: string | null;
  promptHistory: string[];
  sidebarCollapsed: boolean;
  currentView: "home" | "upload" | "dashboard" | "relations" | "data" | "data-modeling";
  
  // Data Preview (for column selection during upload)
  previewData: Record<string, unknown>[] | null;
  selectedColumns: string[];
  
  // Pending prompt from chart picker
  pendingPrompt: string | null;
  
  // AI Suggested Follow-up Questions
  suggestedQuestions: string[];
  
  // Conversational Context Memory
  chatHistory: Array<{ role: "user" | "assistant"; content: string; action?: string }>;

  // Project Actions
  createProject: (name: string) => string;
  openProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => void;
  closeProject: () => void;
  saveCurrentProject: () => void;
  
  // Auth Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName?: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  
  // Backend Sync Actions
  syncProjectsFromBackend: () => Promise<void>;
  syncProjectToBackend: (projectId: string) => Promise<string | undefined>;
  initializeFromBackend: () => Promise<void>;
  savePromptToBackend: (promptText: string, dashboardId?: string) => Promise<void>;
  
  // Data Source Actions
  addDataSource: (name: string, data: Record<string, unknown>[], schema: DataSchema, firebaseConfig?: DataSource['firebaseConfig']) => string;
  removeDataSource: (id: string) => void;
  updateDataSourceData: (id: string, data: Record<string, unknown>[], schema?: DataSchema) => void;
  
  // Relation Actions
  addRelation: (relation: Omit<DataRelation, "id">) => void;
  removeRelation: (id: string) => void;
  updateRelation: (id: string, updates: Partial<DataRelation>) => void;
  
  // Column Type Override Actions (Smart Type Detection)
  updateColumnType: (dataSourceId: string, columnName: string, newType: ColumnType) => void;

  // Data Transformation Actions
  createCalculatedColumn: (dataSourceId: string | undefined, columnName: string, formula: string) => boolean;

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
  setCurrentView: (view: "home" | "upload" | "dashboard" | "relations" | "data" | "data-modeling") => void;
  
  // Data Preview Actions
  setPreviewData: (data: Record<string, unknown>[] | null) => void;
  setSelectedColumns: (columns: string[]) => void;
  toggleColumn: (column: string) => void;
  
  // Pending Prompt Actions
  setPendingPrompt: (prompt: string | null) => void;
  
  // Suggested Questions Actions
  setSuggestedQuestions: (questions: string[]) => void;
  
  // Chat History Actions (Conversational Memory)
  addToChatHistory: (message: { role: "user" | "assistant"; content: string; action?: string }) => void;
  clearChatHistory: () => void;
  
  // What-If Scenario Actions
  applyWhatIfScenario: (field: string, changePercent: number) => void;
  exitWhatIfMode: () => void;
  
  reset: () => void;
}

const initialState = {
  isAuthenticated: false,
  user: null as { id: string; email: string; fullName: string } | null,
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
  whatIfMode: false,
  whatIfScenario: null as { field: string; changePercent: number; originalData: Record<string, unknown>[] | null } | null,
  theme: "dark" as const,
  isLoading: false,
  aiMessage: null as string | null,
  promptHistory: [] as string[],
  sidebarCollapsed: false,
  currentView: "home" as const,
  previewData: null as Record<string, unknown>[] | null,
  selectedColumns: [] as string[],
  pendingPrompt: null as string | null,
  suggestedQuestions: [] as string[],
  chatHistory: [] as Array<{ role: "user" | "assistant"; content: string; action?: string }>,
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
        set((s) => ({
          projects: [...s.projects, newProject],
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
        
        // Sync to backend if authenticated
        const currentState = get();
        if (currentState.isAuthenticated) {
          dashboardApi.create({
            title: name,
            description: "",
            configuration: { dataSources: [], relations: [], pages: [] },
          }).then((dashboard) => {
            // Update project with backend ID
            set((s) => ({
              projects: s.projects.map((p) =>
                p.id === id ? { ...p, id: dashboard.id } : p
              ),
              currentProjectId: dashboard.id,
            }));
          }).catch((err) => console.error("Failed to sync project:", err));
        }
        
        return id;
      },

      // Auth methods
      login: async (email: string, password: string) => {
        try {
          const data = await authApi.login(email, password);
          set({ isAuthenticated: true, user: data.user });
          // Fetch projects from backend after login
          get().syncProjectsFromBackend();
          return true;
        } catch (error) {
          console.error("Login failed:", error);
          return false;
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        try {
          const data = await authApi.register(email, password, fullName);
          set({ isAuthenticated: true, user: data.user });
          return true;
        } catch (error) {
          console.error("Registration failed:", error);
          return false;
        }
      },

      logout: () => {
        authApi.logout();
        set({ isAuthenticated: false, user: null });
      },

      checkAuth: () => {
        const hasToken = !!getToken();
        set({ isAuthenticated: hasToken });
        if (hasToken) {
          get().syncProjectsFromBackend();
        }
      },

      syncProjectsFromBackend: async () => {
        try {
          const dashboards = await dashboardApi.list();
          const backendProjects: Project[] = dashboards.map((d) => ({
            id: d.id,
            name: d.title,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            dataSources: (d.configuration?.dataSources as DataSource[]) || [],
            relations: (d.configuration?.relations as DataRelation[]) || [],
            pages: (d.configuration?.pages as DashboardPage[]) || [],
          }));
          
          // Merge with local projects (keep local if not authenticated)
          const state = get();
          const localOnlyProjects = state.projects.filter(
            (p) => !backendProjects.find((bp) => bp.id === p.id)
          );
          
          set({ projects: [...backendProjects, ...localOnlyProjects] });
        } catch (error) {
          console.error("Failed to sync projects from backend:", error);
        }
      },

      syncProjectToBackend: async (projectId: string): Promise<string | undefined> => {
        const state = get();
        if (!state.isAuthenticated) {
          console.log("⚠️ syncProjectToBackend: Not authenticated, skipping");
          return undefined;
        }
        
        const project = state.projects.find((p) => p.id === projectId);
        if (!project) {
          console.log("⚠️ syncProjectToBackend: Project not found locally:", projectId);
          return undefined;
        }
        
        console.log("🔄 syncProjectToBackend: Syncing project:", projectId, project.name);
        
        const configuration = {
          dataSources: project.dataSources.map((ds) => ({
            id: ds.id,
            name: ds.name,
            schema: ds.schema,
            // Don't store raw data in backend config - too large
          })),
          relations: project.relations,
          pages: project.pages,
        };
        
        try {
          // Try to update first
          console.log("🔄 syncProjectToBackend: Attempting update...");
          await dashboardApi.update(projectId, {
            title: project.name,
            configuration,
          });
          console.log("✅ syncProjectToBackend: Update succeeded");
          return projectId; // Return same ID if update succeeded
        } catch (error: any) {
          const errorMsg = error?.message?.toLowerCase() || "";
          console.log("⚠️ syncProjectToBackend: Update failed:", error?.message);
          
          // If update fails (dashboard doesn't exist), try to create it
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            try {
              console.log("🔄 syncProjectToBackend: Creating new dashboard...");
              const dashboard = await dashboardApi.create({
                title: project.name,
                description: "",
                configuration,
              });
              // Update local project with new backend ID
              set((s) => ({
                projects: s.projects.map((p) =>
                  p.id === projectId ? { ...p, id: dashboard.id } : p
                ),
                currentProjectId: s.currentProjectId === projectId ? dashboard.id : s.currentProjectId,
              }));
              console.log("✅ Dashboard created in backend with ID:", dashboard.id);
              return dashboard.id; // Return new ID
            } catch (createError) {
              console.error("❌ Failed to create dashboard in backend:", createError);
              throw createError;
            }
          } else {
            console.error("❌ Failed to sync project to backend:", error);
            throw error;
          }
        }
      },

      initializeFromBackend: async () => {
        // Safety check for SSR
        if (typeof window === 'undefined') return;
        
        const hasToken = !!getToken();
        if (!hasToken) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          // Verify token and get user profile
          const user = await userApi.getProfile();
          set({ 
            isAuthenticated: true, 
            user: { id: user.id, email: user.email, fullName: user.fullName } 
          });

          // Fetch all dashboards/projects from backend
          const dashboards = await dashboardApi.list();
          const backendProjects: Project[] = dashboards.map((d) => ({
            id: d.id,
            name: d.title,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
            dataSources: Array.isArray(d.configuration?.dataSources) ? (d.configuration.dataSources as DataSource[]) : [],
            relations: Array.isArray(d.configuration?.relations) ? (d.configuration.relations as DataRelation[]) : [],
            pages: Array.isArray(d.configuration?.pages) ? (d.configuration.pages as DashboardPage[]) : [],
          }));

          // Fetch prompt history
          let promptHistory: string[] = [];
          try {
            const { prompts } = await promptApi.getHistory(100);
            promptHistory = prompts.map((p) => p.promptText);
          } catch (e) {
            console.log("No prompts found");
          }

          // Get the saved currentProjectId from localStorage (already rehydrated by zustand)
          const currentState = get();
          const savedProjectId = currentState.currentProjectId;
          
          // Find the project in backend data
          const currentProject = savedProjectId 
            ? backendProjects.find(p => p.id === savedProjectId)
            : backendProjects[0]; // Default to first project if none saved

          set({ 
            projects: backendProjects,
            promptHistory,
          });

          // If we have a current project, restore its data
          if (currentProject) {
            console.log("Restoring project from backend:", currentProject.name);
            
            // Fetch data sources with actual data from backend
            let loadedDataSources: DataSource[] = [];
            try {
              const backendDataSources = await dataSourceApi.getForDashboard(currentProject.id);
              loadedDataSources = backendDataSources.map((ds) => ({
                id: ds.id,
                name: ds.name,
                data: Array.isArray(ds.data) ? ds.data : [],
                schema: ds.schema as DataSchema,
              }));
              console.log("Loaded", loadedDataSources.length, "data sources from backend");
            } catch (e) {
              console.log("No data sources found in backend, using config");
              loadedDataSources = Array.isArray(currentProject.dataSources) ? currentProject.dataSources : [];
            }
            
            const projectPages = Array.isArray(currentProject.pages) ? currentProject.pages : [];
            const projectRelations = Array.isArray(currentProject.relations) ? currentProject.relations : [];
            const firstDataSource = loadedDataSources[0];
            
            set({
              currentProjectId: currentProject.id,
              dataSources: loadedDataSources,
              relations: projectRelations,
              pages: projectPages,
              currentPageId: projectPages.length > 0 ? projectPages[0].id : null,
              rawData: firstDataSource?.data || null,
              schema: firstDataSource?.schema || null,
              fileName: firstDataSource?.name || null,
              // If we have pages, go to dashboard view; otherwise show upload to re-add data
              currentView: projectPages.length > 0 ? "dashboard" : "home",
            });
          }

          console.log("Initialized from backend:", backendProjects.length, "projects");
        } catch (error) {
          console.error("Failed to initialize from backend:", error);
          // Token might be invalid, clear auth state
          set({ isAuthenticated: false, user: null });
        }
      },

      savePromptToBackend: async (promptText: string, dashboardId?: string) => {
        const state = get();
        if (!state.isAuthenticated) return;

        try {
          const result = await promptApi.submit(promptText);
          if (dashboardId && result.prompt.id) {
            // Update prompt status with dashboard ID
            await promptApi.updateStatus(result.prompt.id, {
              status: 'completed',
              dashboardId,
            });
          }
        } catch (error) {
          console.error("Failed to save prompt to backend:", error);
        }
      },

      openProject: async (projectId: string) => {
        const currentState = get();
        const project = currentState.projects.find((p) => p.id === projectId);
        
        console.log("🔓 openProject called:", projectId, "isAuthenticated:", currentState.isAuthenticated);
        
        if (project) {
          // Validate pages and dataSources before setting
          const validPages = Array.isArray(project.pages) ? project.pages : [];
          const validDataSources = Array.isArray(project.dataSources) ? project.dataSources : [];
          const validRelations = Array.isArray(project.relations) ? project.relations : [];
          
          console.log("📂 Opening project:", projectId, {
            pages: validPages.length,
            dataSources: validDataSources.length,
          });
          
          // Fetch data sources with actual data from backend if authenticated
          let loadedDataSources: DataSource[] = validDataSources;
          if (currentState.isAuthenticated) {
            try {
              console.log("📡 Fetching data sources from backend for:", projectId);
              const backendDataSources = await dataSourceApi.getForDashboard(projectId);
              console.log("📥 Backend returned:", backendDataSources.length, "data sources");
              
              loadedDataSources = backendDataSources.map((ds) => ({
                id: ds.id,
                name: ds.name,
                data: Array.isArray(ds.data) ? ds.data : [],
                schema: ds.schema as DataSchema,
                // Map connectionConfig to firebaseConfig for live sync
                firebaseConfig: ds.connectionConfig ? {
                  connectionId: ds.connectionConfig.connectionId,
                  path: ds.connectionConfig.path,
                  databaseType: ds.connectionConfig.databaseType,
                } : undefined,
              }));
              console.log("✅ Loaded", loadedDataSources.length, "data sources, first has", loadedDataSources[0]?.data?.length, "rows");
              if (loadedDataSources[0]?.firebaseConfig) {
                console.log("🔥 First data source has Firebase config:", loadedDataSources[0].firebaseConfig.path);
              }
            } catch (e) {
              console.error("❌ Failed to fetch data sources from backend:", e);
            }
          } else {
            console.log("⚠️ Not authenticated, skipping backend fetch");
          }
          
          // If no data sources loaded from backend, try to preserve existing data
          if (loadedDataSources.length === 0 || (loadedDataSources[0]?.data?.length === 0)) {
            const hasExistingData = currentState.rawData && currentState.rawData.length > 0;
            if (hasExistingData && validDataSources.length > 0) {
              loadedDataSources = validDataSources.map((ds, index) => {
                if (index === 0) {
                  return { ...ds, data: currentState.rawData || [] };
                }
                return ds;
              });
            }
          }
          
          const firstDataSource = loadedDataSources[0];
          
          console.log("📦 Setting state with loaded data sources:");
          loadedDataSources.forEach((ds, i) => {
            console.log(`  [${i}] ${ds.name}: ${ds.data?.length || 0} rows`);
          });
          
          set({
            currentProjectId: projectId,
            dataSources: loadedDataSources,
            relations: validRelations,
            pages: validPages,
            currentPageId: validPages.length > 0 ? validPages[0].id : null,
            rawData: firstDataSource?.data || null,
            schema: firstDataSource?.schema || currentState.schema,
            fileName: firstDataSource?.name || currentState.fileName,
            currentView: validPages.length > 0 ? "dashboard" : "upload",
            isLoading: false,
            aiMessage: null,
          });
          
          // Verify state was set correctly
          const newState = get();
          console.log("✅ State after set:");
          console.log("  dataSources count:", newState.dataSources.length);
          console.log("  first dataSource rows:", newState.dataSources[0]?.data?.length || 0);
          console.log("  rawData rows:", newState.rawData?.length || 0);
          
          // Auto-restart Firebase syncs for data sources with firebase config
          loadedDataSources.forEach((ds) => {
            if (ds.firebaseConfig) {
              console.log('🔄 Auto-restarting Firebase sync for:', ds.name);
              startFirebaseSync(
                ds.id,
                ds.firebaseConfig.connectionId,
                ds.firebaseConfig.path,
                ds.firebaseConfig.databaseType
              );
            }
          });
          
          // NOTE: Do NOT call persist.rehydrate() here - it would overwrite the data we just loaded
          // The rehydrate was causing data to be reset to empty arrays from localStorage
        } else {
          console.warn("Project not found:", projectId);
        }
      },

      deleteProject: (projectId: string) => {
        // Delete from backend if authenticated
        const currentState = get();
        if (currentState.isAuthenticated) {
          dashboardApi.delete(projectId).catch((err) => 
            console.error("Failed to delete from backend:", err)
          );
        }
        
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== projectId),
          ...(s.currentProjectId === projectId
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
        const currentState = get();
        if (!currentState.currentProjectId) return;
        
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
        
        // Sync to backend if authenticated
        if (currentState.isAuthenticated && currentState.currentProjectId) {
          currentState.syncProjectToBackend(currentState.currentProjectId);
        }
      },

      closeProject: () => {
        const currentState = get();
        const projectId = currentState.currentProjectId;
        
        // If project has no data sources, delete it instead of saving
        if (projectId && currentState.dataSources.length === 0) {
          // Delete the empty project
          get().deleteProject(projectId);
        } else {
          // Save current project before closing
          get().saveCurrentProject();
          
          // Stop all Firebase syncs when closing project
          stopAllFirebaseSyncs();
          
          set({
            currentProjectId: null,
            rawData: null,
            schema: null,
            fileName: null,
            dataSources: [],
            relations: [],
            pages: [],
            currentPageId: null,
            currentView: "home",
          });
        }
      },

      addDataSource: (name, data, schema, firebaseConfig) => {
        const id = `datasource-${Date.now()}`;
        const newDataSource: DataSource = { id, name, data, schema, firebaseConfig };
        
        set((state) => {
          // Check if a data source with the same name already exists
          const existingIndex = state.dataSources.findIndex(
            (ds) => ds.name.toLowerCase() === name.toLowerCase()
          );
          
          let newDataSources: DataSource[];
          if (existingIndex >= 0) {
            // Replace existing data source with the same name
            newDataSources = [...state.dataSources];
            newDataSources[existingIndex] = newDataSource;
          } else {
            // Add new data source
            newDataSources = [...state.dataSources, newDataSource];
          }
          
          return {
            dataSources: newDataSources,
            rawData: state.rawData || data,
            schema: state.schema || schema,
            fileName: state.fileName || name,
          };
        });
        
        // Save data source to backend - this is CRITICAL for persistence
        const currentState = get();
        console.log("💾 [CRITICAL] Saving data source to backend:", {
          isAuthenticated: currentState.isAuthenticated,
          currentProjectId: currentState.currentProjectId,
          name,
          dataLength: data.length,
          hasFirebaseConfig: !!firebaseConfig,
        });
        
        if (!currentState.isAuthenticated) {
          console.error("❌ NOT AUTHENTICATED - data will NOT be saved to backend!");
        }
        
        if (!currentState.currentProjectId) {
          console.error("❌ NO PROJECT ID - data will NOT be saved to backend!");
        }
        
        if (currentState.isAuthenticated && currentState.currentProjectId) {
          const isFirebase = name.includes('(Firebase)');
          console.log("📤 Sending to backend API...");
          dataSourceApi.save({
            dashboardId: currentState.currentProjectId,
            name,
            type: isFirebase ? 'firebase' : 'csv',
            schema,
            data,
            sourceId: id,
            connectionConfig: firebaseConfig, // Save firebase config for auto-sync on reopen
          }).then((savedDs) => {
            // Update local data source with backend ID (preserve firebaseConfig)
            set((state) => ({
              dataSources: state.dataSources.map((ds) =>
                ds.id === id ? { ...ds, id: savedDs.id, firebaseConfig } : ds
              ),
            }));
            console.log("✅ Data source SAVED to backend:", savedDs.id, "rows:", savedDs.rowCount, "data stored:", Array.isArray(savedDs.data) ? savedDs.data.length : 'N/A');
          }).catch((err) => {
            console.error("❌ FAILED to save data source to backend:", err);
          });
        } else {
          console.warn("⚠️ Skipping backend save - auth:", currentState.isAuthenticated, "project:", currentState.currentProjectId);
        }
        
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

      updateDataSourceData: (id, data, schema) => {
        console.log('🔄 updateDataSourceData called:', id, 'rows:', data.length);
        set((state) => {
          const dataSourceIndex = state.dataSources.findIndex((ds) => ds.id === id);
          if (dataSourceIndex === -1) {
            console.warn('⚠️ Data source not found:', id);
            return state;
          }
          
          const updatedDataSource = {
            ...state.dataSources[dataSourceIndex],
            data: [...data], // Create new array reference
            schema: schema || state.dataSources[dataSourceIndex].schema,
          };
          
          const newDataSources = [...state.dataSources];
          newDataSources[dataSourceIndex] = updatedDataSource;
          
          // If this is the primary data source, also update rawData
          const isPrimary = dataSourceIndex === 0;
          console.log('🔄 Updating state, isPrimary:', isPrimary);
          
          return {
            dataSources: newDataSources,
            ...(isPrimary ? { 
              rawData: [...data], // New array reference
              schema: schema || state.schema,
            } : {}),
          };
        });
        console.log('✅ updateDataSourceData complete');
      },

      addRelation: (relation) => {
        const id = `relation-${Date.now()}`;
        // Default cardinality if not provided
        const fullRelation = {
          ...relation,
          id,
          cardinality: relation.cardinality || "one-to-many" as const,
        };
        set((state) => ({
          relations: [...state.relations, fullRelation],
        }));
        get().saveCurrentProject();
      },

      removeRelation: (id) => {
        set((state) => ({
          relations: state.relations.filter((r) => r.id !== id),
        }));
        get().saveCurrentProject();
      },
      
      updateRelation: (id, updates) => {
        set((state) => ({
          relations: state.relations.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
        get().saveCurrentProject();
      },
      
      updateColumnType: (dataSourceId, columnName, newType) => {
        set((state) => ({
          dataSources: state.dataSources.map((ds) =>
            ds.id === dataSourceId
              ? {
                  ...ds,
                  columnTypeOverrides: {
                    ...ds.columnTypeOverrides,
                    [columnName]: newType,
                  },
                  schema: {
                    ...ds.schema,
                    columns: ds.schema.columns.map((col) =>
                      col.name === columnName
                        ? { ...col, type: newType, isMetric: newType === "numeric", isDimension: newType === "categorical" }
                        : col
                    ),
                  },
                }
              : ds
          ),
        }));
        get().saveCurrentProject();
      },

      createCalculatedColumn: (dataSourceId, columnName, formula) => {
        const state = get();
        
        // Find the target data source (or use first one if not specified)
        let targetSource: DataSource | undefined;
        if (dataSourceId) {
          targetSource = state.dataSources.find((ds) => ds.id === dataSourceId || ds.name === dataSourceId);
        } else {
          targetSource = state.dataSources[0];
        }
        
        if (!targetSource || !targetSource.data || targetSource.data.length === 0) {
          console.error("No data source found for calculated column");
          return false;
        }
        
        try {
          // Get available column names
          const availableColumns = Object.keys(targetSource.data[0]);
          
          // Sort columns by length (longest first) to avoid partial matches
          const sortedColumns = [...availableColumns].sort((a, b) => b.length - a.length);
          
          // Helper to escape regex special characters
          const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Calculate the new column for each row
          const newData = targetSource.data.map((row) => {
            let expression = formula;
            
            // Replace column names with their values
            for (const col of sortedColumns) {
              const regex = new RegExp(`\\b${escapeRegex(col)}\\b`, 'g');
              const value = Number(row[col]) || 0;
              expression = expression.replace(regex, String(value));
            }
            
            // Safely evaluate the expression
            let result = 0;
            try {
              const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
              if (sanitized === expression.trim()) {
                result = new Function(`"use strict"; return (${sanitized})`)();
                result = isFinite(result) ? result : 0;
              }
            } catch (e) {
              console.warn("Failed to evaluate formula for row:", formula, e);
            }
            
            return {
              ...row,
              [columnName]: Math.round(result * 100) / 100, // Round to 2 decimal places
            };
          });
          
          // Create new schema column
          const newColumn: Column = {
            name: columnName,
            type: "numeric",
            sample: newData.slice(0, 5).map((r) => String(r[columnName])),
            uniqueCount: new Set(newData.map((r) => r[columnName])).size,
            nullCount: 0,
            isMetric: true,
            isDimension: false,
          };
          
          const newSchema: DataSchema = {
            ...targetSource.schema,
            columns: [...targetSource.schema.columns, newColumn],
          };
          
          // Update the data source
          set((s) => ({
            dataSources: s.dataSources.map((ds) =>
              ds.id === targetSource!.id
                ? { ...ds, data: newData, schema: newSchema }
                : ds
            ),
            rawData: s.dataSources[0]?.id === targetSource!.id ? newData : s.rawData,
            schema: s.dataSources[0]?.id === targetSource!.id ? newSchema : s.schema,
          }));
          
          console.log(`✅ Created calculated column "${columnName}" = ${formula}`);
          get().saveCurrentProject();
          return true;
        } catch (error) {
          console.error("Failed to create calculated column:", error);
          return false;
        }
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

      addToPromptHistory: (prompt) => {
        set((state) => ({
          promptHistory: [prompt, ...state.promptHistory].slice(0, 50),
        }));
        // Save to backend
        const state = get();
        if (state.isAuthenticated) {
          state.savePromptToBackend(prompt, state.currentProjectId || undefined);
        }
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCurrentView: (currentView) => set({ currentView }),
      
      // Data Preview Actions
      setPreviewData: (previewData) => set({ previewData }),
      
      setSelectedColumns: (selectedColumns) => set({ selectedColumns }),
      
      toggleColumn: (column) => 
        set((state) => ({
          selectedColumns: state.selectedColumns.includes(column)
            ? state.selectedColumns.filter((c) => c !== column)
            : [...state.selectedColumns, column],
        })),
      
      // Pending Prompt Actions
      setPendingPrompt: (pendingPrompt) => set({ pendingPrompt }),
      
      // Suggested Questions Actions
      setSuggestedQuestions: (suggestedQuestions) => set({ suggestedQuestions }),
      
      // Chat History Actions (Conversational Memory)
      addToChatHistory: (message) => 
        set((state) => ({
          chatHistory: [...state.chatHistory, message].slice(-20), // Keep last 20 messages
        })),
      clearChatHistory: () => set({ chatHistory: [] }),

      // What-If Scenario Actions
      applyWhatIfScenario: (field, changePercent) => {
        const state = get();
        const originalData = state.rawData;
        
        if (!originalData) return;
        
        // Apply the percentage change to the field
        const modifiedData = originalData.map(row => {
          const originalValue = Number(row[field]) || 0;
          const newValue = originalValue * (1 + changePercent / 100);
          return {
            ...row,
            [field]: newValue,
          };
        });
        
        set({
          whatIfMode: true,
          whatIfScenario: {
            field,
            changePercent,
            originalData,
          },
          rawData: modifiedData,
          // Also update first data source if exists
          dataSources: state.dataSources.map((ds, index) => 
            index === 0 
              ? { ...ds, data: modifiedData }
              : ds
          ),
        });
      },
      
      exitWhatIfMode: () => {
        const state = get();
        const originalData = state.whatIfScenario?.originalData;
        
        if (!originalData) {
          set({ whatIfMode: false, whatIfScenario: null });
          return;
        }
        
        set({
          whatIfMode: false,
          whatIfScenario: null,
          rawData: originalData,
          // Restore first data source
          dataSources: state.dataSources.map((ds, index) => 
            index === 0 
              ? { ...ds, data: originalData }
              : ds
          ),
        });
      },

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
        // Only persist metadata, not raw data (too large for localStorage)
        projects: state.projects.map((p) => ({
          ...p,
          dataSources: p.dataSources.map((ds) => ({
            id: ds.id,
            name: ds.name,
            schema: ds.schema,
            data: [], // Don't persist raw data - too large
          })),
        })),
        theme: state.theme,
        currentProjectId: state.currentProjectId,
        currentView: state.currentView,
        // Don't persist dataSources with full data - only schema
        dataSources: state.dataSources.map((ds) => ({
          id: ds.id,
          name: ds.name,
          schema: ds.schema,
          data: [], // Exclude raw data
        })),
        relations: state.relations,
        pages: state.pages,
        currentPageId: state.currentPageId,
        schema: state.schema,
        fileName: state.fileName,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
