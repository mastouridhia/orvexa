import { resolve } from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { globalRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(requestLogger);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(corsMiddleware);

  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.bodyLimit }));

  app.use(globalRateLimit);

  app.use('/uploads', express.static(resolve(process.cwd(), config.uploads.dir), {
    maxAge: '7d',
    index: false,
  }));

  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
