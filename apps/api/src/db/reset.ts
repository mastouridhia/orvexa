import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, pool } from './client.js';

async function main() {
  console.log('[reset] dropping public schema');
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  console.log('[reset] done — run db:migrate next to rebuild');
}

main()
  .catch((err) => {
    console.error('[reset] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
