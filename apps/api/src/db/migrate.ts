import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

async function main() {
  console.log('[db] running drizzle migrations from', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('[db] migrations complete');
  await pool.end();
}

main().catch(async (err) => {
  console.error('[db] migration failed:', err);
  await pool.end();
  process.exit(1);
});
