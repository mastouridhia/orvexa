import { redis } from './client.js';

const isTest = process.env.NODE_ENV === 'test';

/**
 * Try to get a cached value. Returns null if cache is down or key is missing.
 * No-ops in test environment to prevent cross-test cache pollution.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isTest) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Store a value. Silently no-ops if cache is down or in test environment.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (isTest) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // cache down — proceed without caching
  }
}

/**
 * Delete one or more keys. Silently no-ops if cache is down or in test environment.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (isTest || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // cache down — data still consistent in DB
  }
}
