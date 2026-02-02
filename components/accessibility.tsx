"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Eye, Type, Contrast, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { accessibleColorPalettes, prefersReducedMotion } from "@/lib/accessibility";

// ============ Theme Toggle Button ============

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={() => {
        if (theme === "system") {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
        } else {
          setTheme(theme === "dark" ? "light" : "dark");
        }
      }}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

// ============ Theme Selector (System/Light/Dark) ============

export function ThemeSelector({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { value: "system", icon: Monitor, label: "System" },
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-lg", className)}>
      {themes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="sm"
          className={cn(
            "flex items-center gap-2",
            theme === value && "shadow-sm"
          )}
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}

// ============ Accessibility Settings Context ============

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  textScale: number;
  colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia" | "monochrome";
  announceChanges: boolean;
  focusIndicators: "default" | "enhanced";
}

const defaultSettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  textScale: 100,
  colorBlindMode: "none",
  announceChanges: true,
  focusIndicators: "default",
};

const AccessibilityContext = createContext<{
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
}>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    
    const stored = localStorage.getItem("accessibility-settings");
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    
    // Auto-detect user preferences
    return {
      ...defaultSettings,
      reducedMotion: prefersReducedMotion(),
    };
  });

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty("--animation-duration", "0ms");
      root.classList.add("motion-reduce");
    } else {
      root.style.removeProperty("--animation-duration");
      root.classList.remove("motion-reduce");
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Text scale
    root.style.setProperty("--text-scale", `${settings.textScale}%`);
    root.style.fontSize = `${settings.textScale}%`;

    // Large text
    if (settings.largeText) {
      root.classList.add("large-text");
    } else {
      root.classList.remove("large-text");
    }

    // Color blind mode
    root.setAttribute("data-color-blind-mode", settings.colorBlindMode);

    // Focus indicators
    if (settings.focusIndicators === "enhanced") {
      root.classList.add("enhanced-focus");
    } else {
      root.classList.remove("enhanced-focus");
    }

    // Save to localStorage
    localStorage.setItem("accessibility-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

// ============ Accessibility Settings Dialog ============

export function AccessibilitySettingsDialog() {
  const { settings, updateSettings } = useAccessibility();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Accessibility settings"
          className="touch-manipulation"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accessibility Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Theme</Label>
            <ThemeSelector />
          </div>

          {/* Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduced-motion" className="text-base">
                Reduce Motion
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="text-base flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                High Contrast
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
            />
          </div>

          {/* Text Scale */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text Size: {settings.textScale}%
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ textScale: 100 })}
              >
                Reset
              </Button>
            </div>
            <Slider
              value={[settings.textScale]}
              onValueChange={([value]) => updateSettings({ textScale: value })}
              min={75}
              max={200}
              step={5}
              aria-label="Text size"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>75%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          {/* Color Blind Mode */}
          <div className="space-y-2">
            <Label htmlFor="color-blind-mode" className="text-base">
              Color Vision
            </Label>
            <Select
              value={settings.colorBlindMode}
              onValueChange={(value) =>
                updateSettings({
                  colorBlindMode: value as AccessibilitySettings["colorBlindMode"],
                })
              }
            >
              <SelectTrigger id="color-blind-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Normal vision</SelectItem>
                <SelectItem value="protanopia">Protanopia (red-blind)</SelectItem>
                <SelectItem value="deuteranopia">Deuteranopia (green-blind)</SelectItem>
                <SelectItem value="tritanopia">Tritanopia (blue-blind)</SelectItem>
                <SelectItem value="monochrome">Monochrome</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Screen Reader Announcements */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="announce-changes" className="text-base flex items-center gap-2">
                {settings.announceChanges ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                Announce Changes
              </Label>
              <p className="text-sm text-muted-foreground">
                Read updates aloud for screen readers
              </p>
            </div>
            <Switch
              id="announce-changes"
              checked={settings.announceChanges}
              onCheckedChange={(checked) => updateSettings({ announceChanges: checked })}
            />
          </div>

          {/* Focus Indicators */}
          <div className="space-y-2">
            <Label htmlFor="focus-indicators" className="text-base">
              Focus Indicators
            </Label>
            <Select
              value={settings.focusIndicators}
              onValueChange={(value) =>
                updateSettings({
                  focusIndicators: value as "default" | "enhanced",
                })
              }
            >
              <SelectTrigger id="focus-indicators">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="enhanced">Enhanced (larger, more visible)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Keyboard shortcuts info */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Tab</kbd> Navigate
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> Close dialogs
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> Activate
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd> Navigate lists
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Skip Link Component ============

export function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <a
        href="#main-navigation"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-44 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to navigation
      </a>
    </div>
  );
}

// ============ Accessible Chart Colors Hook ============

export function useAccessibleColors() {
  const { settings } = useAccessibility();

  const getColorPalette = (): string[] => {
    switch (settings.colorBlindMode) {
      case "protanopia":
      case "deuteranopia":
      case "tritanopia":
        return accessibleColorPalettes.okabeIto;
      case "monochrome":
        return accessibleColorPalettes.monoSafe;
      default:
        if (settings.highContrast) {
          return accessibleColorPalettes.highContrast;
        }
        return accessibleColorPalettes.okabeIto;
    }
  };

  return { getColorPalette };
}
