import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { pool } from './db/index.js';
import { attachRealtime } from './realtime/server.js';

const app = createApp();
const httpServer = createServer(app);
const { io } = attachRealtime(httpServer);

httpServer.listen(config.port, () => {
  logger.info({ port: config.port, env: config.env }, 'api listening');
});

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
    io.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
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
