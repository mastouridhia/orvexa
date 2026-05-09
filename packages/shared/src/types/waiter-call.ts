import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const WaiterCallKindSchema = z.enum(['call_waiter', 'request_bill', 'request_extras']);
export type WaiterCallKind = z.infer<typeof WaiterCallKindSchema>;

export const WaiterCallSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  tableId: UuidSchema,
  kind: WaiterCallKindSchema,
  note: z.string().nullable(),
  clearedAt: IsoDateTimeSchema.nullable(),
  clearedByUserId: UuidSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type WaiterCall = z.infer<typeof WaiterCallSchema>;

export const ListWaiterCallsQuerySchema = z.object({
  status: z.enum(['open', 'all']).default('open'),
});
export type ListWaiterCallsQuery = z.infer<typeof ListWaiterCallsQuerySchema>;

export const RequestExtrasRequestSchema = z.object({
  items: z.array(z.string().min(1).max(64)).max(20).default([]),
  note: z.string().max(280).optional(),
});
export type RequestExtrasRequest = z.infer<typeof RequestExtrasRequestSchema>;
