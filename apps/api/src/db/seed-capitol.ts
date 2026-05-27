/* eslint-disable no-console */
import 'dotenv/config';
import { eq, inArray } from 'drizzle-orm';
import { db, pool } from './client.js';
import { categories, dishes, restaurants, variantGroups, variants } from './schema/index.js';
import { CAPITOL_MENU } from './capitol/menu-data.js';

const SLUG = 'capitol-park';

async function main() {
  console.log('[seed-capitol] looking up restaurant…');
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, SLUG));
  if (!restaurant) {
    throw new Error(`[seed-capitol] restaurant slug="${SLUG}" not found — run db:provision first`);
  }
  console.log(`[seed-capitol] restaurant ${restaurant.name} (id=${restaurant.id})`);

  console.log('[seed-capitol] clearing existing menu data for Capitol Park…');
  const existingDishes = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(eq(dishes.restaurantId, restaurant.id));
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
  await db.delete(categories).where(eq(categories.restaurantId, restaurant.id));

  let totalCategories = 0;
  let totalDishes = 0;
  let totalGroups = 0;
  let totalVariants = 0;

  for (const [catIdx, cat] of CAPITOL_MENU.entries()) {
    const [insertedCat] = await db
      .insert(categories)
      .values({
        restaurantId: restaurant.id,
        nameAr: cat.nameAr,
        nameFr: cat.nameFr,
        nameEn: cat.nameEn,
        sortOrder: catIdx + 1,
      })
      .returning();
    if (!insertedCat) throw new Error(`[seed-capitol] failed to insert category ${cat.nameFr}`);
    totalCategories++;

    for (const [dishIdx, dish] of cat.dishes.entries()) {
      const [insertedDish] = await db
        .insert(dishes)
        .values({
          restaurantId: restaurant.id,
          categoryId: insertedCat.id,
          nameAr: dish.nameAr,
          nameFr: dish.nameFr,
          nameEn: dish.nameEn,
          descriptionFr: dish.descriptionFr,
          priceMillimes: dish.priceMillimes,
          sortOrder: dishIdx + 1,
        })
        .returning();
      if (!insertedDish) throw new Error(`[seed-capitol] failed to insert dish ${dish.nameFr}`);
      totalDishes++;

      if (dish.groups) {
        for (const [groupIdx, group] of dish.groups.entries()) {
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
          if (!insertedGroup) throw new Error(`[seed-capitol] failed to insert variant group`);
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
    }
    console.log(`[seed-capitol]   ✓ ${cat.nameFr} (${cat.dishes.length} dishes)`);
  }

  console.log('[seed-capitol] done');
  console.log(`  categories: ${totalCategories}`);
  console.log(`  dishes:     ${totalDishes}`);
  console.log(`  groups:     ${totalGroups}`);
  console.log(`  variants:   ${totalVariants}`);
}

main()
  .catch((err) => {
    console.error('[seed-capitol] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
