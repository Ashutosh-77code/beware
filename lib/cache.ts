const store = new Map<string, { exp: number; value: unknown }>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  store.set(key, { exp: Date.now() + ttlMs, value });
}
