import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { db, pool } from './db/index.js';
import { restaurants } from './db/schema/restaurants.js';
import { attachRealtime } from './realtime/server.js';
import { closeDayForRestaurant } from './services/close-day.js';
import { getBus } from './realtime/bus.js';
import { connectRedis, redis } from './cache/client.js';

const app = createApp();
const httpServer = createServer(app);
const { io } = attachRealtime(httpServer);

void connectRedis();

httpServer.listen(config.port, () => {
  logger.info({ port: config.port, env: config.env }, 'api listening');
  scheduleMidnightReset();
});

let midnightTimer: ReturnType<typeof setTimeout> | null = null;

function msUntilNextUtcMidnight(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 30),
  );
  return next.getTime() - now.getTime();
}

function scheduleMidnightReset(): void {
  const delay = msUntilNextUtcMidnight();
  midnightTimer = setTimeout(() => {
    void runMidnightReset().finally(() => scheduleMidnightReset());
  }, delay);
  logger.info({ nextRunInSeconds: Math.round(delay / 1000) }, 'midnight day-close scheduled');
}

async function runMidnightReset(): Promise<void> {
  logger.info('midnight day-close running');
  try {
    const allRestaurants = await db.select({ id: restaurants.id }).from(restaurants);
    for (const r of allRestaurants) {
      try {
        const result = await closeDayForRestaurant(r.id);
        getBus().dayClosed(r.id, result.closedAt);
        logger.info({ restaurantId: r.id, ...result }, 'midnight day-close complete');
      } catch (err) {
        logger.error({ err, restaurantId: r.id }, 'midnight day-close failed for restaurant');
      }
    }
  } catch (err) {
    logger.error({ err }, 'midnight day-close: failed to list restaurants');
  }
}

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutdown requested');

  const forceTimer = setTimeout(() => {
    logger.error('shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, config.shutdown.timeoutMs);
  forceTimer.unref();

  try {
    if (midnightTimer !== null) clearTimeout(midnightTimer);
    io.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
    redis.disconnect();
    logger.info('shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'error during shutdown');
    process.exit(1);
  }
}

(['SIGINT', 'SIGTERM'] as const).forEach((signal) => {
  process.on(signal, () => {
    void shutdown(signal);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  void shutdown('SIGTERM');
});
