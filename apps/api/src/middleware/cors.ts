import cors, { type CorsOptions } from 'cors';
import { config } from '../config.js';

const allowed = new Set(config.clientOrigins);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowed.has(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed: ${origin}`));
  },
  credentials: true,
  exposedHeaders: ['X-Request-Id'],
};

export const corsMiddleware = cors(corsOptions);
