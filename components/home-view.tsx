"use client";

import { useState } from "react";
import {
  Plus,
  FolderOpen,
  Trash2,
  Clock,
  FileSpreadsheet,
  Moon,
  Sun,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { UserButton } from "@/components/auth-modal";

export function HomeView() {
  const {
    projects,
    createProject,
    openProject,
    deleteProject,
    theme,
    toggleTheme,
  } = useDashboardStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    setDeleteConfirmId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground font-mono text-lg tracking-tight">
              DashExAI
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-Powered Analytics Platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground font-mono tracking-tight">
              Your Projects
            </h2>
            <p className="text-muted-foreground mt-1">
              Create a new project or open an existing one
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 font-mono">
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-mono">Create New Project</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="project-name" className="font-mono text-sm">
                  Project Name
                </Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Analytics Project"
                  className="mt-2 font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 font-mono">
                No projects yet
              </h3>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Create your first project to start analyzing data with AI-powered
                dashboards.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* New Project Card */}
            <Card
              className={cn(
                "border-dashed cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                "flex items-center justify-center min-h-[180px]"
              )}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground font-mono">
                  New Project
                </p>
              </CardContent>
            </Card>

            {/* Existing Projects */}
            {projects
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              )
              .map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0" onClick={() => openProject(project.id)}>
                        <CardTitle className="text-lg font-mono truncate">
                          {project.name}
                        </CardTitle>
                      </div>
                      <Dialog
                        open={deleteConfirmId === project.id}
                        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(project.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent onClick={(e) => e.stopPropagation()}>
                          <DialogHeader>
                            <DialogTitle className="font-mono">Delete Project</DialogTitle>
                          </DialogHeader>
                          <p className="text-muted-foreground">
                            Are you sure you want to delete "{project.name}"? This action
                            cannot be undone.
                          </p>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent onClick={() => openProject(project.id)}>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span className="font-mono">
                          {project.dataSources.length} data source
                          {project.dataSources.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-mono">
                          {project.pages.length} page
                          {project.pages.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-mono">{formatDate(project.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2 font-mono">
              Multiple Data Sources
            </h3>
            <p className="text-sm text-muted-foreground">
              Import CSV and Excel files, then create relationships between datasets
              using an intuitive ER diagram interface.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2 font-mono">
              AI-Generated Charts
            </h3>
            <p className="text-sm text-muted-foreground">
              Our AI analyzes your data and automatically creates the most insightful
              visualizations for your dashboard.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2 font-mono">
              Natural Language Editing
            </h3>
            <p className="text-sm text-muted-foreground">
              Modify your dashboards by simply describing what you want in plain
              English. Add, edit, or remove charts instantly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
