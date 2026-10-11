// Per-process memo with a time-to-live, for reads that are identical across
// callers and are fine slightly stale. Each serverless instance keeps its own
// copy, so this only trims repeat work inside one warm instance - it is not a
// shared cache, and a key must carry everything that changes the answer.
//
// ponytail: entries are pruned on a miss, so size is bounded by the distinct
// keys seen within one TTL window. Swap in an LRU if a caller ever keys on
// something genuinely unbounded.

type Entry<T> = { value: T; expiresAt: number };

export type TtlCache<T> = {
  /** Cached value for `key`, else `load()` - whose result is then cached. */
  get(key: string, load: () => Promise<T>): Promise<T>;
  /** Live entry count, including any not yet pruned. For tests and probes. */
  size(): number;
};

export function ttlCache<T>(ttlMs: number): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();

  return {
    async get(key, load) {
      const now = Date.now();
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now) return hit.value;

      // Missing or stale: drop everything expired while we are here.
      for (const [k, e] of entries) if (e.expiresAt <= now) entries.delete(k);

      // A failed load is never cached - it throws straight through to the caller.
      const value = await load();
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    },
    size() {
      return entries.size;
    },
  };
}
