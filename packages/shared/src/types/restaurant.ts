import { z } from 'zod';
import {
  CurrencySchema,
  IsoDateTimeSchema,
  LanguageCodeSchema,
  UuidSchema,
} from './common.js';

export const PaymentPointSchema = z.enum(['table', 'counter']);
export type PaymentPoint = z.infer<typeof PaymentPointSchema>;

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
  })
  .partial();
export type PatchRestaurantRequest = z.infer<typeof PatchRestaurantRequestSchema>;
