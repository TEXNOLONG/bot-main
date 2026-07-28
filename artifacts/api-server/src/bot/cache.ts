import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "osint_cache.json");

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

function loadCache(): Record<string, CacheEntry<any>> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

function saveCache(cache: Record<string, CacheEntry<any>>): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

let _cache: Record<string, CacheEntry<any>> = loadCache();

// TTL: 24 hours in milliseconds
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

/** Get cached data, or null if expired/missing */
export function getCache<T>(key: string): T | null {
  const entry = _cache[key];
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    delete _cache[key];
    return null;
  }
  return entry.data as T;
}

/** Set cache entry with default TTL (24h) */
export function setCache<T>(key: string, data: T, ttlMs?: number): void {
  _cache[key] = {
    data,
    expiresAt: Date.now() + (ttlMs ?? DEFAULT_TTL),
  };
  scheduleSave();
}

/** Remove a specific cache entry */
export function invalidateCache(key: string): void {
  delete _cache[key];
  scheduleSave();
}

/** Clear all expired entries */
export function cleanupCache(): void {
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(_cache)) {
    if (_cache[key].expiresAt <= now) {
      delete _cache[key];
      changed = true;
    }
  }
  if (changed) saveCache(_cache);
}

/** Get cache stats */
export function getCacheStats(): { total: number; expired: number } {
  const now = Date.now();
  let expired = 0;
  for (const key of Object.keys(_cache)) {
    if (_cache[key].expiresAt <= now) expired++;
  }
  return { total: Object.keys(_cache).length, expired };
}

// ─── Deferred save ───────────────────────────────────────────────────────────
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    saveCache(_cache);
  }, 3000);
}

// Flush on shutdown
process.once("SIGINT", () => { saveCache(_cache); });
process.once("SIGTERM", () => { saveCache(_cache); });

/** Clear all cache entries (admin) */
export function clearAllCache(): void {
  _cache = {};
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch {}
}
