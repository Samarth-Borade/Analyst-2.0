"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardCanvas } from "@/components/dashboard-canvas";
import { DashboardHeader } from "@/components/dashboard-header";
import { PromptBar } from "@/components/prompt-bar";
import { DataView } from "@/components/data-view";
import { DataModelingView } from "@/components/data-modeling-view";
import { useDashboardStore } from "@/lib/store";

interface DashboardViewProps {
  onReset: () => void;
}

export function DashboardView({ onReset }: DashboardViewProps) {
  const { currentView } = useDashboardStore();

  const renderContent = () => {
    switch (currentView) {
      case "data":
        return <DataView />;
      case "data-modeling":
        return <DataModelingView />;
      case "dashboard":
      default:
        return <DashboardCanvas />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader onReset={onReset} />
      <div className="flex-1 flex overflow-hidden">
        <DashboardSidebar />
        {renderContent()}
      </div>
      {currentView === "dashboard" && <PromptBar />}
    </div>
  );
}
