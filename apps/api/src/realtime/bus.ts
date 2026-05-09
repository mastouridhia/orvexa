import type { Server as SocketServer } from 'socket.io';
import type {
  BillRequestedPayload,
  CartUpdatedPayload,
  ClientToServerEvents,
  MenuUpdatedPayload,
  Order,
  OrderCreatedPayload,
  OrderStatusPayload,
  ServerToClientEvents,
  TableStatus,
  TableStatusPayload,
  WaiterCalledPayload,
} from '@orvexa/shared';
import type { SocketIdentity } from './auth.js';
import { kitchenRoom, restaurantRoom, tableRoom, waiterRoom } from './rooms.js';

export type InterServerEvents = Record<string, never>;
export type SocketData = { identity?: SocketIdentity };

export type OrvexaIo = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export class RealtimeBus {
  constructor(private readonly io: OrvexaIo) {}

  orderCreated(order: Order): void {
    const payload: OrderCreatedPayload = { order };
    this.io.to(kitchenRoom(order.restaurantId)).emit('order:created', payload);
    this.io.to(waiterRoom(order.restaurantId)).emit('order:created', payload);
    this.io.to(tableRoom(order.tableId)).emit('order:created', payload);
  }

  orderStatusChanged(order: Order): void {
    const payload: OrderStatusPayload = {
      orderId: order.id,
      status: order.status,
      assignedWaiterId: order.assignedWaiterId ?? null,
      tableId: order.tableId,
    };
    this.io.to(tableRoom(order.tableId)).emit('order:status', payload);
    this.io.to(waiterRoom(order.restaurantId)).emit('order:status', payload);
    this.io.to(kitchenRoom(order.restaurantId)).emit('order:status', payload);
  }

  waiterCalled(restaurantId: string, tableId: string, atIso: string): void {
    const payload: WaiterCalledPayload = { tableId, atIso };
    this.io.to(waiterRoom(restaurantId)).emit('waiter:called', payload);
  }

  billRequested(
    restaurantId: string,
    tableId: string,
    orderId: string | null,
    atIso: string,
  ): void {
    const payload: BillRequestedPayload = { tableId, orderId, atIso };
    this.io.to(waiterRoom(restaurantId)).emit('bill:requested', payload);
  }

  menuUpdated(restaurantId: string): void {
    const payload: MenuUpdatedPayload = { restaurantId };
    this.io.to(restaurantRoom(restaurantId)).emit('menu:updated', payload);
  }

  tableStatusChanged(restaurantId: string, tableId: string, status: TableStatus): void {
    const payload: TableStatusPayload = { tableId, status };
    this.io.to(restaurantRoom(restaurantId)).emit('table:status', payload);
    this.io.to(tableRoom(tableId)).emit('table:status', payload);
  }

  cartUpdated(payload: CartUpdatedPayload): void {
    this.io.to(tableRoom(payload.tableId)).emit('cart:updated', payload);
  }
}

let instance: RealtimeBus | null = null;

export function setBus(bus: RealtimeBus): void {
  instance = bus;
}

export function getBus(): RealtimeBus {
  if (!instance) throw new Error('RealtimeBus not initialized — call attachRealtime() first');
  return instance;
}
