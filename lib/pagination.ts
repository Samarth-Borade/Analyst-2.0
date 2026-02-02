/**
 * Pagination & Virtual Scrolling Utilities
 * 
 * Handle millions of rows efficiently with:
 * - Chunk-based loading
 * - Virtual scrolling for tables
 * - Efficient data slicing
 */

export interface PaginationState {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  scrollTop: number;
  totalHeight: number;
}

export interface ChunkLoadResult<T> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  chunkIndex: number;
}

// ============ Pagination ============

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  totalRows: number,
  pageSize: number,
  currentPage: number
): PaginationState {
  const totalPages = Math.ceil(totalRows / pageSize);
  const page = Math.max(1, Math.min(currentPage, totalPages));
  
  return {
    page,
    pageSize,
    totalRows,
    totalPages,
  };
}

/**
 * Get a slice of data for the current page
 */
export function getPageData<T>(
  data: T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize;
  return data.slice(startIndex, startIndex + pageSize);
}

/**
 * Generate page numbers for pagination UI
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | "...")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  if (currentPage <= halfVisible + 1) {
    // Near start
    for (let i = 1; i <= maxVisible - 2; i++) {
      pages.push(i);
    }
    pages.push("...");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - halfVisible) {
    // Near end
    pages.push(1);
    pages.push("...");
    for (let i = totalPages - (maxVisible - 3); i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Middle
    pages.push(1);
    pages.push("...");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      pages.push(i);
    }
    pages.push("...");
    pages.push(totalPages);
  }

  return pages;
}

// ============ Virtual Scrolling ============

const DEFAULT_ROW_HEIGHT = 40; // pixels
const OVERSCAN = 5; // Extra rows to render above/below viewport

/**
 * Calculate which items should be visible in a virtualized list
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  totalItems: number,
  rowHeight: number = DEFAULT_ROW_HEIGHT
): VirtualScrollState {
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const endIndex = Math.min(
    totalItems - 1,
    Math.floor(scrollTop / rowHeight) + visibleCount + OVERSCAN
  );

  return {
    startIndex,
    endIndex,
    visibleCount,
    scrollTop,
    totalHeight: totalItems * rowHeight,
  };
}

/**
 * Get the visible slice of data for virtual scrolling
 */
export function getVirtualData<T>(
  data: T[],
  state: VirtualScrollState
): { items: T[]; offsetTop: number } {
  const items = data.slice(state.startIndex, state.endIndex + 1);
  const offsetTop = state.startIndex * DEFAULT_ROW_HEIGHT;
  
  return { items, offsetTop };
}

// ============ Chunk Loading ============

const DEFAULT_CHUNK_SIZE = 10000;

/**
 * Load data in chunks for progressive loading
 */
export function createChunkLoader<T>(
  data: T[],
  chunkSize: number = DEFAULT_CHUNK_SIZE
) {
  let currentChunk = 0;
  const totalChunks = Math.ceil(data.length / chunkSize);

  return {
    loadNextChunk(): ChunkLoadResult<T> | null {
      if (currentChunk >= totalChunks) {
        return null;
      }

      const startIndex = currentChunk * chunkSize;
      const endIndex = Math.min(startIndex + chunkSize, data.length);
      const chunkData = data.slice(startIndex, endIndex);

      const result: ChunkLoadResult<T> = {
        data: chunkData,
        hasMore: currentChunk + 1 < totalChunks,
        totalCount: data.length,
        chunkIndex: currentChunk,
      };

      currentChunk++;
      return result;
    },

    reset(): void {
      currentChunk = 0;
    },

    getTotalChunks(): number {
      return totalChunks;
    },

    getCurrentChunk(): number {
      return currentChunk;
    },
  };
}

/**
 * Lazy load processor - process data in batches to avoid blocking UI
 */
export async function processInChunks<T, R>(
  data: T[],
  processor: (item: T, index: number) => R,
  chunkSize: number = 1000,
  onProgress?: (progress: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const totalChunks = Math.ceil(data.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    
    // Process this chunk
    for (let j = start; j < end; j++) {
      results.push(processor(data[j], j));
    }

    // Report progress
    if (onProgress) {
      onProgress(((i + 1) / totalChunks) * 100);
    }

    // Yield to main thread between chunks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}

// ============ Data Sampling ============

/**
 * Sample data for chart rendering when dataset is too large
 */
export function sampleData<T>(
  data: T[],
  maxPoints: number = 1000,
  strategy: "uniform" | "random" | "lttb" = "lttb"
): T[] {
  if (data.length <= maxPoints) {
    return data;
  }

  switch (strategy) {
    case "uniform":
      return uniformSample(data, maxPoints);
    case "random":
      return randomSample(data, maxPoints);
    case "lttb":
      return lttbSample(data, maxPoints);
    default:
      return uniformSample(data, maxPoints);
  }
}

/**
 * Uniform sampling - take every nth item
 */
function uniformSample<T>(data: T[], maxPoints: number): T[] {
  const step = Math.floor(data.length / maxPoints);
  const sampled: T[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
    if (sampled.length >= maxPoints) break;
  }
  
  // Always include the last point
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  
  return sampled;
}

/**
 * Random sampling
 */
function randomSample<T>(data: T[], maxPoints: number): T[] {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, maxPoints);
}

/**
 * Largest Triangle Three Buckets (LTTB) - preserves visual shape
 * Best for time series data
 */
function lttbSample<T>(
  data: T[],
  threshold: number,
  xAccessor: (d: T, index: number) => number = (_d: T, i: number) => i,
  yAccessor: (d: T) => number = (d: T) => {
    if (typeof d === "number") return d;
    if (typeof d === "object" && d !== null) {
      const val = Object.values(d as Record<string, unknown>).find(
        (v) => typeof v === "number"
      );
      return typeof val === "number" ? val : 0;
    }
    return 0;
  }
): T[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data;
  }

  const sampled: T[] = [];
  
  // Bucket size
  const every = (dataLength - 2) / (threshold - 2);
  
  // Always add the first point
  sampled.push(data[0]);
  
  let a = 0; // Point index in the bucket
  
  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket
    const avgRangeStart = Math.floor((i + 1) * every) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * every) + 1, dataLength);
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    
    let avgX = 0;
    let avgY = 0;
    
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += xAccessor(data[j], j);
      avgY += yAccessor(data[j]);
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;
    
    // Get the range for this bucket
    const rangeOffs = Math.floor(i * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;
    
    // Point A
    const pointAX = xAccessor(data[a], a);
    const pointAY = yAccessor(data[a]);
    
    // Find the point with maximum area
    let maxArea = -1;
    let maxAreaPoint = rangeOffs;
    
    for (let j = rangeOffs; j < rangeTo; j++) {
      // Calculate triangle area
      const area = Math.abs(
        (pointAX - avgX) * (yAccessor(data[j]) - pointAY) -
        (pointAX - xAccessor(data[j], j)) * (avgY - pointAY)
      ) * 0.5;
      
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }
    
    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }
  
  // Always add the last point
  sampled.push(data[dataLength - 1]);
  
  return sampled;
}

// ============ Aggregation for Large Datasets ============

/**
 * Aggregate data for charts when dealing with large datasets
 */
export function aggregateForChart<T extends Record<string, unknown>>(
  data: T[],
  groupBy: string,
  valueField: string,
  aggregation: "sum" | "avg" | "count" | "min" | "max" = "sum",
  maxGroups: number = 100
): Array<{ [key: string]: unknown }> {
  const groups = new Map<string, number[]>();
  
  // Group the data
  for (const row of data) {
    const key = String(row[groupBy] ?? "Unknown");
    const value = Number(row[valueField]) || 0;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(value);
  }
  
  // Aggregate each group
  const aggregated: Array<{ [key: string]: unknown }> = [];
  
  groups.forEach((values, key) => {
    let result: number;
    
    switch (aggregation) {
      case "sum":
        result = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "count":
        result = values.length;
        break;
      case "min":
        result = Math.min(...values);
        break;
      case "max":
        result = Math.max(...values);
        break;
      default:
        result = values.reduce((a, b) => a + b, 0);
    }
    
    aggregated.push({ [groupBy]: key, [valueField]: result });
  });
  
  // Sort by value descending and limit groups
  aggregated.sort((a, b) => 
    (Number(b[valueField]) || 0) - (Number(a[valueField]) || 0)
  );
  
  if (aggregated.length > maxGroups) {
    const top = aggregated.slice(0, maxGroups - 1);
    const others = aggregated.slice(maxGroups - 1);
    const othersTotal = others.reduce(
      (sum, item) => sum + (Number(item[valueField]) || 0),
      0
    );
    
    top.push({ [groupBy]: "Others", [valueField]: othersTotal });
    return top;
  }
  
  return aggregated;
}

// ============ Data Statistics ============

/**
 * Calculate quick statistics for large datasets
 */
export function calculateQuickStats<T extends Record<string, unknown>>(
  data: T[],
  numericFields: string[]
): Record<string, { min: number; max: number; sum: number; avg: number; count: number }> {
  const stats: Record<string, { min: number; max: number; sum: number; count: number }> = {};
  
  // Initialize
  for (const field of numericFields) {
    stats[field] = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
  }
  
  // Single pass through data
  for (const row of data) {
    for (const field of numericFields) {
      const value = Number(row[field]);
      if (!isNaN(value)) {
        stats[field].min = Math.min(stats[field].min, value);
        stats[field].max = Math.max(stats[field].max, value);
        stats[field].sum += value;
        stats[field].count++;
      }
    }
  }
  
  // Calculate averages
  const result: Record<string, { min: number; max: number; sum: number; avg: number; count: number }> = {};
  
  for (const field of numericFields) {
    const s = stats[field];
    result[field] = {
      ...s,
      min: s.min === Infinity ? 0 : s.min,
      max: s.max === -Infinity ? 0 : s.max,
      avg: s.count > 0 ? s.sum / s.count : 0,
    };
  }
  
  return result;
}
