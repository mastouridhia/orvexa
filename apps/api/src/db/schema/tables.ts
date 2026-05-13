import { sql } from 'drizzle-orm';
import {
  AnyPgColumn,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';

export const tableZones = pgTable(
  'table_zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('table_zones_restaurant_name_idx').on(t.restaurantId, t.name),
    index('table_zones_restaurant_sort_idx').on(t.restaurantId, t.sortOrder),
  ],
);

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    // Stable, URL-safe short code that identifies the table forever. Printed on the
    // physical QR sticker, so it must NEVER rotate once a table is created.
    publicSlug: text('public_slug')
      .notNull()
      .default(sql`substr(md5(random()::text || clock_timestamp()::text), 1, 10)`),
    seats: integer('seats').notNull().default(4),
    status: text('status', {
      enum: ['free', 'seated', 'ordering', 'waiting', 'call_waiter', 'needs_bill', 'needs_cleaning'],
    })
      .notNull()
      .default('free'),
    mergedIntoTableId: uuid('merged_into_table_id').references(
      (): AnyPgColumn => tables.id,
      { onDelete: 'set null' },
    ),
    zoneId: uuid('zone_id').references(() => tableZones.id, { onDelete: 'set null' }),
    // Normalized 0..1 canvas coordinates; null until admin places the table.
    x: doublePrecision('x'),
    y: doublePrecision('y'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tables_restaurant_label_idx').on(t.restaurantId, t.label),
    uniqueIndex('tables_public_slug_idx').on(t.publicSlug),
    index('tables_merged_into_idx').on(t.mergedIntoTableId),
    index('tables_zone_idx').on(t.zoneId),
  ],
);

export const tableDayTokens = pgTable(
  'table_day_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('table_day_tokens_table_day_idx').on(t.tableId, t.day),
    uniqueIndex('table_day_tokens_restaurant_day_token_idx').on(t.restaurantId, t.day, t.token),
    index('table_day_tokens_day_idx').on(t.day),
  ],
);
