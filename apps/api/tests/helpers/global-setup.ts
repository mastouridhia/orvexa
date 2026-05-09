import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { ADMIN_DATABASE_URL, TEST_DATABASE_NAME, TEST_DATABASE_URL } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

async function ensureDatabase(): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    const exists = await admin.query<{ ok: number }>(
      'SELECT 1 AS ok FROM pg_database WHERE datname = $1',
      [TEST_DATABASE_NAME],
    );
    if (exists.rowCount === 0) {
      const safe = TEST_DATABASE_NAME.replace(/"/g, '""');
      await admin.query(`CREATE DATABASE "${safe}"`);
    }
  } finally {
    await admin.end();
  }
}

async function dropAndRecreateSchemas(): Promise<void> {
  const c = new Client({ connectionString: TEST_DATABASE_URL });
  await c.connect();
  try {
    await c.query('DROP SCHEMA IF EXISTS public CASCADE');
    await c.query('CREATE SCHEMA public');
    await c.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  } finally {
    await c.end();
  }
}

export default async function setup(): Promise<void> {
  await ensureDatabase();
  await dropAndRecreateSchemas();

  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { db, pool } = await import('../../src/db/client.js');
  const { seedDemoData } = await import('../../src/db/seed-data.js');

  await migrate(db, { migrationsFolder });
  await seedDemoData(db);
  await pool.end();
}
