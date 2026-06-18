import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { OpeningHours } from '@orvexa/shared';

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
  // Max concurrent active orders per table before customers are prompted to ask
  // the waiter. Waiter can temporarily bypass via DELETE /tables/:id/order-ceiling.
  orderCeiling: integer('order_ceiling').notNull().default(20),
  plan: integer('plan').notNull().default(1),
  // true = one QR per table; false = a single menu QR for the whole place (Essentiel).
  perTableQr: boolean('per_table_qr').notNull().default(true),
  // Purchased table overage on top of the per-tier quota (PLANS.md §8). Effective
  // limit = TABLE_QUOTA[plan] + extraTables. Capitol is grandfathered with a large value.
  extraTables: integer('extra_tables').notNull().default(0),
  // View-only "restaurant info card" (menu.info, all tiers). All owner-filled & optional.
  address: text('address'),
  mapUrl: text('map_url'),
  phone: text('phone'),
  instagramUrl: text('instagram_url'),
  facebookUrl: text('facebook_url'),
  tiktokUrl: text('tiktok_url'),
  wifiSsid: text('wifi_ssid'),
  wifiPassword: text('wifi_password'),
  openingHours: jsonb('opening_hours').$type<OpeningHours>(),
  isActive: boolean('is_active').notNull().default(true),
  // Legal consent captured at account creation (CGU + Politique de confidentialité).
  // Kept as proof of acceptance; version string identifies which document set was accepted.
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  termsVersion: text('terms_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
