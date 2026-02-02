"use client";

import { useEffect, useRef, useState } from "react";
import { HomeView } from "@/components/home-view";
import { UploadView } from "@/components/upload-view";
import { DashboardView } from "@/components/dashboard-view";
import { RelationsView } from "@/components/relations-view";
import { useDashboardStore } from "@/lib/store";
import { VisualizationProvider } from "@/lib/visualization-context";
import { CollaborationProvider } from "@/components/collaboration";

export default function Home() {
  const { currentView, theme, rawData, currentProjectId, setCurrentView, openProject, pages, initializeFromBackend, closeProject } =
    useDashboardStore();
  
  const restoredRef = useRef(false);
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize from backend on first mount
  useEffect(() => {
    const init = async () => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        try {
          await initializeFromBackend();
        } catch (error) {
          console.error("Failed to initialize from backend:", error);
        }
        setIsReady(true);
      }
    };
    init();
  }, [initializeFromBackend]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Restore project data when component mounts and currentProjectId exists
  useEffect(() => {
    const restoreProject = async () => {
      // Wait for zustand to rehydrate from localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const state = useDashboardStore.getState();
      
      if (state.currentProjectId && !restoredRef.current) {
        console.log("Restoring project:", state.currentProjectId);
        console.log("Current pages in state:", state.pages.length);
        console.log("Current projects:", state.projects.length);
        
        restoredRef.current = true;
        
        // Get the actual project from the projects array
        const project = state.projects.find((p) => p.id === state.currentProjectId);
        if (project) {
          console.log("Found project, pages in project:", project.pages.length);
          // If pages don't match the project, restore from project
          if (state.pages.length !== project.pages.length || state.pages.length === 0) {
            console.log("Pages mismatch, calling openProject");
            openProject(state.currentProjectId);
          }
        }
      }
    };
    
    restoreProject();
  }, [openProject]);

  // If we have data and are on upload, go to dashboard
  useEffect(() => {
    if (rawData && rawData.length > 0 && currentView === "upload") {
      // Only switch to dashboard after analysis is complete (pages exist)
      const pageState = useDashboardStore.getState().pages;
      if (pageState && pageState.length > 0) {
        setCurrentView("dashboard");
      }
    }
  }, [rawData, currentView, setCurrentView]);

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If no project selected, show home
  if (!currentProjectId) {
    return <HomeView />;
  }

  switch (currentView) {
    case "upload":
      return (
        <CollaborationProvider>
          <VisualizationProvider>
            <UploadView onUploadComplete={() => setCurrentView("dashboard")} onBack={closeProject} />
          </VisualizationProvider>
        </CollaborationProvider>
      );
    case "dashboard":
    case "data":
    case "data-modeling":
      return (
        <CollaborationProvider>
          <VisualizationProvider>
            <DashboardView onReset={() => setCurrentView("home")} />
          </VisualizationProvider>
        </CollaborationProvider>
      );
    case "relations":
      return (
        <CollaborationProvider>
          <VisualizationProvider>
            <RelationsView />
          </VisualizationProvider>
        </CollaborationProvider>
      );
    default:
      return <HomeView />;
  }
}
