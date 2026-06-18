import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  restaurantName: text('restaurant_name').notNull(),
  plan: integer('plan').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
