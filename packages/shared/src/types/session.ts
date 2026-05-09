import { z } from 'zod';
import { IsoDateTimeSchema, LanguageCodeSchema, UuidSchema } from './common.js';

export const CustomerSessionSchema = z.object({
  id: UuidSchema,
  tableId: UuidSchema,
  tableLabel: z.string(),
  restaurantId: UuidSchema,
  tableDayTokenId: UuidSchema,
  locale: LanguageCodeSchema,
  expiresAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
});
export type CustomerSession = z.infer<typeof CustomerSessionSchema>;
