/**
 * Accessibility Utilities
 * 
 * WCAG 2.1 AA compliance helpers:
 * - Contrast checking
 * - Focus management
 * - Screen reader announcements
 * - Reduced motion support
 */

// ============ Color Contrast ============

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * WCAG 2.1 requires 4.5:1 for normal text, 3:1 for large text
 */
export function getContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA",
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === "AAA") {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  // AA level
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Suggest a color adjustment to meet contrast requirements
 */
export function suggestAccessibleColor(
  foreground: string,
  background: string,
  minRatio: number = 4.5
): string {
  const currentRatio = getContrastRatio(foreground, background);
  if (currentRatio >= minRatio) return foreground;

  const bgLuminance = getLuminance(background);
  const needsDarker = bgLuminance > 0.5;

  // Adjust the foreground color
  const rgb = hexToRgb(foreground);
  if (!rgb) return foreground;

  let { r, g, b } = rgb;
  const step = needsDarker ? -10 : 10;

  for (let i = 0; i < 25; i++) {
    r = Math.max(0, Math.min(255, r + step));
    g = Math.max(0, Math.min(255, g + step));
    b = Math.max(0, Math.min(255, b + step));

    const newHex = `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

    if (getContrastRatio(newHex, background) >= minRatio) {
      return newHex;
    }
  }

  // Fallback to pure black or white
  return needsDarker ? "#000000" : "#ffffff";
}

// ============ Focus Management ============

/**
 * Trap focus within a container (for modals/dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);
  firstElement?.focus();

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Restore focus to an element when component unmounts
 */
export function useFocusReturn(): {
  saveFocus: () => void;
  restoreFocus: () => void;
} {
  let savedElement: HTMLElement | null = null;

  return {
    saveFocus: () => {
      savedElement = document.activeElement as HTMLElement;
    },
    restoreFocus: () => {
      savedElement?.focus();
    },
  };
}

// ============ Screen Reader Announcements ============

let announcer: HTMLElement | null = null;

/**
 * Create or get the live region announcer element
 */
function getAnnouncer(): HTMLElement {
  if (announcer) return announcer;

  announcer = document.createElement("div");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  announcer.setAttribute("role", "status");
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcer);

  return announcer;
}

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  const announcer = getAnnouncer();
  announcer.setAttribute("aria-live", priority);

  // Clear and set new message (needed for repeated messages)
  announcer.textContent = "";
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

/**
 * Announce that a region has been updated
 */
export function announceRegionUpdate(regionName: string, changeDescription: string): void {
  announce(`${regionName}: ${changeDescription}`);
}

// ============ Reduced Motion ============

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get appropriate animation duration based on user preference
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

/**
 * Get appropriate transition class based on user preference
 */
export function getTransitionClass(defaultClass: string): string {
  return prefersReducedMotion() ? "" : defaultClass;
}

// ============ Keyboard Navigation ============

/**
 * Handle arrow key navigation in a list
 */
export function handleListKeyDown(
  e: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onSelect: (index: number) => void,
  orientation: "vertical" | "horizontal" = "vertical"
): void {
  const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

  switch (e.key) {
    case prevKey:
      e.preventDefault();
      onSelect(currentIndex > 0 ? currentIndex - 1 : itemCount - 1);
      break;
    case nextKey:
      e.preventDefault();
      onSelect(currentIndex < itemCount - 1 ? currentIndex + 1 : 0);
      break;
    case "Home":
      e.preventDefault();
      onSelect(0);
      break;
    case "End":
      e.preventDefault();
      onSelect(itemCount - 1);
      break;
  }
}

// ============ Skip Links ============

/**
 * Create skip link targets
 */
export const skipLinkTargets = {
  mainContent: "main-content",
  navigation: "main-navigation",
  dashboard: "dashboard-area",
  charts: "charts-area",
};

/**
 * Generate skip link HTML
 */
export function getSkipLinkHtml(): string {
  return `
    <a href="#${skipLinkTargets.mainContent}" class="skip-link">Skip to main content</a>
    <a href="#${skipLinkTargets.navigation}" class="skip-link">Skip to navigation</a>
  `;
}

// ============ ARIA Helpers ============

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = "aria"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Create ARIA description for chart
 */
export function describeChart(
  chartType: string,
  title: string,
  dataPoints: number,
  summary?: string
): string {
  let description = `${chartType} chart titled "${title}" with ${dataPoints} data points.`;
  if (summary) {
    description += ` ${summary}`;
  }
  return description;
}

/**
 * Create ARIA description for KPI card
 */
export function describeKPI(
  title: string,
  value: string | number,
  trend?: "up" | "down" | "flat",
  trendValue?: number
): string {
  let description = `${title}: ${value}`;
  if (trend && trendValue !== undefined) {
    const trendWord = trend === "up" ? "increased" : trend === "down" ? "decreased" : "unchanged";
    description += `, ${trendWord} by ${Math.abs(trendValue)}%`;
  }
  return description;
}

// ============ Color Blindness Helpers ============

/**
 * Color palettes designed for color blindness accessibility
 */
export const accessibleColorPalettes = {
  // Okabe-Ito palette - optimized for all types of color blindness
  okabeIto: [
    "#E69F00", // Orange
    "#56B4E9", // Sky Blue
    "#009E73", // Bluish Green
    "#F0E442", // Yellow
    "#0072B2", // Blue
    "#D55E00", // Vermilion
    "#CC79A7", // Reddish Purple
    "#000000", // Black
  ],
  
  // High contrast palette
  highContrast: [
    "#000000", // Black
    "#0000FF", // Blue
    "#FF0000", // Red
    "#00FF00", // Green
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#FFFFFF", // White
  ],
  
  // Monochrome safe (works in grayscale)
  monoSafe: [
    "#1a1a1a",
    "#4d4d4d",
    "#808080",
    "#b3b3b3",
    "#e6e6e6",
  ],
};

/**
 * Check if a color palette is distinguishable for common color blindness types
 */
export function isColorBlindSafe(colors: string[]): boolean {
  // Simplified check - ensure minimum luminance difference between adjacent colors
  for (let i = 0; i < colors.length - 1; i++) {
    const l1 = getLuminance(colors[i]);
    const l2 = getLuminance(colors[i + 1]);
    if (Math.abs(l1 - l2) < 0.1) {
      return false;
    }
  }
  return true;
}

// ============ Text Alternatives ============

/**
 * Generate alt text for data visualization images
 */
export function generateChartAltText(
  chartType: string,
  title: string,
  data: Array<{ label: string; value: number }>,
  maxItems: number = 5
): string {
  const topItems = data
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  const itemDescriptions = topItems
    .map((item) => `${item.label}: ${item.value.toLocaleString()}`)
    .join(", ");

  return `${chartType} chart showing ${title}. Top values: ${itemDescriptions}${
    data.length > maxItems ? `, and ${data.length - maxItems} more items` : ""
  }.`;
}

// ============ Form Accessibility ============

/**
 * Generate accessible error message structure
 */
export function createFieldError(
  fieldId: string,
  errorMessage: string
): { id: string; ariaDescribedBy: string; errorHtml: string } {
  const errorId = `${fieldId}-error`;
  return {
    id: errorId,
    ariaDescribedBy: errorId,
    errorHtml: `<span id="${errorId}" role="alert" class="text-destructive text-sm">${errorMessage}</span>`,
  };
}
