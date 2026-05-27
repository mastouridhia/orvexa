import { z } from 'zod';
import { IsoDateTimeSchema, LocalizedStringSchema, UuidSchema } from './common.js';
import { KitchenSectionSchema } from './menu.js';

export const OrderStatusSchema = z.enum(['received', 'preparing', 'ready', 'served', 'cancelled']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const ItemStatusSchema = z.enum(['received', 'preparing', 'ready']);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const PaymentMethodSchema = z.enum(['cash', 'card', 'mobile']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatusSchema = z.enum(['pending', 'paid', 'refunded', 'failed']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const OrderItemVariantSchema = z.object({
  variantId: UuidSchema,
  groupId: UuidSchema,
  nameSnapshot: LocalizedStringSchema,
  priceDeltaMillimes: z.number().int(),
});
export type OrderItemVariant = z.infer<typeof OrderItemVariantSchema>;

export const OrderItemSchema = z.object({
  id: UuidSchema,
  orderId: UuidSchema,
  dishId: UuidSchema,
  nameSnapshot: LocalizedStringSchema,
  unitPriceMillimes: z.number().int().nonnegative(),
  prepTimeMinutes: z.number().int().min(1).max(120).nullable(),
  quantity: z.number().int().positive(),
  kitchenSection: KitchenSectionSchema.default('kitchen'),
  itemStatus: ItemStatusSchema.default('received'),
  variants: z.array(OrderItemVariantSchema),
  notes: z.string().optional(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  tableId: UuidSchema,
  tableDayTokenId: UuidSchema.nullable(),
  sessionId: UuidSchema.nullable(),
  status: OrderStatusSchema,
  round: z.number().int().positive(),
  items: z.array(OrderItemSchema),
  subtotalMillimes: z.number().int().nonnegative(),
  taxMillimes: z.number().int().nonnegative(),
  serviceMillimes: z.number().int().nonnegative(),
  totalMillimes: z.number().int().nonnegative(),
  etaMinutes: z.number().int().min(0).nullable(),
  paymentStatus: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema.nullable(),
  assignedWaiterId: UuidSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Order = z.infer<typeof OrderSchema>;

export const PlaceOrderItemSchema = z.object({
  dishId: UuidSchema,
  quantity: z.number().int().positive().max(99),
  variantIds: z.array(UuidSchema).default([]),
  notes: z.string().max(500).optional(),
});
export type PlaceOrderItem = z.infer<typeof PlaceOrderItemSchema>;

export const PlaceOrderRequestSchema = z.object({
  items: z.array(PlaceOrderItemSchema).min(1).max(50),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;

export const AddOrderItemsRequestSchema = z.object({
  items: z.array(PlaceOrderItemSchema).min(1).max(50),
});
export type AddOrderItemsRequest = z.infer<typeof AddOrderItemsRequestSchema>;

export const UpdateOrderStatusRequestSchema = z.object({
  status: z.enum(['preparing', 'ready', 'served']),
});
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequestSchema>;

export const CancelOrderRequestSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional();
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;

export const OrderListQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;

export const OrderHistoryQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type OrderHistoryQuery = z.infer<typeof OrderHistoryQuerySchema>;

export const AdvanceSectionRequestSchema = z.object({
  section: KitchenSectionSchema,
  status: z.enum(['preparing', 'ready']),
});
export type AdvanceSectionRequest = z.infer<typeof AdvanceSectionRequestSchema>;
