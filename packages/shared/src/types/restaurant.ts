import { z } from 'zod';
import { CurrencySchema, IsoDateTimeSchema, LanguageCodeSchema, UuidSchema } from './common.js';

export const PaymentPointSchema = z.enum(['table', 'counter']);
export type PaymentPoint = z.infer<typeof PaymentPointSchema>;

/**
 * Controls who may place customer orders, defending the static printed QR
 * against off-premises spam:
 * - `off`          anyone with the QR can order (legacy behavior)
 * - `wifi`         request IP must match the café's allowed networks
 * - `code`         a waiter-issued table code must be entered first
 * - `wifi_or_code` either of the above passes (recommended)
 */
export const OrderGateModeSchema = z.enum(['off', 'wifi', 'code', 'wifi_or_code']);
export type OrderGateMode = z.infer<typeof OrderGateModeSchema>;

/** Weekdays in display order. Used for the Essentiel restaurant info card (`menu.info`). */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

export const DayHoursSchema = z.object({
  open: TimeOfDaySchema,
  close: TimeOfDaySchema,
});
export type DayHours = z.infer<typeof DayHoursSchema>;

/**
 * Opening hours per weekday. Per entry: `{ open, close }` = open that day,
 * `null` = explicitly closed, key absent = unspecified (not shown).
 */
export const OpeningHoursSchema = z
  .object({
    mon: DayHoursSchema.nullable(),
    tue: DayHoursSchema.nullable(),
    wed: DayHoursSchema.nullable(),
    thu: DayHoursSchema.nullable(),
    fri: DayHoursSchema.nullable(),
    sat: DayHoursSchema.nullable(),
    sun: DayHoursSchema.nullable(),
  })
  .partial();
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

/**
 * View-only "restaurant info card" fields (`menu.info`, all tiers). Owner-filled
 * in admin Settings, shown on the customer menu. All optional/nullable — links are
 * stored as free text (not strictly URL-validated) to avoid owner-entry friction.
 */
export const RestaurantInfoSchema = z.object({
  address: z.string().max(300).nullable(),
  mapUrl: z.string().max(500).nullable(),
  phone: z.string().max(40).nullable(),
  instagramUrl: z.string().max(300).nullable(),
  facebookUrl: z.string().max(300).nullable(),
  tiktokUrl: z.string().max(300).nullable(),
  wifiSsid: z.string().max(100).nullable(),
  wifiPassword: z.string().max(100).nullable(),
  openingHours: OpeningHoursSchema.nullable(),
});

export const RestaurantSchema = z.object({
  id: UuidSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  plan: z.number().int().min(1).max(4),
  defaultLanguage: LanguageCodeSchema,
  supportedLanguages: z.array(LanguageCodeSchema).nonempty(),
  currency: CurrencySchema,
  taxPercent: z.number().min(0).max(100),
  servicePercent: z.number().min(0).max(100),
  defaultPrepMinutes: z.number().int().min(1).max(120),
  timezone: z.string().min(1),
  paymentPoint: PaymentPointSchema,
  orderGateMode: OrderGateModeSchema,
  allowedNetworks: z.array(z.string()),
  orderCeiling: z.number().int().min(1).max(100),
  // true = one printed QR per table; false = a single menu QR for the whole place.
  perTableQr: z.boolean(),
  // Purchased table overage on top of the tier quota (PLANS.md §8). Effective
  // table limit = TABLE_QUOTA[plan] + extraTables. Capitol is grandfathered via
  // a large value here. Owners cannot self-set this — admin/billing only.
  extraTables: z.number().int().min(0),
  // Daily email report (Plus+). Opt-in toggle + recipient address (null = unset).
  dailyReportEnabled: z.boolean(),
  reportEmail: z.string().email().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
}).merge(RestaurantInfoSchema);
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const PatchRestaurantRequestSchema = z
  .object({
    name: z.string().min(1),
    defaultLanguage: LanguageCodeSchema,
    supportedLanguages: z.array(LanguageCodeSchema).nonempty(),
    taxPercent: z.number().min(0).max(100),
    servicePercent: z.number().min(0).max(100),
    defaultPrepMinutes: z.number().int().min(1).max(120),
    timezone: z.string().min(1),
    paymentPoint: PaymentPointSchema,
    orderGateMode: OrderGateModeSchema,
    // Each entry is an IPv4/IPv6 address or CIDR; validated server-side.
    allowedNetworks: z.array(z.string().min(1).max(64)).max(20),
    orderCeiling: z.number().int().min(1).max(100),
    perTableQr: z.boolean(),
    // Daily email report settings. Empty string clears the recipient (normalized
    // to null server-side); a non-empty value must be a valid email.
    dailyReportEnabled: z.boolean(),
    reportEmail: z.string().email().or(z.literal('')).nullable(),
  })
  .merge(RestaurantInfoSchema)
  .partial();
export type PatchRestaurantRequest = z.infer<typeof PatchRestaurantRequestSchema>;

export const DetectIpResponseSchema = z.object({ ip: z.string() });
export type DetectIpResponse = z.infer<typeof DetectIpResponseSchema>;
