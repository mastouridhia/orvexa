import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    nameAr: text('name_ar').notNull(),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('categories_restaurant_sort_idx').on(t.restaurantId, t.sortOrder)],
);

export const dishes = pgTable(
  'dishes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    nameAr: text('name_ar').notNull(),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    descriptionAr: text('description_ar'),
    descriptionFr: text('description_fr'),
    descriptionEn: text('description_en'),
    imageUrl: text('image_url'),
    imageUrls: text('image_urls').array().notNull().default([]),
    priceMillimes: integer('price_millimes').notNull(),
    prepTimeMinutes: integer('prep_time_minutes'),
    available: boolean('available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('dishes_restaurant_idx').on(t.restaurantId),
    index('dishes_category_sort_idx').on(t.categoryId, t.sortOrder),
  ],
);

export const variantGroups = pgTable(
  'variant_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dishId: uuid('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    nameAr: text('name_ar').notNull(),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    selectionType: text('selection_type', { enum: ['single', 'multi'] }).notNull(),
    required: boolean('required').notNull().default(false),
    minChoices: integer('min_choices').notNull().default(0),
    maxChoices: integer('max_choices').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('variant_groups_dish_sort_idx').on(t.dishId, t.sortOrder)],
);

export const variants = pgTable(
  'variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => variantGroups.id, { onDelete: 'cascade' }),
    nameAr: text('name_ar').notNull(),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    priceDeltaMillimes: integer('price_delta_millimes').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('variants_group_sort_idx').on(t.groupId, t.sortOrder)],
);
