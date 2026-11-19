interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight browser-only TTL cache to eliminate redundant API round-trips
 * across client-side Next.js route transitions.
 */
export class TtlCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    if (typeof window === 'undefined') return undefined;
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (typeof window === 'undefined') return;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
