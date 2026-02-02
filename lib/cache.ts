/**
 * Smart Caching Layer
 * 
 * Caches API responses and common queries to speed up dashboard loads.
 * Uses localStorage for small data and IndexedDB for larger datasets.
 */

// Cache configuration
const CACHE_PREFIX = "analyst_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  hits: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  oldestEntry: number;
}

// In-memory cache for fastest access
const memoryCache = new Map<string, CacheEntry<unknown>>();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Generate a cache key from query parameters
 */
export function generateCacheKey(
  endpoint: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);
  
  return `${CACHE_PREFIX}${endpoint}_${JSON.stringify(sortedParams)}`;
}

/**
 * Estimate the size of data in bytes
 */
function estimateSize(data: unknown): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * Get data from cache (memory → localStorage → IndexedDB)
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  // 1. Check memory cache first (fastest)
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry) {
    if (Date.now() - memEntry.timestamp < memEntry.ttl) {
      memEntry.hits++;
      cacheHits++;
      return memEntry.data;
    } else {
      // Expired - remove it
      memoryCache.delete(key);
    }
  }

  // 2. Check localStorage
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() - entry.timestamp < entry.ttl) {
        // Promote to memory cache
        memoryCache.set(key, entry);
        cacheHits++;
        return entry.data;
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage might be full or unavailable
  }

  // 3. Check IndexedDB for larger data
  try {
    const dbEntry = await getFromIndexedDB<T>(key);
    if (dbEntry) {
      if (Date.now() - dbEntry.timestamp < dbEntry.ttl) {
        cacheHits++;
        return dbEntry.data;
      } else {
        await deleteFromIndexedDB(key);
      }
    }
  } catch {
    // IndexedDB might not be available
  }

  cacheMisses++;
  return null;
}

/**
 * Store data in cache with TTL
 */
export async function setInCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const size = estimateSize(data);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    size,
    hits: 0,
  };

  // Always store in memory cache
  memoryCache.set(key, entry);

  // For small data, also use localStorage
  if (size < 1024 * 100) { // < 100KB
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage might be full - evict old entries
      evictOldCacheEntries();
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // Still full, skip localStorage
      }
    }
  } else {
    // For larger data, use IndexedDB
    try {
      await setInIndexedDB(key, entry);
    } catch {
      // IndexedDB not available
    }
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  // Clear localStorage cache
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Clear IndexedDB cache
  await clearIndexedDB();

  // Reset stats
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Evict least recently used cache entries
 */
function evictOldCacheEntries(): void {
  const entries: { key: string; timestamp: number; hits: number }[] = [];

  // Collect all cache entries from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || "{}");
        entries.push({ key, timestamp: entry.timestamp || 0, hits: entry.hits || 0 });
      } catch {
        // Invalid entry, mark for removal
        entries.push({ key, timestamp: 0, hits: 0 });
      }
    }
  }

  // Sort by hits (ascending) then by timestamp (oldest first)
  entries.sort((a, b) => {
    if (a.hits !== b.hits) return a.hits - b.hits;
    return a.timestamp - b.timestamp;
  });

  // Remove bottom 25%
  const toRemove = Math.ceil(entries.length * 0.25);
  for (let i = 0; i < toRemove; i++) {
    localStorage.removeItem(entries[i].key);
    memoryCache.delete(entries[i].key);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  let totalSize = 0;
  let oldestEntry = Date.now();

  memoryCache.forEach((entry) => {
    totalSize += entry.size;
    if (entry.timestamp < oldestEntry) {
      oldestEntry = entry.timestamp;
    }
  });

  return {
    totalEntries: memoryCache.size,
    totalSize,
    hitRate: cacheHits + cacheMisses > 0 
      ? (cacheHits / (cacheHits + cacheMisses)) * 100 
      : 0,
    oldestEntry,
  };
}

// ============ IndexedDB Implementation ============

const DB_NAME = "analyst_cache_db";
const STORE_NAME = "cache_store";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

async function getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.entry : null);
      };
    });
  } catch {
    return null;
  }
}

async function setInIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key, entry });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function deleteFromIndexedDB(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearIndexedDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============ Query-Specific Caching ============

/**
 * Cache wrapper for prompt API calls
 */
export async function cachedPromptRequest<T>(
  prompt: string,
  context: Record<string, unknown>,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const key = generateCacheKey("prompt", { prompt, ...context });
  
  // Check cache first
  const cached = await getFromCache<T>(key);
  if (cached) {
    console.log("[Cache] HIT for prompt:", prompt.substring(0, 50));
    return cached;
  }

  // Fetch fresh data
  console.log("[Cache] MISS for prompt:", prompt.substring(0, 50));
  const data = await fetcher();
  
  // Store in cache
  await setInCache(key, data, ttl);
  
  return data;
}

/**
 * Cache wrapper for data fetches
 */
export async function cachedDataFetch<T>(
  dataSource: string,
  filters: Record<string, unknown>,
  fetcher: () => Promise<T>,
  ttl: number = 10 * 60 * 1000 // 10 minutes for data
): Promise<T> {
  const key = generateCacheKey("data", { dataSource, filters });
  
  const cached = await getFromCache<T>(key);
  if (cached) {
    console.log("[Cache] HIT for data:", dataSource);
    return cached;
  }

  console.log("[Cache] MISS for data:", dataSource);
  const data = await fetcher();
  await setInCache(key, data, ttl);
  
  return data;
}

/**
 * Invalidate cache entries matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const regex = new RegExp(pattern);

  // Invalidate memory cache
  const memKeys = Array.from(memoryCache.keys());
  memKeys.forEach((key) => {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  });

  // Invalidate localStorage
  const lsKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && regex.test(key)) {
      lsKeysToRemove.push(key);
    }
  }
  lsKeysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Preload common queries into cache
 */
export async function preloadCache(
  queries: Array<{ key: string; fetcher: () => Promise<unknown>; ttl?: number }>
): Promise<void> {
  await Promise.all(
    queries.map(async ({ key, fetcher, ttl }) => {
      const cached = await getFromCache(key);
      if (!cached) {
        try {
          const data = await fetcher();
          await setInCache(key, data, ttl);
        } catch (error) {
          console.warn("[Cache] Failed to preload:", key, error);
        }
      }
    })
  );
}
