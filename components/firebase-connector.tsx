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
import {
  FirebaseConfig,
  FirebaseConnection,
  initializeFirebaseApp,
  testFirebaseConnection,
  fetchCollection,
  subscribeToCollection,
  inferSchemaFromDocuments,
  saveConnection,
  getConnections,
  deleteConnection,
  cleanupConnection,
} from "@/lib/firebase-connector";

interface LiveDataSource {
  connectionId: string;
  collectionName: string;
  isLive: boolean;
  lastUpdated: Date | null;
  rowCount: number;
}

export function FirebaseConnector() {
  const [connections, setConnections] = useState<FirebaseConnection[]>([]);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [collectionInput, setCollectionInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveDataSources, setLiveDataSources] = useState<Map<string, LiveDataSource>>(new Map());
  
  // Form state for new connection
  const [newConnection, setNewConnection] = useState<Partial<FirebaseConfig> & { name: string }>({
    name: "",
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
  });

  const { addDataSource, dataSources } = useDashboardStore();

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

    setIsConnecting(true);
    setError(null);

    try {
      const config: FirebaseConfig = {
        apiKey: newConnection.apiKey,
        authDomain: newConnection.authDomain || `${newConnection.projectId}.firebaseapp.com`,
        projectId: newConnection.projectId,
        appId: newConnection.appId,
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
      setError("Please select a connection and enter a collection name");
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      // Re-initialize app if needed
      const connection = connections.find(c => c.id === selectedConnection);
      if (!connection) throw new Error("Connection not found");
      
      initializeFirebaseApp(selectedConnection, connection.config);
      
      // Fetch data
      const data = await fetchCollection(selectedConnection, collectionInput.trim());
      
      if (data.length === 0) {
        setError("No documents found in this collection");
        return;
      }

      // Infer schema
      const schema = inferSchemaFromDocuments(data);
      
      // Add as data source
      const sourceId = addDataSource(
        `${collectionInput.trim()} (Firebase)`,
        data,
        schema
      );

      // Track this live data source
      setLiveDataSources(prev => {
        const next = new Map(prev);
        next.set(sourceId, {
          connectionId: selectedConnection,
          collectionName: collectionInput.trim(),
          isLive: false,
          lastUpdated: new Date(),
          rowCount: data.length,
        });
        return next;
      });

      setCollectionInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch collection");
    } finally {
      setIsFetching(false);
    }
  };

  // Toggle live sync for a data source
  const toggleLiveSync = useCallback((dataSourceId: string) => {
    const liveSource = liveDataSources.get(dataSourceId);
    if (!liveSource) return;

    const connection = connections.find(c => c.id === liveSource.connectionId);
    if (!connection) return;

    if (liveSource.isLive) {
      // Stop live sync
      cleanupConnection(liveSource.connectionId);
      setLiveDataSources(prev => {
        const next = new Map(prev);
        next.set(dataSourceId, { ...liveSource, isLive: false });
        return next;
      });
    } else {
      // Start live sync
      initializeFirebaseApp(liveSource.connectionId, connection.config);
      
      subscribeToCollection(
        liveSource.connectionId,
        liveSource.collectionName,
        (data) => {
          // Update the data source with new data
          const schema = inferSchemaFromDocuments(data);
          // Note: In a real implementation, you'd update the existing data source
          // For now, we'll just log the update
          console.log("Live update received:", data.length, "documents");
          
          setLiveDataSources(prev => {
            const next = new Map(prev);
            const existing = next.get(dataSourceId);
            if (existing) {
              next.set(dataSourceId, {
                ...existing,
                lastUpdated: new Date(),
                rowCount: data.length,
              });
            }
            return next;
          });
        },
        (error) => {
          console.error("Live sync error:", error);
          setLiveDataSources(prev => {
            const next = new Map(prev);
            const existing = next.get(dataSourceId);
            if (existing) {
              next.set(dataSourceId, { ...existing, isLive: false });
            }
            return next;
          });
        }
      );

      setLiveDataSources(prev => {
        const next = new Map(prev);
        next.set(dataSourceId, { ...liveSource, isLive: true });
        return next;
      });
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
                        placeholder="Enter collection name (e.g., users, orders)"
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
