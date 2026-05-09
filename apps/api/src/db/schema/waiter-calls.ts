import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';
import { users } from './staff.js';
import { tables } from './tables.js';

export const waiterCalls = pgTable(
  'waiter_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['call_waiter', 'request_bill', 'request_extras'] }).notNull(),
    note: text('note'),
    clearedAt: timestamp('cleared_at', { withTimezone: true }),
    clearedByUserId: uuid('cleared_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('waiter_calls_restaurant_open_idx').on(t.restaurantId, t.clearedAt),
    index('waiter_calls_table_created_idx').on(t.tableId, t.createdAt),
  ],
);
