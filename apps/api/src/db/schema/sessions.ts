import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';
import { tableDayTokens, tables } from './tables.js';

export const customerSessions = pgTable(
  'customer_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'cascade' }),
    tableDayTokenId: uuid('table_day_token_id')
      .notNull()
      .references(() => tableDayTokens.id, { onDelete: 'cascade' }),
    locale: text('locale', { enum: ['ar', 'fr', 'en'] }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customer_sessions_table_day_token_idx').on(t.tableDayTokenId),
    index('customer_sessions_expires_idx').on(t.expiresAt),
    index('customer_sessions_table_idx').on(t.tableId),
  ],
);
