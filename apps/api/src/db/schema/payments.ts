import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { restaurants } from './restaurants.js';
import { users } from './staff.js';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    method: text('method', { enum: ['cash', 'card', 'mobile'] }).notNull(),
    status: text('status', { enum: ['pending', 'paid', 'refunded', 'failed'] })
      .notNull()
      .default('pending'),
    amountMillimes: integer('amount_millimes').notNull(),
    tipMillimes: integer('tip_millimes').notNull().default(0),
    collectedByUserId: uuid('collected_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    providerReference: text('provider_reference'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('payments_order_idx').on(t.orderId),
    index('payments_restaurant_created_idx').on(t.restaurantId, t.createdAt),
    index('payments_order_status_idx').on(t.orderId, t.status),
  ],
);
