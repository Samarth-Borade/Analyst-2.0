"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardCanvas } from "@/components/dashboard-canvas";
import { DashboardHeader } from "@/components/dashboard-header";
import { PromptBar } from "@/components/prompt-bar";

interface DashboardViewProps {
  onReset: () => void;
}

export function DashboardView({ onReset }: DashboardViewProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader onReset={onReset} />
      <div className="flex-1 flex overflow-hidden">
        <DashboardSidebar />
        <DashboardCanvas />
      </div>
      <PromptBar />
    </div>
  );
}
