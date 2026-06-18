import { hash } from '@node-rs/argon2';
import { sql } from 'drizzle-orm';
import type { Db } from './client.js';
import {
  categories,
  dishes,
  restaurants,
  tables,
  users,
  variantGroups,
  variants,
} from './schema/index.js';

export const DEMO_PASSWORD = 'orvexa';

export type SeededIds = {
  restaurantId: string;
  staff: { admin: string; manager: string; kitchen: string; waiter: string };
  tableIds: string[];
  categoryIds: { starters: string; mains: string; drinks: string };
  dishIds: {
    brik: string;
    salad: string;
    couscous: string;
    pasta: string;
    water: string;
    coffee: string;
  };
};

export async function seedDemoData(db: Db): Promise<SeededIds> {
  await db.execute(sql`
    TRUNCATE TABLE
      audit_log, payments, order_item_variants, order_items, orders,
      table_carts, customer_sessions, waiter_calls, table_day_tokens, tables, table_zones,
      variants, variant_groups, dishes, categories, users, restaurants
    RESTART IDENTITY CASCADE
  `);

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      slug: 'demo',
      name: 'Le Petit Tunis',
      defaultLanguage: 'fr',
      supportedLanguages: ['ar', 'fr', 'en'],
      currency: 'TND',
      taxPercent: 19,
      servicePercent: 10,
      timezone: 'Africa/Tunis',
      // Demo/dev/test fixture runs as Pro so every feature (ordering, KDS,
      // waiter, split bills, feedback) is exercisable. Real tenants default to 1.
      plan: 3,
    })
    .returning();
  if (!restaurant) throw new Error('failed to insert restaurant');

  const insertedTables = await db
    .insert(tables)
    .values(
      Array.from({ length: 8 }, (_, i) => ({
        restaurantId: restaurant.id,
        label: `Table ${i + 1}`,
        seats: i < 2 ? 2 : i < 6 ? 4 : 6,
      })),
    )
    .returning();

  const passwordHash = await hash(DEMO_PASSWORD);
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        restaurantId: restaurant.id,
        email: 'admin@demo.tn',
        name: 'Owner',
        role: 'admin',
        passwordHash,
      },
      {
        restaurantId: restaurant.id,
        email: 'manager@demo.tn',
        name: 'Floor Manager',
        role: 'manager',
        passwordHash,
      },
      {
        restaurantId: restaurant.id,
        email: 'kitchen@demo.tn',
        name: 'Kitchen',
        role: 'kitchen',
        passwordHash,
      },
      {
        restaurantId: restaurant.id,
        email: 'waiter@demo.tn',
        name: 'Waiter',
        role: 'waiter',
        passwordHash,
      },
    ])
    .returning();

  const userByRole = (role: string) => {
    const u = insertedUsers.find((x) => x.role === role);
    if (!u) throw new Error(`seed: missing ${role} user`);
    return u.id;
  };

  const [starters, mains, drinks] = await db
    .insert(categories)
    .values([
      {
        restaurantId: restaurant.id,
        nameAr: 'مقبلات',
        nameFr: 'Entrées',
        nameEn: 'Starters',
        sortOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        nameAr: 'أطباق رئيسية',
        nameFr: 'Plats',
        nameEn: 'Mains',
        sortOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        nameAr: 'مشروبات',
        nameFr: 'Boissons',
        nameEn: 'Drinks',
        sortOrder: 3,
      },
    ])
    .returning();
  if (!starters || !mains || !drinks) throw new Error('failed to insert categories');

  const insertedDishes = await db
    .insert(dishes)
    .values([
      {
        restaurantId: restaurant.id,
        categoryId: starters.id,
        nameAr: 'بريك بالبيض',
        nameFr: 'Brik à l’œuf',
        nameEn: 'Egg Brik',
        descriptionFr: 'Feuille de malsouka, œuf, thon, câpres',
        priceMillimes: 4500,
        sortOrder: 1,
        imageUrl: 'https://loremflickr.com/640/480/brik,pastry,tunisian/all',
        imageUrls: ['https://loremflickr.com/640/480/brik,pastry,tunisian/all'],
      },
      {
        restaurantId: restaurant.id,
        categoryId: starters.id,
        nameAr: 'سلطة مشوية',
        nameFr: 'Salade mechouia',
        nameEn: 'Grilled Salad',
        descriptionFr: 'Poivrons grillés, tomates, ail, huile d’olive',
        priceMillimes: 6000,
        sortOrder: 2,
        imageUrl: 'https://loremflickr.com/640/480/salad,grilled,vegetables/all',
        imageUrls: ['https://loremflickr.com/640/480/salad,grilled,vegetables/all'],
      },
      {
        restaurantId: restaurant.id,
        categoryId: mains.id,
        nameAr: 'كسكسي بالدجاج',
        nameFr: 'Couscous poulet',
        nameEn: 'Chicken Couscous',
        priceMillimes: 18000,
        sortOrder: 1,
        imageUrl: 'https://loremflickr.com/640/480/couscous,chicken/all',
        imageUrls: ['https://loremflickr.com/640/480/couscous,chicken/all'],
      },
      {
        restaurantId: restaurant.id,
        categoryId: mains.id,
        nameAr: 'مقرونة ببرك',
        nameFr: 'Macaroni à la viande',
        nameEn: 'Spiced Meat Pasta',
        priceMillimes: 15000,
        sortOrder: 2,
        imageUrl: 'https://loremflickr.com/640/480/pasta,meat,sauce/all',
        imageUrls: ['https://loremflickr.com/640/480/pasta,meat,sauce/all'],
      },
      {
        restaurantId: restaurant.id,
        categoryId: drinks.id,
        nameAr: 'ماء معدني',
        nameFr: 'Eau minérale',
        nameEn: 'Mineral Water',
        priceMillimes: 2000,
        sortOrder: 1,
        imageUrl: 'https://loremflickr.com/640/480/water,bottle/all',
        imageUrls: ['https://loremflickr.com/640/480/water,bottle/all'],
      },
      {
        restaurantId: restaurant.id,
        categoryId: drinks.id,
        nameAr: 'قهوة عربية',
        nameFr: 'Café turc',
        nameEn: 'Turkish Coffee',
        priceMillimes: 3500,
        sortOrder: 2,
        imageUrl: 'https://loremflickr.com/640/480/coffee,turkish,espresso/all',
        imageUrls: ['https://loremflickr.com/640/480/coffee,turkish,espresso/all'],
      },
    ])
    .returning();

  const dishByEn = (name: string) => {
    const d = insertedDishes.find((x) => x.nameEn === name);
    if (!d) throw new Error(`seed: missing dish ${name}`);
    return d.id;
  };

  const brikId = dishByEn('Egg Brik');
  const couscousId = dishByEn('Chicken Couscous');
  const coffeeId = dishByEn('Turkish Coffee');
  const waterId = dishByEn('Mineral Water');

  const [toppingsGroup] = await db
    .insert(variantGroups)
    .values({
      dishId: brikId,
      nameAr: 'الإضافات',
      nameFr: 'Suppléments',
      nameEn: 'Toppings',
      selectionType: 'multi',
      required: false,
      minChoices: 0,
      maxChoices: 5,
      sortOrder: 1,
    })
    .returning();
  if (toppingsGroup) {
    await db.insert(variants).values([
      {
        groupId: toppingsGroup.id,
        nameAr: 'هريسة',
        nameFr: 'Harissa',
        nameEn: 'Harissa',
        priceDeltaMillimes: 0,
        sortOrder: 1,
      },
      {
        groupId: toppingsGroup.id,
        nameAr: 'مايونيز',
        nameFr: 'Mayonnaise',
        nameEn: 'Mayonnaise',
        priceDeltaMillimes: 0,
        sortOrder: 2,
      },
      {
        groupId: toppingsGroup.id,
        nameAr: 'كاتشب',
        nameFr: 'Ketchup',
        nameEn: 'Ketchup',
        priceDeltaMillimes: 0,
        sortOrder: 3,
      },
      {
        groupId: toppingsGroup.id,
        nameAr: 'كبر إضافي',
        nameFr: 'Câpres extra',
        nameEn: 'Extra capers',
        priceDeltaMillimes: 500,
        sortOrder: 4,
      },
      {
        groupId: toppingsGroup.id,
        nameAr: 'بدون تونة',
        nameFr: 'Sans thon',
        nameEn: 'No tuna',
        priceDeltaMillimes: 0,
        sortOrder: 5,
      },
    ]);
  }

  const [spiceGroup] = await db
    .insert(variantGroups)
    .values({
      dishId: couscousId,
      nameAr: 'الحرارة',
      nameFr: 'Niveau de piquant',
      nameEn: 'Spice level',
      selectionType: 'single',
      required: true,
      minChoices: 1,
      maxChoices: 1,
      sortOrder: 1,
    })
    .returning();
  if (spiceGroup) {
    await db.insert(variants).values([
      {
        groupId: spiceGroup.id,
        nameAr: 'خفيف',
        nameFr: 'Doux',
        nameEn: 'Mild',
        priceDeltaMillimes: 0,
        sortOrder: 1,
      },
      {
        groupId: spiceGroup.id,
        nameAr: 'حار',
        nameFr: 'Piquant',
        nameEn: 'Spicy',
        priceDeltaMillimes: 0,
        sortOrder: 2,
      },
    ]);
  }

  const [sugarGroup] = await db
    .insert(variantGroups)
    .values({
      dishId: coffeeId,
      nameAr: 'السكر',
      nameFr: 'Sucre',
      nameEn: 'Sugar',
      selectionType: 'single',
      required: true,
      minChoices: 1,
      maxChoices: 1,
      sortOrder: 1,
    })
    .returning();
  if (sugarGroup) {
    await db.insert(variants).values([
      {
        groupId: sugarGroup.id,
        nameAr: 'بدون',
        nameFr: 'Sans',
        nameEn: 'None',
        priceDeltaMillimes: 0,
        sortOrder: 1,
      },
      {
        groupId: sugarGroup.id,
        nameAr: 'متوسط',
        nameFr: 'Moyen',
        nameEn: 'Medium',
        priceDeltaMillimes: 0,
        sortOrder: 2,
      },
      {
        groupId: sugarGroup.id,
        nameAr: 'زيادة',
        nameFr: 'Sucré',
        nameEn: 'Sweet',
        priceDeltaMillimes: 0,
        sortOrder: 3,
      },
    ]);
  }

  const [sizeGroup] = await db
    .insert(variantGroups)
    .values({
      dishId: waterId,
      nameAr: 'الحجم',
      nameFr: 'Taille',
      nameEn: 'Size',
      selectionType: 'single',
      required: true,
      minChoices: 1,
      maxChoices: 1,
      sortOrder: 1,
    })
    .returning();
  if (sizeGroup) {
    await db.insert(variants).values([
      {
        groupId: sizeGroup.id,
        nameAr: 'صغير',
        nameFr: 'Petite',
        nameEn: 'Small',
        priceDeltaMillimes: 0,
        sortOrder: 1,
      },
      {
        groupId: sizeGroup.id,
        nameAr: 'كبير',
        nameFr: 'Grande',
        nameEn: 'Large',
        priceDeltaMillimes: 1500,
        sortOrder: 2,
      },
    ]);
  }

  return {
    restaurantId: restaurant.id,
    staff: {
      admin: userByRole('admin'),
      manager: userByRole('manager'),
      kitchen: userByRole('kitchen'),
      waiter: userByRole('waiter'),
    },
    tableIds: insertedTables.map((t) => t.id),
    categoryIds: { starters: starters.id, mains: mains.id, drinks: drinks.id },
    dishIds: {
      brik: dishByEn('Egg Brik'),
      salad: dishByEn('Grilled Salad'),
      couscous: couscousId,
      pasta: dishByEn('Spiced Meat Pasta'),
      water: waterId,
      coffee: coffeeId,
    },
  };
}
