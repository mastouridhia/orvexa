import 'dotenv/config';
import { db, pool } from './client.js';
import { seedDemoData, DEMO_PASSWORD } from './seed-data.js';

async function main() {
  console.log('[seed] starting');
  const ids = await seedDemoData(db);
  console.log(`[seed] demo restaurant id=${ids.restaurantId}`);
  console.log(`[seed] staff password: ${DEMO_PASSWORD}`);
  console.log('[seed] done');
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
