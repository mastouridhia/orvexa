/* eslint-disable no-console */
/**
 * Demo tenant seed (35.3) — a self-contained, idempotent script that stands up a
 * fictional Pro-tier pizzeria ("Pizza Corner") for live sales pitches without
 * ever touching a real client's data.
 *
 * Run:  npm run db:seed:demo -w @orvexa/api
 *
 * On first run it creates the restaurant + admin user + tables; on every run it
 * resets the menu (and clears demo orders) so a pitch always starts clean.
 * Credentials are printed at the end. Override via env if needed:
 *   DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_TABLES
 */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { and, eq, inArray } from 'drizzle-orm';
import { db, pool } from './client.js';
import {
  categories,
  dishes,
  orders,
  orderItemVariants,
  orderItems,
  payments,
  restaurants,
  tables,
  users,
  variantGroups,
  variants,
} from './schema/index.js';
import { config } from '../config.js';
import { DEMO_MENU } from './demo/menu-data.js';

// Distinct from the dev/test seed restaurant (slug `demo` = "Le Petit Tunis"),
// so seeding the sales demo never clobbers fixture data the test suite relies on.
const SLUG = 'pizza-corner';
const NAME = 'Pizza Corner (Démo)';
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? 'admin@demo.orvexa.tn';
// One shared password for every demo role keeps a live pitch friction-free.
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? 'DemoOrvexa2026!';
const TABLE_COUNT = Number(process.env.DEMO_TABLES ?? 8);
const PLAN = 3; // Pro — exercises ordering, kitchen, waiter, reports.

// All four roles so the full multi-screen demo (admin + KDS + waiter) works out
// of the box without hand-creating staff. Pro plan unlocks every role.
const STAFF: { email: string; name: string; role: 'admin' | 'manager' | 'kitchen' | 'waiter' }[] = [
  { email: ADMIN_EMAIL, name: 'Démo Manager', role: 'admin' },
  { email: 'manager@demo.orvexa.tn', name: 'Démo Gérant', role: 'manager' },
  { email: 'kitchen@demo.orvexa.tn', name: 'Démo Cuisine', role: 'kitchen' },
  { email: 'waiter@demo.orvexa.tn', name: 'Démo Serveur', role: 'waiter' },
];

async function ensureRestaurant(): Promise<{ id: string; created: boolean }> {
  const [existing] = await db.select().from(restaurants).where(eq(restaurants.slug, SLUG));
  if (existing) {
    console.log(`[seed-demo] reusing restaurant "${existing.name}" (id=${existing.id})`);
    return { id: existing.id, created: false };
  }

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      slug: SLUG,
      name: NAME,
      currency: 'TND',
      taxPercent: 0, // Clean, what-you-see totals for a pitch.
      servicePercent: 0,
      timezone: 'Africa/Tunis',
      plan: PLAN,
      perTableQr: true,
      extraTables: 0,
    })
    .returning();
  if (!restaurant) throw new Error('[seed-demo] failed to insert restaurant');
  console.log(`[seed-demo] created restaurant "${restaurant.name}" (id=${restaurant.id})`);
  return { id: restaurant.id, created: true };
}

async function ensureStaff(restaurantId: string): Promise<void> {
  const passwordHash = await hash(PASSWORD);
  for (const s of STAFF) {
    // Email is unique per-restaurant (not global), so scope the lookup to this tenant.
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.restaurantId, restaurantId), eq(users.email, s.email)));
    if (existing) {
      console.log(`[seed-demo] ${s.role} ${s.email} already exists — leaving password unchanged`);
      continue;
    }
    await db.insert(users).values({
      restaurantId,
      email: s.email,
      name: s.name,
      role: s.role,
      passwordHash,
    });
    console.log(`[seed-demo] created ${s.role} ${s.email}`);
  }
}

async function ensureTables(restaurantId: string): Promise<string | null> {
  const existing = await db
    .select({ id: tables.id, publicSlug: tables.publicSlug })
    .from(tables)
    .where(eq(tables.restaurantId, restaurantId));
  if (existing.length > 0) {
    console.log(`[seed-demo] ${existing.length} tables already present`);
    return existing[0]?.publicSlug ?? null;
  }
  const inserted = await db
    .insert(tables)
    .values(
      Array.from({ length: TABLE_COUNT }, (_, i) => ({
        restaurantId,
        label: `Table ${i + 1}`,
        seats: 4,
      })),
    )
    .returning({ publicSlug: tables.publicSlug });
  console.log(`[seed-demo] created ${inserted.length} tables`);
  return inserted[0]?.publicSlug ?? null;
}

async function clearMenuAndOrders(restaurantId: string): Promise<void> {
  // Orders first (FK chain: payments / order_item_variants / order_items → orders).
  const existingOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.restaurantId, restaurantId));
  if (existingOrders.length > 0) {
    const orderIds = existingOrders.map((o) => o.id);
    const existingItems = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));
    if (existingItems.length > 0) {
      const itemIds = existingItems.map((i) => i.id);
      await db.delete(orderItemVariants).where(inArray(orderItemVariants.orderItemId, itemIds));
      await db.delete(orderItems).where(inArray(orderItems.id, itemIds));
    }
    await db.delete(payments).where(inArray(payments.orderId, orderIds));
    await db.delete(orders).where(inArray(orders.id, orderIds));
  }

  // Then the menu (variants → groups → dishes → categories).
  const existingDishes = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(eq(dishes.restaurantId, restaurantId));
  if (existingDishes.length > 0) {
    const dishIds = existingDishes.map((d) => d.id);
    const existingGroups = await db
      .select({ id: variantGroups.id })
      .from(variantGroups)
      .where(inArray(variantGroups.dishId, dishIds));
    if (existingGroups.length > 0) {
      const groupIds = existingGroups.map((g) => g.id);
      await db.delete(variants).where(inArray(variants.groupId, groupIds));
      await db.delete(variantGroups).where(inArray(variantGroups.id, groupIds));
    }
    await db.delete(dishes).where(inArray(dishes.id, dishIds));
  }
  await db.delete(categories).where(eq(categories.restaurantId, restaurantId));
}

async function seedMenu(restaurantId: string): Promise<void> {
  let totalCategories = 0;
  let totalDishes = 0;
  let totalGroups = 0;
  let totalVariants = 0;

  for (const [catIdx, cat] of DEMO_MENU.entries()) {
    const [insertedCat] = await db
      .insert(categories)
      .values({
        restaurantId,
        nameAr: cat.nameAr,
        nameFr: cat.nameFr,
        nameEn: cat.nameEn,
        sortOrder: catIdx + 1,
      })
      .returning();
    if (!insertedCat) throw new Error(`[seed-demo] failed to insert category ${cat.nameFr}`);
    totalCategories++;

    for (const [dishIdx, dish] of cat.dishes.entries()) {
      const [insertedDish] = await db
        .insert(dishes)
        .values({
          restaurantId,
          categoryId: insertedCat.id,
          nameAr: dish.nameAr,
          nameFr: dish.nameFr,
          nameEn: dish.nameEn,
          descriptionFr: dish.descriptionFr,
          priceMillimes: dish.priceMillimes,
          sortOrder: dishIdx + 1,
        })
        .returning();
      if (!insertedDish) throw new Error(`[seed-demo] failed to insert dish ${dish.nameFr}`);
      totalDishes++;

      for (const [groupIdx, group] of (dish.groups ?? []).entries()) {
        const [insertedGroup] = await db
          .insert(variantGroups)
          .values({
            dishId: insertedDish.id,
            nameAr: group.nameAr,
            nameFr: group.nameFr,
            nameEn: group.nameEn,
            selectionType: group.selectionType,
            required: group.required,
            minChoices: group.minChoices,
            maxChoices: group.maxChoices,
            sortOrder: groupIdx + 1,
          })
          .returning();
        if (!insertedGroup) throw new Error('[seed-demo] failed to insert variant group');
        totalGroups++;

        if (group.variants.length > 0) {
          await db.insert(variants).values(
            group.variants.map((v, vIdx) => ({
              groupId: insertedGroup.id,
              nameAr: v.nameAr,
              nameFr: v.nameFr,
              nameEn: v.nameEn,
              priceDeltaMillimes: v.priceDeltaMillimes,
              sortOrder: vIdx + 1,
            })),
          );
          totalVariants += group.variants.length;
        }
      }
    }
    console.log(`[seed-demo]   ✓ ${cat.nameFr} (${cat.dishes.length} dishes)`);
  }

  console.log('[seed-demo] menu seeded');
  console.log(`  categories: ${totalCategories}`);
  console.log(`  dishes:     ${totalDishes}`);
  console.log(`  groups:     ${totalGroups}`);
  console.log(`  variants:   ${totalVariants}`);
}

async function main() {
  console.log('[seed-demo] starting');
  const { id: restaurantId } = await ensureRestaurant();
  await ensureStaff(restaurantId);
  const firstTableSlug = await ensureTables(restaurantId);
  console.log('[seed-demo] resetting menu…');
  await clearMenuAndOrders(restaurantId);
  await seedMenu(restaurantId);

  console.log('\n[seed-demo] ───────── pitch credentials ─────────');
  console.log(`  Plan:        Pro (3) — ordering + kitchen + waiter + reports`);
  console.log(`  Password (all roles): ${PASSWORD}`);
  for (const s of STAFF) {
    console.log(`  ${s.role.padEnd(8)} ${s.email}`);
  }
  if (firstTableSlug) {
    console.log(`  Customer QR: ${config.customer.appUrl}/t/${firstTableSlug}  (Table 1)`);
  }
  console.log(`  View-only:   ${config.customer.appUrl}/m/${SLUG}  (shareable menu link)`);
  console.log('[seed-demo] done');
}

main()
  .catch((err) => {
    console.error('[seed-demo] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
