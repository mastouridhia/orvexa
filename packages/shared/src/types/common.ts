import { z } from 'zod';

export const LanguageCodeSchema = z.enum(['ar', 'fr', 'en']);
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

export const CurrencySchema = z.enum(['TND']);
export type Currency = z.infer<typeof CurrencySchema>;

export const LocalizedStringSchema = z.record(LanguageCodeSchema, z.string());
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

export const IsoDateTimeSchema = z.iso.datetime();
export const UuidSchema = z.uuid();
