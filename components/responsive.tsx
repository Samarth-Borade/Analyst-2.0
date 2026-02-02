"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============ Breakpoint Detection ============

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

interface ResponsiveContextValue {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: "portrait" | "landscape";
}

const ResponsiveContext = createContext<ResponsiveContextValue>({
  width: 1024,
  height: 768,
  breakpoint: "lg",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouchDevice: false,
  orientation: "landscape",
});

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResponsiveContextValue>({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
    breakpoint: "lg",
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: "landscape",
  });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let breakpoint: Breakpoint = "xs";
      if (width >= BREAKPOINTS["2xl"]) breakpoint = "2xl";
      else if (width >= BREAKPOINTS.xl) breakpoint = "xl";
      else if (width >= BREAKPOINTS.lg) breakpoint = "lg";
      else if (width >= BREAKPOINTS.md) breakpoint = "md";
      else if (width >= BREAKPOINTS.sm) breakpoint = "sm";

      const isMobile = width < BREAKPOINTS.md;
      const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
      const isDesktop = width >= BREAKPOINTS.lg;
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const orientation = width > height ? "landscape" : "portrait";

      setState({
        width,
        height,
        breakpoint,
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return (
    <ResponsiveContext.Provider value={state}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  return useContext(ResponsiveContext);
}

// ============ Mobile Navigation Drawer ============

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  side = "left",
  className = "",
}: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 bottom-0 w-[280px] max-w-[85vw] bg-background z-50 shadow-2xl transition-transform duration-300",
          side === "left" ? "left-0" : "right-0",
          side === "left"
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : isOpen
            ? "translate-x-0"
            : "translate-x-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Close button */}
        <div className="flex justify-end p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-52px)]">{children}</div>
      </div>
    </>
  );
}

// ============ Mobile Header ============

interface MobileHeaderProps {
  title: string;
  onMenuClick: () => void;
  actions?: ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  onMenuClick,
  actions,
  className = "",
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-3 py-2 border-b bg-background sticky top-0 z-30",
        "h-14 md:hidden", // Only show on mobile
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="touch-manipulation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="font-semibold text-lg truncate flex-1 text-center px-2">
        {title}
      </h1>

      <div className="flex items-center gap-1">{actions}</div>
    </header>
  );
}

// ============ Touch-Friendly Controls ============

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children?: ReactNode;
}

export function TouchButton({
  variant = "default",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: TouchButtonProps) {
  const sizeClasses = {
    sm: "min-h-[36px] min-w-[36px] px-3 text-sm",
    md: "min-h-[44px] min-w-[44px] px-4 text-base", // 44px is minimum touch target
    lg: "min-h-[52px] min-w-[52px] px-5 text-lg",
  };

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "touch-manipulation active:scale-95", // Better touch feedback
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

// ============ Swipeable Container ============

interface SwipeableProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  children: ReactNode;
  className?: string;
}

export function Swipeable({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  children,
  className = "",
}: SwipeableProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine primary direction
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    setTouchStart(null);
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

// ============ Responsive Grid ============

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  minItemWidth?: number;
}

export function ResponsiveGrid({
  children,
  className = "",
  minItemWidth = 300,
}: ResponsiveGridProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}px, 100%), 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

// ============ Collapsible Section (Mobile-Friendly) ============

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <button
        className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors touch-manipulation"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="font-medium">{title}</span>
        <ChevronRight
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ============ Bottom Sheet (Mobile) ============

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  className = "",
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 bg-background z-50 rounded-t-2xl shadow-2xl",
          "transition-transform duration-300 max-h-[85vh]",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-3 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-4">
          {children}
        </div>
      </div>
    </>
  );
}

// ============ Mobile Tabs ============

interface MobileTabsProps {
  tabs: Array<{ id: string; label: string; icon?: ReactNode }>;
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function MobileTabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: MobileTabsProps) {
  return (
    <div
      className={cn(
        "flex border-b bg-background sticky top-0 z-20 overflow-x-auto",
        "scrollbar-hide", // Hide scrollbar
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap",
            "border-b-2 transition-colors touch-manipulation",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============ Floating Action Button ============

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  label: string;
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  className?: string;
}

export function FloatingActionButton({
  icon,
  onClick,
  label,
  position = "bottom-right",
  className = "",
}: FloatingActionButtonProps) {
  const positionClasses = {
    "bottom-right": "right-4 bottom-4",
    "bottom-left": "left-4 bottom-4",
    "bottom-center": "left-1/2 -translate-x-1/2 bottom-4",
  };

  return (
    <button
      className={cn(
        "fixed z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground",
        "shadow-lg flex items-center justify-center",
        "touch-manipulation active:scale-95 transition-transform",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        positionClasses[position],
        className
      )}
      onClick={onClick}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

// ============ Page Navigation (Swipe) ============

interface SwipeablePageProps {
  pages: ReactNode[];
  currentPage: number;
  onPageChange: (index: number) => void;
  showIndicators?: boolean;
}

export function SwipeablePages({
  pages,
  currentPage,
  onPageChange,
  showIndicators = true,
}: SwipeablePageProps) {
  const handleSwipeLeft = () => {
    if (currentPage < pages.length - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  return (
    <div className="relative">
      <Swipeable
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        className="overflow-hidden"
      >
        <div
          className="flex transition-transform duration-300"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
          {pages.map((page, idx) => (
            <div key={idx} className="w-full flex-shrink-0">
              {page}
            </div>
          ))}
        </div>
      </Swipeable>

      {/* Page indicators */}
      {showIndicators && pages.length > 1 && (
        <div className="flex justify-center gap-2 py-3">
          {pages.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                idx === currentPage ? "bg-primary" : "bg-muted"
              )}
              onClick={() => onPageChange(idx)}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Arrow navigation for desktop */}
      <div className="hidden md:flex absolute inset-y-0 left-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwipeRight}
          disabled={currentPage === 0}
          className="h-10 w-10"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>
      <div className="hidden md:flex absolute inset-y-0 right-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwipeLeft}
          disabled={currentPage === pages.length - 1}
          className="h-10 w-10"
          aria-label="Next page"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
