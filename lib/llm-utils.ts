/**
 * LLM Utilities - Token counting, caching, and usage monitoring
 */

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Estimate token count for a string
 * Uses a simple heuristic: ~4 characters per token for English text
 * For JSON, it's closer to ~3 characters per token due to structure
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Check if it looks like JSON (more dense)
  const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
  const charsPerToken = isJson ? 3 : 4;
  
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Estimate tokens for an object (converts to JSON first)
 */
export function estimateObjectTokens(obj: unknown): number {
  if (obj === null || obj === undefined) return 0;
  return estimateTokens(JSON.stringify(obj));
}

// ============================================
// USAGE TRACKING
// ============================================

export interface TokenUsage {
  timestamp: number;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  latencyMs?: number;
}

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgLatencyMs: number;
  requestsByEndpoint: Record<string, number>;
  tokensByEndpoint: Record<string, number>;
}

// In-memory usage log (last 100 requests)
const usageLog: TokenUsage[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Log token usage for a request
 */
export function logTokenUsage(usage: TokenUsage): void {
  usageLog.push(usage);
  
  // Keep only last MAX_LOG_SIZE entries
  if (usageLog.length > MAX_LOG_SIZE) {
    usageLog.shift();
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LLM Usage] ${usage.endpoint}:`, {
      input: `${usage.inputTokens} tokens`,
      output: `${usage.outputTokens} tokens`,
      total: `${usage.totalTokens} tokens`,
      latency: usage.latencyMs ? `${usage.latencyMs}ms` : 'N/A',
    });
  }
}

/**
 * Get usage statistics
 */
export function getUsageStats(): UsageStats {
  if (usageLog.length === 0) {
    return {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      avgLatencyMs: 0,
      requestsByEndpoint: {},
      tokensByEndpoint: {},
    };
  }
  
  const stats: UsageStats = {
    totalRequests: usageLog.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    avgInputTokens: 0,
    avgOutputTokens: 0,
    avgLatencyMs: 0,
    requestsByEndpoint: {},
    tokensByEndpoint: {},
  };
  
  let totalLatency = 0;
  let latencyCount = 0;
  
  for (const usage of usageLog) {
    stats.totalInputTokens += usage.inputTokens;
    stats.totalOutputTokens += usage.outputTokens;
    stats.totalTokens += usage.totalTokens;
    
    if (usage.latencyMs) {
      totalLatency += usage.latencyMs;
      latencyCount++;
    }
    
    // By endpoint
    stats.requestsByEndpoint[usage.endpoint] = (stats.requestsByEndpoint[usage.endpoint] || 0) + 1;
    stats.tokensByEndpoint[usage.endpoint] = (stats.tokensByEndpoint[usage.endpoint] || 0) + usage.totalTokens;
  }
  
  stats.avgInputTokens = Math.round(stats.totalInputTokens / stats.totalRequests);
  stats.avgOutputTokens = Math.round(stats.totalOutputTokens / stats.totalRequests);
  stats.avgLatencyMs = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
  
  return stats;
}

/**
 * Get recent usage log
 */
export function getUsageLog(): TokenUsage[] {
  return [...usageLog];
}

/**
 * Clear usage log
 */
export function clearUsageLog(): void {
  usageLog.length = 0;
}

// ============================================
// STATISTICS CACHING
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
}

// Simple in-memory cache
const statisticsCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a simple hash for cache key
 */
function generateHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Get cached statistics or compute them
 */
export function getCachedStatistics<T>(
  cacheKey: string,
  dataHash: string,
  computeFn: () => T
): { data: T; fromCache: boolean } {
  const cached = statisticsCache.get(cacheKey);
  const now = Date.now();
  
  // Check if cache is valid
  if (cached && cached.hash === dataHash && (now - cached.timestamp) < CACHE_TTL_MS) {
    return { data: cached.data as T, fromCache: true };
  }
  
  // Compute new value
  const data = computeFn();
  
  // Store in cache
  statisticsCache.set(cacheKey, {
    data,
    timestamp: now,
    hash: dataHash,
  });
  
  return { data, fromCache: false };
}

/**
 * Generate hash for raw data (fast check based on length and sample)
 */
export function generateDataHash(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return 'empty';
  
  // Use length + first row + last row for fast hash
  const sample = {
    len: data.length,
    first: data[0],
    last: data[data.length - 1],
  };
  
  return generateHash(sample);
}

/**
 * Clear statistics cache
 */
export function clearStatisticsCache(): void {
  statisticsCache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: statisticsCache.size,
    keys: Array.from(statisticsCache.keys()),
  };
}

// ============================================
// PROMPT BUILDER WITH TOKEN TRACKING
// ============================================

export interface PromptSection {
  name: string;
  content: string;
  tokens: number;
}

export class PromptBuilder {
  private sections: PromptSection[] = [];
  private maxTokens: number;
  
  constructor(maxTokens: number = 8000) {
    this.maxTokens = maxTokens;
  }
  
  /**
   * Add a section to the prompt
   */
  addSection(name: string, content: string): this {
    const tokens = estimateTokens(content);
    this.sections.push({ name, content, tokens });
    return this;
  }
  
  /**
   * Add JSON content as a section
   */
  addJsonSection(name: string, data: unknown, pretty: boolean = true): this {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    return this.addSection(name, content);
  }
  
  /**
   * Get total tokens
   */
  getTotalTokens(): number {
    return this.sections.reduce((sum, s) => sum + s.tokens, 0);
  }
  
  /**
   * Get token breakdown by section
   */
  getTokenBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const section of this.sections) {
      breakdown[section.name] = section.tokens;
    }
    breakdown['_total'] = this.getTotalTokens();
    return breakdown;
  }
  
  /**
   * Check if under token limit
   */
  isUnderLimit(): boolean {
    return this.getTotalTokens() <= this.maxTokens;
  }
  
  /**
   * Build the final prompt
   */
  build(): string {
    return this.sections.map(s => s.content).join('\n\n');
  }
  
  /**
   * Build with warnings if over limit
   */
  buildWithWarning(): { prompt: string; warning?: string; tokens: number } {
    const tokens = this.getTotalTokens();
    const prompt = this.build();
    
    if (tokens > this.maxTokens) {
      return {
        prompt,
        warning: `Prompt exceeds recommended limit: ${tokens}/${this.maxTokens} tokens`,
        tokens,
      };
    }
    
    return { prompt, tokens };
  }
}
