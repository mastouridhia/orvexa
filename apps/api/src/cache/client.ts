import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// lazyConnect: don't throw on startup if Redis is down — cache simply won't work
export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  logger.warn({ err }, 'Redis error — cache disabled for this request');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — running without cache');
  }
}
