import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: config.db.maxConnections,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
});

pool.on('error', (err) => {
  logger.error({ err }, 'pg pool error');
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
export { schema };
