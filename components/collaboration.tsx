"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { Users, Circle, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types for real-time collaboration
export interface CollaboratorPresence {
  id: string;
  email: string;
  name?: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string; // ID of selected chart/element
  lastSeen: Date;
  isActive: boolean;
}

export interface CollaborationMessage {
  type: "presence" | "update" | "cursor" | "selection" | "chat";
  userId: string;
  payload: unknown;
  timestamp: Date;
}

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

// Collaboration Context
interface CollaborationContextType {
  isConnected: boolean;
  collaborators: CollaboratorPresence[];
  currentUserId: string | null;
  dashboardId: string | null;
  connect: (dashboardId: string, userId: string, email: string) => void;
  disconnect: () => void;
  updateCursor: (x: number, y: number) => void;
  updateSelection: (elementId: string | null) => void;
  broadcastUpdate: (updateType: string, data: unknown) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    // Return safe defaults when not in provider
    return {
      isConnected: false,
      collaborators: [],
      currentUserId: null,
      dashboardId: null,
      connect: () => {},
      disconnect: () => {},
      updateCursor: () => {},
      updateSelection: () => {},
      broadcastUpdate: () => {},
    };
  }
  return context;
}

interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Simulate WebSocket connection (in production, connect to real WebSocket server)
  const connect = useCallback((dashboardId: string, userId: string, email: string) => {
    setDashboardId(dashboardId);
    setCurrentUserId(userId);
    
    // Simulate connection
    setIsConnected(true);
    
    // Simulate other collaborators joining (demo mode)
    const mockCollaborators: CollaboratorPresence[] = [
      {
        id: "collab-1",
        email: "alex@company.com",
        name: "Alex",
        color: COLLABORATOR_COLORS[0],
        lastSeen: new Date(),
        isActive: true,
      },
      {
        id: "collab-2",
        email: "jordan@company.com",
        name: "Jordan",
        color: COLLABORATOR_COLORS[1],
        lastSeen: new Date(Date.now() - 30000),
        isActive: true,
      },
    ];
    
    // Simulate collaborators joining with delay
    setTimeout(() => {
      setCollaborators(mockCollaborators);
    }, 1000);

    // In production:
    // const socket = new WebSocket(`wss://your-server.com/collab/${dashboardId}`);
    // socket.onopen = () => setIsConnected(true);
    // socket.onmessage = (event) => handleMessage(JSON.parse(event.data));
    // socket.onclose = () => setIsConnected(false);
    // setWs(socket);
  }, []);

  const disconnect = useCallback(() => {
    ws?.close();
    setWs(null);
    setIsConnected(false);
    setCollaborators([]);
    setDashboardId(null);
    setCurrentUserId(null);
  }, [ws]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (!isConnected || !currentUserId) return;
    
    // In production, send via WebSocket:
    // ws?.send(JSON.stringify({ type: 'cursor', payload: { x, y } }));
    
    // Demo: just log
    // console.log('Cursor update:', { x, y });
  }, [isConnected, currentUserId, ws]);

  const updateSelection = useCallback((elementId: string | null) => {
    if (!isConnected || !currentUserId) return;
    
    // In production, send via WebSocket:
    // ws?.send(JSON.stringify({ type: 'selection', payload: { elementId } }));
  }, [isConnected, currentUserId, ws]);

  const broadcastUpdate = useCallback((updateType: string, data: unknown) => {
    if (!isConnected || !currentUserId) return;
    
    // In production, send via WebSocket:
    // ws?.send(JSON.stringify({ type: 'update', payload: { updateType, data } }));
    
    console.log('[Collab] Broadcasting update:', updateType, data);
  }, [isConnected, currentUserId, ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  // Simulate collaborator activity (demo mode)
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setCollaborators(prev => prev.map(c => ({
        ...c,
        lastSeen: new Date(),
        // Randomly toggle activity for demo
        isActive: Math.random() > 0.1,
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <CollaborationContext.Provider
      value={{
        isConnected,
        collaborators,
        currentUserId,
        dashboardId,
        connect,
        disconnect,
        updateCursor,
        updateSelection,
        broadcastUpdate,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

// Collaborator Presence Indicator
interface CollaboratorAvatarsProps {
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}

export function CollaboratorAvatars({ maxVisible = 3, size = "md" }: CollaboratorAvatarsProps) {
  const { isConnected, collaborators } = useCollaboration();

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const activeCollaborators = collaborators.filter(c => c.isActive);
  const visibleCollaborators = activeCollaborators.slice(0, maxVisible);
  const hiddenCount = activeCollaborators.length - maxVisible;

  if (!isConnected && activeCollaborators.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
              isConnected 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{isConnected ? "Live" : "Offline"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected ? "Real-time sync enabled" : "Working offline"}
          </TooltipContent>
        </Tooltip>

        {/* Collaborator Avatars */}
        {visibleCollaborators.length > 0 && (
          <div className="flex -space-x-2 ml-2">
            {visibleCollaborators.map((collaborator) => (
              <Tooltip key={collaborator.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center ring-2 ring-background font-medium",
                      sizeClasses[size]
                    )}
                    style={{ backgroundColor: collaborator.color }}
                  >
                    <span className="text-white">
                      {(collaborator.name || collaborator.email).charAt(0).toUpperCase()}
                    </span>
                    {/* Active indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">{collaborator.name || collaborator.email}</p>
                    <p className="text-muted-foreground">Editing now</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {hiddenCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center bg-muted ring-2 ring-background font-medium",
                      sizeClasses[size]
                    )}
                  >
                    +{hiddenCount}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {hiddenCount} more collaborator{hiddenCount > 1 ? "s" : ""}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Cursor overlay for showing other users' cursors
interface CollaboratorCursorsProps {
  containerRef: React.RefObject<HTMLElement>;
}

export function CollaboratorCursors({ containerRef }: CollaboratorCursorsProps) {
  const { collaborators } = useCollaboration();

  const collaboratorsWithCursors = collaborators.filter(c => c.cursor && c.isActive);

  if (collaboratorsWithCursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
      {collaboratorsWithCursors.map((collaborator) => (
        <div
          key={collaborator.id}
          className="absolute transition-all duration-100"
          style={{
            left: collaborator.cursor!.x,
            top: collaborator.cursor!.y,
          }}
        >
          {/* Cursor */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: collaborator.color }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"
              fill="currentColor"
            />
          </svg>
          {/* Name badge */}
          <div
            className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white font-medium whitespace-nowrap"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.name || collaborator.email.split("@")[0]}
          </div>
        </div>
      ))}
    </div>
  );
}

// Selection highlight for showing what others are editing
interface CollaboratorSelectionProps {
  elementId: string;
  children: ReactNode;
}

export function CollaboratorSelection({ elementId, children }: CollaboratorSelectionProps) {
  const { collaborators } = useCollaboration();

  const selectingCollaborator = collaborators.find(
    c => c.selection === elementId && c.isActive
  );

  if (!selectingCollaborator) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        className="absolute -inset-1 rounded-lg pointer-events-none z-10"
        style={{
          border: `2px solid ${selectingCollaborator.color}`,
          boxShadow: `0 0 0 1px ${selectingCollaborator.color}20`,
        }}
      />
      <div
        className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs text-white font-medium z-10"
        style={{ backgroundColor: selectingCollaborator.color }}
      >
        {selectingCollaborator.name || selectingCollaborator.email.split("@")[0]}
      </div>
      {children}
    </div>
  );
}
