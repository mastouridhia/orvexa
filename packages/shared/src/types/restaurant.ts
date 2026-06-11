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

export const RestaurantSchema = z.object({
  id: UuidSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
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
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
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
  })
  .partial();
export type PatchRestaurantRequest = z.infer<typeof PatchRestaurantRequestSchema>;

export const DetectIpResponseSchema = z.object({ ip: z.string() });
export type DetectIpResponse = z.infer<typeof DetectIpResponseSchema>;
