"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  X,
  Loader2,
  Zap,
  Table2,
  Play,
  Pause,
  Settings,
  ChevronRight,
  Link2,
  AlertCircle,
  Eye,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useDashboardStore } from "@/lib/store";
import { generateDataStatistics, getSmartSample } from "@/lib/data-utils";
import {
  FirebaseConfig,
  FirebaseConnection,
  initializeFirebaseApp,
  testFirebaseConnection,
  fetchCollection,
  fetchRealtimeDatabasePath,
  subscribeToCollection,
  subscribeToRealtimeDatabasePath,
  inferSchemaFromDocuments,
  saveConnection,
  getConnections,
  deleteConnection,
  cleanupConnection,
} from "@/lib/firebase-connector";
import { startFirebaseSync, stopFirebaseSync, isFirebaseSyncing } from "@/lib/firebase-sync";

interface LiveDataSource {
  connectionId: string;
  collectionName: string;
  isLive: boolean;
  lastUpdated: Date | null;
  rowCount: number;
  databaseType: 'firestore' | 'realtime';
}

interface FirebaseConnectorProps {
  onAnalysisComplete?: () => void;
}

export function FirebaseConnector({ onAnalysisComplete }: FirebaseConnectorProps) {
  const [connections, setConnections] = useState<FirebaseConnection[]>([]);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [collectionInput, setCollectionInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveDataSources, setLiveDataSources] = useState<Map<string, LiveDataSource>>(new Map());
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state for new connection
  const [newConnection, setNewConnection] = useState<Partial<FirebaseConfig> & { name: string }>({
    name: "",
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
    databaseURL: "",
  });
  const [databaseType, setDatabaseType] = useState<'firestore' | 'realtime'>('realtime');

  const { addDataSource, dataSources, setRawData, setSchema, setIsLoading, setPages, setAiMessage, updateDataSourceData } = useDashboardStore();

  // Load saved connections on mount
  useEffect(() => {
    setConnections(getConnections());
  }, []);

  // Test and save new connection
  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.apiKey || !newConnection.projectId || !newConnection.appId) {
      setError("Please fill in all required fields");
      return;
    }
    
    // Require databaseURL for Realtime Database
    if (databaseType === 'realtime' && !newConnection.databaseURL) {
      setError("Database URL is required for Realtime Database");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const config: FirebaseConfig = {
        apiKey: newConnection.apiKey,
        authDomain: newConnection.authDomain || `${newConnection.projectId}.firebaseapp.com`,
        projectId: newConnection.projectId,
        appId: newConnection.appId,
        databaseURL: newConnection.databaseURL || undefined,
      };

      const result = await testFirebaseConnection(config);
      
      if (!result.success) {
        throw new Error(result.error || "Connection failed");
      }

      const connection: FirebaseConnection = {
        id: `firebase-${Date.now()}`,
        name: newConnection.name,
        config,
        createdAt: new Date().toISOString(),
        databaseType,
      };

      // Initialize the app
      initializeFirebaseApp(connection.id, config);
      
      // Save connection
      saveConnection(connection);
      setConnections(getConnections());
      
      // Reset form
      setNewConnection({
        name: "",
        apiKey: "",
        authDomain: "",
        projectId: "",
        appId: "",
        databaseURL: "",
      });
      setShowAddConnection(false);
      setSelectedConnection(connection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch collection data
  const handleFetchCollection = async () => {
    if (!selectedConnection || !collectionInput.trim()) {
      setError("Please select a connection and enter a collection/path name");
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      // Re-initialize app if needed
      const connection = connections.find(c => c.id === selectedConnection);
      if (!connection) throw new Error("Connection not found");
      
      initializeFirebaseApp(selectedConnection, connection.config);
      
      // Fetch data based on database type
      const dbType = (connection as any).databaseType || 'firestore';
      let data: Record<string, unknown>[];
      
      if (dbType === 'realtime') {
        data = await fetchRealtimeDatabasePath(selectedConnection, collectionInput.trim());
      } else {
        data = await fetchCollection(selectedConnection, collectionInput.trim());
      }
      
      if (data.length === 0) {
        setError("No data found at this path/collection");
        return;
      }

      // Infer schema
      const schema = inferSchemaFromDocuments(data);
      
      // Store preview data
      setPreviewData(data);
      setShowPreview(true);
      
      // Set as raw data in store
      setRawData(data, `${collectionInput.trim()} (Firebase)`);
      setSchema(schema);
      
      // Store the path before clearing
      const pathToSync = collectionInput.trim();
      
      // Add as data source WITH firebase config for auto-sync on reopen
      const sourceId = addDataSource(
        `${pathToSync} (Firebase)`,
        data,
        schema,
        {
          connectionId: selectedConnection,
          path: pathToSync,
          databaseType: dbType,
        }
      );

      // Track this live data source
      setLiveDataSources(prev => {
        const next = new Map(prev);
        next.set(sourceId, {
          connectionId: selectedConnection,
          collectionName: pathToSync,
          isLive: false,
          lastUpdated: new Date(),
          rowCount: data.length,
          databaseType: dbType,
        });
        return next;
      });
      
      console.log('📦 Created data source:', sourceId, 'path:', pathToSync);

      setCollectionInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsFetching(false);
    }
  };

  // Handle generate dashboard
  const handleGenerateDashboard = async () => {
    if (!previewData || previewData.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Generate schema and statistics
      const schema = inferSchemaFromDocuments(previewData);
      const statistics = generateDataStatistics(previewData);
      const sampleData = getSmartSample(previewData, 3);
      
      // Call the analyze API to generate dashboard
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema,
          sampleData,
          statistics,
        }),
      });
      
      if (!response.ok) {
        let errorMessage = `Failed to analyze data (HTTP ${response.status})`;
        try {
          const bodyText = await response.text();
          const bodyJson = JSON.parse(bodyText);
          errorMessage = bodyJson?.details || bodyJson?.error || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (!result.pages || !Array.isArray(result.pages)) {
        throw new Error("Invalid response from analysis API");
      }
      
      // Set the pages in store
      setPages(result.pages);
      setAiMessage(result.summary || "Dashboard generated successfully from Firebase data");
      
      // Save the project to backend immediately
      const { saveCurrentProject } = useDashboardStore.getState();
      saveCurrentProject();
      console.log('💾 Project saved after generating dashboard');
      
      // Auto-start real-time sync for the Firebase data source
      // Find the data source that was just created
      console.log('🔍 Looking for live sources to sync, count:', liveDataSources.size);
      const liveSourceEntry = Array.from(liveDataSources.entries())[0];
      
      if (liveSourceEntry) {
        const [dataSourceId, liveSource] = liveSourceEntry;
        console.log('🔗 Starting sync for:', dataSourceId, 'path:', liveSource.collectionName, 'connection:', liveSource.connectionId);
        
        const connection = connections.find(c => c.id === liveSource.connectionId);
        if (connection) {
          const syncStarted = startFirebaseSync(
            dataSourceId,
            liveSource.connectionId,
            liveSource.collectionName,
            liveSource.databaseType
          );
          
          console.log('🚀 Sync started:', syncStarted);
          
          // Update live source state
          setLiveDataSources(prev => {
            const next = new Map(prev);
            next.set(dataSourceId, { ...liveSource, isLive: true });
            return next;
          });
        } else {
          console.error('❌ Connection not found:', liveSource.connectionId);
        }
      } else {
        console.warn('⚠️ No live source entry found');
      }
      
      // Call onAnalysisComplete to navigate to dashboard
      onAnalysisComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate dashboard");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle live sync for a data source
  const toggleLiveSync = useCallback((dataSourceId: string) => {
    const liveSource = liveDataSources.get(dataSourceId);
    if (!liveSource) return;

    const connection = connections.find(c => c.id === liveSource.connectionId);
    if (!connection) return;

    if (liveSource.isLive || isFirebaseSyncing(dataSourceId)) {
      // Stop live sync using global manager
      stopFirebaseSync(dataSourceId);
      setLiveDataSources(prev => {
        const next = new Map(prev);
        next.set(dataSourceId, { ...liveSource, isLive: false });
        return next;
      });
    } else {
      // Start live sync using global manager
      const started = startFirebaseSync(
        dataSourceId,
        liveSource.connectionId,
        liveSource.collectionName,
        liveSource.databaseType
      );
      
      if (started) {
        setLiveDataSources(prev => {
          const next = new Map(prev);
          next.set(dataSourceId, { ...liveSource, isLive: true });
          return next;
        });
      }
    }
  }, [liveDataSources, connections]);

  // Delete a connection
  const handleDeleteConnection = (connectionId: string) => {
    deleteConnection(connectionId);
    setConnections(getConnections());
    if (selectedConnection === connectionId) {
      setSelectedConnection(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Database className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Firebase Connector</h2>
            <p className="text-sm text-muted-foreground">
              Connect to Firestore for real-time data sync
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddConnection(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">No Firebase Connections</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Connect to a Firebase project to import data from Firestore collections in real-time
            </p>
            <Button onClick={() => setShowAddConnection(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card 
              key={connection.id}
              className={selectedConnection === connection.id ? "ring-2 ring-primary" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Zap className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{connection.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {connection.config.projectId}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      Connected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConnection(connection.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedConnection === connection.id ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter path (e.g., sales/liveOrders, users)"
                        value={collectionInput}
                        onChange={(e) => setCollectionInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFetchCollection()}
                      />
                      <Button 
                        onClick={handleFetchCollection}
                        disabled={isFetching || !collectionInput.trim()}
                      >
                        {isFetching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Table2 className="h-4 w-4 mr-2" />
                            Import
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tip: Use specific paths like <code className="bg-muted px-1 rounded">sales/liveOrders</code> or <code className="bg-muted px-1 rounded">sales/topProducts</code> for better results
                    </p>
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => {
                      setSelectedConnection(connection.id);
                      initializeFirebaseApp(connection.id, connection.config);
                    }}
                  >
                    <span className="text-muted-foreground">Click to import collections</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Live Data Sources */}
      {liveDataSources.size > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Firebase Data Sources
          </h3>
          {Array.from(liveDataSources.entries()).map(([id, source]) => (
            <Card key={id} className="bg-muted/30">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Table2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{source.collectionName}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.rowCount} documents
                        {source.lastUpdated && (
                          <> • Updated {source.lastUpdated.toLocaleTimeString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={source.isLive ? "default" : "outline"}>
                      {source.isLive ? (
                        <>
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                          Live
                        </>
                      ) : (
                        "Paused"
                      )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLiveSync(id)}
                    >
                      {source.isLive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Data Preview & Generate Dashboard */}
      {showPreview && previewData && previewData.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-primary" />
              Data Preview
            </CardTitle>
            <CardDescription>
              {previewData.length} records loaded from Firebase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(previewData[0] || {}).slice(0, 6).map((key) => (
                        <th key={key} className="px-4 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                      {Object.keys(previewData[0] || {}).length > 6 && (
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          +{Object.keys(previewData[0] || {}).length - 6} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.keys(previewData[0] || {}).slice(0, 6).map((key) => (
                          <td key={key} className="px-4 py-2 truncate max-w-[150px]">
                            {typeof row[key] === 'object' 
                              ? JSON.stringify(row[key]).slice(0, 30) + '...'
                              : String(row[key] ?? '')}
                          </td>
                        ))}
                        {Object.keys(previewData[0] || {}).length > 6 && (
                          <td className="px-4 py-2 text-muted-foreground">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 5 && (
                <div className="px-4 py-2 bg-muted text-sm text-muted-foreground text-center">
                  Showing 5 of {previewData.length} records
                </div>
              )}
            </div>

            {/* Generate Dashboard Button */}
            <Button 
              size="lg" 
              className="w-full gap-2"
              onClick={handleGenerateDashboard}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Dashboard...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Dashboard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Connection Dialog */}
      <Dialog open={showAddConnection} onOpenChange={setShowAddConnection}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Add Firebase Connection
            </DialogTitle>
            <DialogDescription>
              Enter your Firebase project configuration. You can find this in your Firebase Console under Project Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                placeholder="e.g., My Company Firebase"
                value={newConnection.name}
                onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Database Type *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={databaseType === 'realtime' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDatabaseType('realtime')}
                >
                  Realtime Database
                </Button>
                <Button
                  type="button"
                  variant={databaseType === 'firestore' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDatabaseType('firestore')}
                >
                  Firestore
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                placeholder="AIzaSy..."
                value={newConnection.apiKey}
                onChange={(e) => setNewConnection({ ...newConnection, apiKey: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID *</Label>
              <Input
                id="projectId"
                placeholder="my-project-id"
                value={newConnection.projectId}
                onChange={(e) => setNewConnection({ ...newConnection, projectId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appId">App ID *</Label>
              <Input
                id="appId"
                placeholder="1:123456789:web:abc123..."
                value={newConnection.appId}
                onChange={(e) => setNewConnection({ ...newConnection, appId: e.target.value })}
              />
            </div>

            {databaseType === 'realtime' && (
              <div className="space-y-2">
                <Label htmlFor="databaseURL">Database URL *</Label>
                <Input
                  id="databaseURL"
                  placeholder="https://your-project-default-rtdb.firebaseio.com"
                  value={newConnection.databaseURL}
                  onChange={(e) => setNewConnection({ ...newConnection, databaseURL: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Firebase Console → Realtime Database → Data tab (the URL at the top)
                </p>
              </div>
            )}

            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Options
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="authDomain">Auth Domain</Label>
                    <Input
                      id="authDomain"
                      placeholder="my-project.firebaseapp.com"
                      value={newConnection.authDomain}
                      onChange={(e) => setNewConnection({ ...newConnection, authDomain: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Defaults to [projectId].firebaseapp.com
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddConnection(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddConnection} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
