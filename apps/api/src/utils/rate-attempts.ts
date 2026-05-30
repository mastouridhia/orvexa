import { redis } from '../cache/client.js';

/**
 * Small failed-attempt counter for brute-force protection (e.g. table-code
 * guessing). Uses Redis when available so it survives across workers, and
 * falls back to an in-memory map (single instance / tests) when Redis is down.
 */
const mem = new Map<string, { count: number; expiresAt: number }>();
const isTest = process.env.NODE_ENV === 'test';

export async function bumpAttempts(key: string, windowSeconds: number): Promise<number> {
  if (!isTest) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      return count;
    } catch {
      // Redis down — fall through to the in-memory counter.
    }
  }
  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || entry.expiresAt <= now) {
    mem.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

export async function resetAttempts(key: string): Promise<void> {
  mem.delete(key);
  if (isTest) return;
  try {
    await redis.del(key);
  } catch {
    // ignore — counter will expire on its own
  }
}
