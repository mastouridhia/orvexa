import { index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';
import { tableDayTokens, tables } from './tables.js';
import { customerSessions } from './sessions.js';

export type CartItem = {
  uid: string;
  dishId: string;
  quantity: number;
  variantIds: string[];
  notes?: string;
};

export const tableCarts = pgTable(
  'table_carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .unique()
      .references(() => tables.id, { onDelete: 'cascade' }),
    tableDayTokenId: uuid('table_day_token_id')
      .notNull()
      .references(() => tableDayTokens.id, { onDelete: 'cascade' }),
    ownerSessionId: uuid('owner_session_id')
      .notNull()
      .references(() => customerSessions.id, { onDelete: 'cascade' }),
    items: jsonb('items').notNull().$type<CartItem[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('table_carts_token_idx').on(t.tableDayTokenId)],
);
