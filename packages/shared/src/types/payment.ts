import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { OrderSchema, PaymentMethodSchema, PaymentStatusSchema } from './order.js';
import { RestaurantSchema } from './restaurant.js';

export const PaymentSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  orderId: UuidSchema,
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  amountMillimes: z.number().int().nonnegative(),
  tipMillimes: z.number().int().nonnegative(),
  collectedByUserId: UuidSchema.nullable(),
  providerReference: z.string().nullable(),
  paidAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Payment = z.infer<typeof PaymentSchema>;

export const RecordPaymentRequestSchema = z.object({
  method: PaymentMethodSchema,
  amountMillimes: z.number().int().positive().optional(),
  tipMillimes: z.number().int().nonnegative().default(0),
});
export type RecordPaymentRequest = z.infer<typeof RecordPaymentRequestSchema>;

export const ReceiptSchema = z.object({
  order: OrderSchema,
  payments: z.array(PaymentSchema),
  amountPaidMillimes: z.number().int().nonnegative(),
  amountDueMillimes: z.number().int(),
  tipTotalMillimes: z.number().int().nonnegative(),
  restaurant: z.object({
    id: UuidSchema,
    name: z.string(),
    currency: RestaurantSchema.shape.currency,
    taxPercent: z.number(),
    servicePercent: z.number(),
    timezone: z.string(),
  }),
});
export type Receipt = z.infer<typeof ReceiptSchema>;
