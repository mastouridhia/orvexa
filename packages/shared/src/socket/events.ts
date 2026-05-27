import type { Order, OrderStatus } from '../types/order.js';
import type { StaffRole } from '../types/staff.js';
import type { TableStatus } from '../types/table.js';

export const SocketEventName = {
  ORDER_CREATED: 'order:created',
  ORDER_STATUS: 'order:status',
  WAITER_CALLED: 'waiter:called',
  BILL_REQUESTED: 'bill:requested',
  MENU_UPDATED: 'menu:updated',
  TABLE_STATUS: 'table:status',
  CART_UPDATED: 'cart:updated',
  CUSTOMER_SUBSCRIBE: 'customer:subscribe',
  STAFF_SUBSCRIBE: 'staff:subscribe',
} as const;
export type SocketEventName = (typeof SocketEventName)[keyof typeof SocketEventName];

export type OrderCreatedPayload = { order: Order };
export type OrderStatusPayload = {
  orderId: string;
  status: OrderStatus;
  tableId: string;
  /** Set when status flips to `ready` and a waiter has been auto-assigned for delivery. */
  assignedWaiterId?: string | null;
};
export type WaiterCalledPayload = { tableId: string; atIso: string };
export type BillRequestedPayload = {
  tableId: string;
  orderId: string | null;
  atIso: string;
};
export type MenuUpdatedPayload = { restaurantId: string };
export type TableStatusPayload = { tableId: string; status: TableStatus };
export type CartUpdatedPayload = {
  tableId: string;
  ownerSessionId: string;
  items: Array<{
    uid: string;
    dishId: string;
    quantity: number;
    variantIds: string[];
    notes?: string;
  }>;
  /** Session id that triggered the change — clients can ignore self-echoes. */
  bySessionId: string;
  updatedAt: string;
};

export type DayClosedPayload = { restaurantId: string; closedAt: string };

export type CustomerSubscribePayload = { tableId: string };
export type StaffSubscribePayload = { role: StaffRole };

export type ServerToClientEvents = {
  'order:created': (payload: OrderCreatedPayload) => void;
  'order:status': (payload: OrderStatusPayload) => void;
  'waiter:called': (payload: WaiterCalledPayload) => void;
  'bill:requested': (payload: BillRequestedPayload) => void;
  'menu:updated': (payload: MenuUpdatedPayload) => void;
  'table:status': (payload: TableStatusPayload) => void;
  'cart:updated': (payload: CartUpdatedPayload) => void;
  'day:closed': (payload: DayClosedPayload) => void;
};

export type ClientToServerEvents = {
  'customer:subscribe': (payload: CustomerSubscribePayload) => void;
  'staff:subscribe': (payload: StaffSubscribePayload) => void;
};
