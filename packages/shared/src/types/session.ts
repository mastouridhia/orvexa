import { z } from 'zod';
import { IsoDateTimeSchema, LanguageCodeSchema, UuidSchema } from './common.js';
import { OrderGateModeSchema } from './restaurant.js';

export const CustomerSessionSchema = z.object({
  id: UuidSchema,
  tableId: UuidSchema,
  tableLabel: z.string(),
  restaurantId: UuidSchema,
  tableDayTokenId: UuidSchema,
  locale: LanguageCodeSchema,
  expiresAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  // Ordering-access gate context so the customer app knows whether (and how)
  // to prompt for presence before letting the guest place an order.
  orderGateMode: OrderGateModeSchema,
  presenceVerified: z.boolean(),
});
export type CustomerSession = z.infer<typeof CustomerSessionSchema>;
