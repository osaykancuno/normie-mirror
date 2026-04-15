// NormieSticker — Simple cache (memory + localStorage)

const memCache = new Map();
const STORAGE_PREFIX = 'normie_cache_';
const TTL = 60 * 60 * 1000; // 1 hour

function storageKey(key) {
  return STORAGE_PREFIX + key;
}

export function getCached(key) {
  // Memory first
  if (memCache.has(key)) {
    const entry = memCache.get(key);
    if (Date.now() - entry.ts < TTL) return entry.data;
    memCache.delete(key);
  }

  // localStorage fallback
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw) {
      const entry = JSON.parse(raw);
      if (Date.now() - entry.ts < TTL) {
        memCache.set(key, entry);
        return entry.data;
      }
      localStorage.removeItem(storageKey(key));
    }
  } catch (e) { /* ignore */ }

  return null;
}

export function setCache(key, data) {
  const entry = { data, ts: Date.now() };
  memCache.set(key, entry);
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch (e) { /* storage full, ignore */ }
}

// Cached fetch wrapper
export async function cachedFetch(key, fetchFn) {
  const cached = getCached(key);
  if (cached) return cached;
  const data = await fetchFn();
  setCache(key, data);
  return data;
}
