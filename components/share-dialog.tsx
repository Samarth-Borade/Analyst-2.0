"use client";

import { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  Mail,
  X,
  Users,
  Eye,
  Pencil,
  Shield,
  Globe,
  Link2,
  Loader2,
  UserPlus,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export type PermissionLevel = "view" | "edit" | "admin";

export interface SharedUser {
  id: string;
  email: string;
  permission: PermissionLevel;
  sharedAt: Date;
  expiresAt?: Date;
}

interface ShareDialogProps {
  dashboardId?: string;
  dashboardTitle?: string;
  trigger?: React.ReactNode;
}

const PERMISSION_INFO: Record<PermissionLevel, { label: string; description: string; icon: React.ReactNode }> = {
  view: {
    label: "View Only",
    description: "Can view dashboard but cannot make changes",
    icon: <Eye className="h-4 w-4" />,
  },
  edit: {
    label: "Editor",
    description: "Can view and edit charts, filters, and layout",
    icon: <Pencil className="h-4 w-4" />,
  },
  admin: {
    label: "Admin",
    description: "Full access including sharing and deletion",
    icon: <Shield className="h-4 w-4" />,
  },
};

export function ShareDialog({ dashboardId, dashboardTitle, trigger }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<PermissionLevel>("view");
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, user } = useDashboardStore();

  // Mock shared users for demo (in production, fetch from API)
  useEffect(() => {
    if (open && dashboardId) {
      // Simulate fetching shared users
      setSharedUsers([
        {
          id: "1",
          email: "colleague@company.com",
          permission: "edit",
          sharedAt: new Date(Date.now() - 86400000 * 2),
        },
        {
          id: "2",
          email: "manager@company.com",
          permission: "admin",
          sharedAt: new Date(Date.now() - 86400000 * 5),
        },
        {
          id: "3",
          email: "viewer@external.com",
          permission: "view",
          sharedAt: new Date(Date.now() - 86400000),
          expiresAt: new Date(Date.now() + 86400000 * 7),
        },
      ]);
    }
  }, [open, dashboardId]);

  const handleShare = async () => {
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Check if already shared
    if (sharedUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setError("Dashboard already shared with this user");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In production, call API to share
      // await shareApi.shareDashboard(dashboardId, email, permission);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSharedUsers([
        ...sharedUsers,
        {
          id: Date.now().toString(),
          email: email.trim(),
          permission,
          sharedAt: new Date(),
        },
      ]);

      setEmail("");
      setPermission("view");
    } catch (err) {
      setError("Failed to share dashboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    setIsLoading(true);
    try {
      // In production, call API to remove share
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSharedUsers(sharedUsers.filter((u) => u.id !== userId));
    } catch (err) {
      setError("Failed to remove access");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: PermissionLevel) => {
    try {
      // In production, call API to update permission
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSharedUsers(
        sharedUsers.map((u) =>
          u.id === userId ? { ...u, permission: newPermission } : u
        )
      );
    } catch (err) {
      setError("Failed to update permission");
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/dashboard/${dashboardId}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Dashboard
          </DialogTitle>
          <DialogDescription>
            {dashboardTitle ? `Share "${dashboardTitle}" with others` : "Invite people to collaborate on this dashboard"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public Link Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Public Link</p>
                <p className="text-xs text-muted-foreground">
                  Anyone with the link can view
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Copy Link */}
          {isPublic && (
            <div className="flex gap-2">
              <Input
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/${dashboardId || "demo"}`}
                readOnly
                className="text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Invite by Email */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Invite People</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleShare()}
                />
              </div>
              <Select value={permission} onValueChange={(v) => setPermission(v as PermissionLevel)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERMISSION_INFO).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {icon}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleShare} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Shared Users List */}
          {sharedUsers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                People with Access
                <Badge variant="secondary" className="text-xs">
                  {sharedUsers.length}
                </Badge>
              </Label>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {/* Owner */}
                  {user && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs text-primary-foreground font-medium">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">Owner</p>
                        </div>
                      </div>
                      <Badge>Owner</Badge>
                    </div>
                  )}

                  {/* Shared users */}
                  {sharedUsers.map((sharedUser) => (
                    <div
                      key={sharedUser.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {sharedUser.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{sharedUser.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Added {formatDate(sharedUser.sharedAt)}</span>
                            {sharedUser.expiresAt && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Clock className="h-3 w-3" />
                                Expires {formatDate(sharedUser.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={sharedUser.permission}
                          onValueChange={(v) =>
                            handleUpdatePermission(sharedUser.id, v as PermissionLevel)
                          }
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PERMISSION_INFO).map(([key, { label }]) => (
                              <SelectItem key={key} value={key} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveShare(sharedUser.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove access</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Permission Legend */}
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Permission Levels:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(PERMISSION_INFO).map(([key, { label, description, icon }]) => (
                <TooltipProvider key={key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                        {icon}
                        <span>{label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
