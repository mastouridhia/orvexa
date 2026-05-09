import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { restaurants } from './restaurants.js';
import { tables } from './tables.js';
import { orders } from './orders.js';
import { customerSessions } from './sessions.js';

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => customerSessions.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    locale: text('locale').notNull().default('fr'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('feedback_restaurant_created_idx').on(t.restaurantId, t.createdAt)],
);
