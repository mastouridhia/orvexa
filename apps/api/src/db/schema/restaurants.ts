import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  defaultLanguage: text('default_language').notNull().default('fr'),
  supportedLanguages: text('supported_languages').array().notNull().default(['ar', 'fr', 'en']),
  currency: text('currency').notNull().default('TND'),
  taxPercent: integer('tax_percent').notNull().default(0),
  servicePercent: integer('service_percent').notNull().default(0),
  defaultPrepMinutes: integer('default_prep_minutes').notNull().default(15),
  timezone: text('timezone').notNull().default('Africa/Tunis'),
  paymentPoint: text('payment_point', { enum: ['table', 'counter'] })
    .notNull()
    .default('table'),
  // Ordering-access gate — defends the static printed QR against off-premises spam.
  orderGateMode: text('order_gate_mode', {
    enum: ['off', 'wifi', 'code', 'wifi_or_code'],
  })
    .notNull()
    .default('off'),
  // IPv4/IPv6 addresses or CIDRs treated as "the café network" for the wifi gate.
  allowedNetworks: text('allowed_networks').array().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
