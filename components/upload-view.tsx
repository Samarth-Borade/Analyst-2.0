"use client";

import { useState } from "react";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";
import { FirebaseConnector } from "@/components/firebase-connector";
import { Moon, Sun, BarChart3, Sparkles, Zap, Shield, Upload, Database, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UploadViewProps {
  onUploadComplete: () => void;
  onBack?: () => void;
}

export function UploadView({ onUploadComplete, onBack }: UploadViewProps) {
  const { theme, toggleTheme } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<"file" | "firebase">("file");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-foreground">AI Analyst</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
            Transform Your Data Into Insights
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Upload your CSV or Excel file, or connect to Firebase for real-time data.
            Let AI automatically generate beautiful, interactive dashboards.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "firebase")} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="file" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="firebase" className="gap-2">
              <Database className="h-4 w-4" />
              Firebase
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="file">
            <EnhancedFileUpload onAnalysisComplete={onUploadComplete} mode="initial" />
          </TabsContent>
          
          <TabsContent value="firebase">
            <FirebaseConnector onAnalysisComplete={onUploadComplete} />
          </TabsContent>
        </Tabs>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">AI-Powered Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Our AI automatically understands your data and generates the most
              relevant visualizations.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Natural Language Editing</h3>
            <p className="text-sm text-muted-foreground">
              Modify charts, colors, and layouts by simply describing what you want
              in plain English.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Interactive Dashboards</h3>
            <p className="text-sm text-muted-foreground">
              Create professional dashboards with KPIs, charts, and tables that
              update in real-time.
            </p>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <Shield className="h-4 w-4" />
            Your data never leaves your browser. Processing happens locally.
          </div>
        </div>
      </main>
    </div>
  );
}
