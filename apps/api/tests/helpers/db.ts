import './env.js';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../src/db/client.js';
import { restaurants, users, tables, categories, dishes } from '../../src/db/schema/index.js';
import { seedDemoData, type SeededIds } from '../../src/db/seed-data.js';

export { db, pool };

/**
 * Truncates only the transactional tables — orders, payments, sessions, waiter-calls, day tokens, audit log.
 * The fixture data (restaurants, users, tables, menu) survives so tests share the same seed without
 * re-running argon2 + the full seed every test.
 */
/**
 * Truncates all tables and re-seeds the demo fixture. Use in tests that mutate
 * menu/restaurant/staff fixture data and need a clean slate.
 */
export async function fullResetAndReseed(): Promise<SeededIds> {
  return seedDemoData(db);
}

export async function resetTransactionalState(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      audit_log, payments, order_item_variants, order_items, orders,
      customer_sessions, waiter_calls, table_day_tokens
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Loads the seeded fixture IDs by re-querying the DB. Cheaper than re-running the seed
 * and works regardless of which test file ran first.
 */
export async function loadSeededIds(): Promise<SeededIds> {
  const r = await db.select().from(restaurants).limit(1);
  if (!r[0]) throw new Error('test fixture missing — run global setup');
  const restaurantId = r[0].id;

  const u = await db.select().from(users);
  const byRole = (role: string) => {
    const found = u.find((x) => x.role === role);
    if (!found) throw new Error(`test fixture missing user role=${role}`);
    return found.id;
  };

  const t = await db.select({ id: tables.id, label: tables.label }).from(tables);
  t.sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }));

  const c = await db.select().from(categories);
  const catBy = (en: string) => {
    const found = c.find((x) => x.nameEn === en);
    if (!found) throw new Error(`test fixture missing category ${en}`);
    return found.id;
  };

  const d = await db.select().from(dishes);
  const dishBy = (en: string) => {
    const found = d.find((x) => x.nameEn === en);
    if (!found) throw new Error(`test fixture missing dish ${en}`);
    return found.id;
  };

  return {
    restaurantId,
    staff: { admin: byRole('admin'), manager: byRole('manager'), kitchen: byRole('kitchen'), waiter: byRole('waiter') },
    tableIds: t.map((x) => x.id),
    categoryIds: { starters: catBy('Starters'), mains: catBy('Mains'), drinks: catBy('Drinks') },
    dishIds: {
      brik: dishBy('Egg Brik'),
      salad: dishBy('Grilled Salad'),
      couscous: dishBy('Chicken Couscous'),
      pasta: dishBy('Spiced Meat Pasta'),
      water: dishBy('Mineral Water'),
      coffee: dishBy('Turkish Coffee'),
    },
  };
}

