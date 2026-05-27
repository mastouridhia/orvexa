import {
  AnyPgColumn,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { dishes, variantGroups, variants } from './menu.js';
import { restaurants } from './restaurants.js';
import { customerSessions } from './sessions.js';
import { users } from './staff.js';
import { tableDayTokens, tables } from './tables.js';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'restrict' }),
    tableDayTokenId: uuid('table_day_token_id').references(() => tableDayTokens.id, {
      onDelete: 'set null',
    }),
    sessionId: uuid('session_id').references((): AnyPgColumn => customerSessions.id, {
      onDelete: 'set null',
    }),
    status: text('status', {
      enum: ['received', 'preparing', 'ready', 'served', 'cancelled'],
    })
      .notNull()
      .default('received'),
    round: integer('round').notNull().default(1),
    subtotalMillimes: integer('subtotal_millimes').notNull().default(0),
    taxMillimes: integer('tax_millimes').notNull().default(0),
    serviceMillimes: integer('service_millimes').notNull().default(0),
    totalMillimes: integer('total_millimes').notNull().default(0),
    paymentStatus: text('payment_status', {
      enum: ['pending', 'paid', 'refunded', 'failed'],
    })
      .notNull()
      .default('pending'),
    paymentMethod: text('payment_method', { enum: ['cash', 'card', 'mobile'] }),
    assignedWaiterId: uuid('assigned_waiter_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    preparingAt: timestamp('preparing_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    servedAt: timestamp('served_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_restaurant_status_created_idx').on(t.restaurantId, t.status, t.createdAt),
    index('orders_table_created_idx').on(t.tableId, t.createdAt),
    index('orders_assigned_waiter_idx').on(t.assignedWaiterId),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    dishId: uuid('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'restrict' }),
    nameSnapshotAr: text('name_snapshot_ar').notNull(),
    nameSnapshotFr: text('name_snapshot_fr').notNull(),
    nameSnapshotEn: text('name_snapshot_en').notNull(),
    unitPriceMillimes: integer('unit_price_millimes').notNull(),
    prepTimeMinutes: integer('prep_time_minutes'),
    quantity: integer('quantity').notNull().default(1),
    kitchenSection: text('kitchen_section', { enum: ['kitchen', 'bar'] })
      .notNull()
      .default('kitchen'),
    itemStatus: text('item_status', { enum: ['received', 'preparing', 'ready'] })
      .notNull()
      .default('received'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    index('order_items_dish_idx').on(t.dishId),
    index('order_items_kitchen_section_idx').on(t.kitchenSection),
    index('order_items_status_idx').on(t.itemStatus),
  ],
);

export const orderItemVariants = pgTable(
  'order_item_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => variantGroups.id, { onDelete: 'restrict' }),
    nameSnapshotAr: text('name_snapshot_ar').notNull(),
    nameSnapshotFr: text('name_snapshot_fr').notNull(),
    nameSnapshotEn: text('name_snapshot_en').notNull(),
    priceDeltaMillimes: integer('price_delta_millimes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('order_item_variants_item_variant_idx').on(t.orderItemId, t.variantId)],
);
