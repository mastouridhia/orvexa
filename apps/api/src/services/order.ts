import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type {
  AddOrderItemsRequest,
  Order,
  OrderHistoryQuery,
  OrderItem,
  OrderItemVariant,
  OrderListQuery,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PlaceOrderItem,
  PlaceOrderRequest,
  UpdateOrderStatusRequest,
} from '@orvexa/shared';
import { db } from '../db/index.js';
import { dishes, variants } from '../db/schema/menu.js';
import { orders } from '../db/schema/orders.js';
import { users } from '../db/schema/staff.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import {
  ACTIVE_ORDER_STATUSES,
  OrderRepository,
  type FullOrder,
  type OrderItemInsert,
  type OrderItemVariantInsert,
} from '../repositories/order.js';
import { RestaurantRepository, type RestaurantRow } from '../repositories/restaurant.js';

export type OrderListResult = { orders: Order[]; total: number; page: number; pageSize: number };

export function rowToOrder(row: FullOrder): Order {
  const items: OrderItem[] = row.items
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((item) => {
      const itemVariants: OrderItemVariant[] = item.variants
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((v) => ({
          variantId: v.variantId,
          groupId: v.groupId,
          nameSnapshot: { ar: v.nameSnapshotAr, fr: v.nameSnapshotFr, en: v.nameSnapshotEn },
          priceDeltaMillimes: v.priceDeltaMillimes,
        }));
      return {
        id: item.id,
        orderId: item.orderId,
        dishId: item.dishId,
        nameSnapshot: { ar: item.nameSnapshotAr, fr: item.nameSnapshotFr, en: item.nameSnapshotEn },
        unitPriceMillimes: item.unitPriceMillimes,
        prepTimeMinutes: item.prepTimeMinutes ?? null,
        quantity: item.quantity,
        variants: itemVariants,
        ...(item.notes ? { notes: item.notes } : {}),
      };
    });
  const etaCandidates = items
    .map((i) => i.prepTimeMinutes)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const etaMinutes = etaCandidates.length > 0 ? Math.max(...etaCandidates) : null;
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    tableDayTokenId: row.tableDayTokenId ?? null,
    sessionId: row.sessionId ?? null,
    status: row.status as OrderStatus,
    round: row.round,
    items,
    subtotalMillimes: row.subtotalMillimes,
    taxMillimes: row.taxMillimes,
    serviceMillimes: row.serviceMillimes,
    totalMillimes: row.totalMillimes,
    etaMinutes,
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
    assignedWaiterId: row.assignedWaiterId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type ResolvedItem = {
  item: OrderItemInsert;
  variants: Omit<OrderItemVariantInsert, 'orderItemId'>[];
  lineTotalMillimes: number;
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

function isOpenForCustomerEdits(status: OrderStatus): boolean {
  return status === 'received';
}

function isCancellable(status: OrderStatus): boolean {
  return status === 'received' || status === 'preparing';
}

export class OrderService {
  private readonly orderRepo: OrderRepository;
  private readonly restaurantRepo: RestaurantRepository;

  constructor(
    orderRepo: OrderRepository = new OrderRepository(),
    restaurantRepo: RestaurantRepository = new RestaurantRepository(),
  ) {
    this.orderRepo = orderRepo;
    this.restaurantRepo = restaurantRepo;
  }

  async place(input: {
    restaurantId: string;
    tableId: string;
    tableDayTokenId: string | null;
    sessionId: string | null;
    body: PlaceOrderRequest;
  }): Promise<Order> {
    const restaurant = await this.restaurantRepo.findById(input.restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    const resolved = await this.resolveItems(
      input.restaurantId,
      input.body.items,
      restaurant.defaultPrepMinutes,
    );
    const totals = this.computeTotals(restaurant, resolved);
    const created = await this.orderRepo.createWithItems({
      order: {
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        tableDayTokenId: input.tableDayTokenId,
        sessionId: input.sessionId,
        status: 'received',
        round: 1,
        subtotalMillimes: totals.subtotalMillimes,
        taxMillimes: totals.taxMillimes,
        serviceMillimes: totals.serviceMillimes,
        totalMillimes: totals.totalMillimes,
      },
      items: resolved.map((r) => ({ item: r.item, variants: r.variants })),
    });
    return rowToOrder(created);
  }

  async addItems(input: {
    restaurantId: string;
    orderId: string;
    sessionId: string | null;
    body: AddOrderItemsRequest;
  }): Promise<Order> {
    const order = await this.requireOrder(input.restaurantId, input.orderId);
    if (input.sessionId !== null && order.sessionId !== input.sessionId) {
      throw new ForbiddenError('Order belongs to a different session');
    }
    if (!isOpenForCustomerEdits(order.status as OrderStatus)) {
      throw new ConflictError(`Order is in '${order.status}', items can only be added while 'received'`);
    }
    const restaurant = await this.restaurantRepo.findById(input.restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    const newItems = await this.resolveItems(
      input.restaurantId,
      input.body.items,
      restaurant.defaultPrepMinutes,
    );
    const allItemTotals = order.items.reduce(
      (sum, it) => sum + this.itemLineTotal(it),
      0,
    );
    const newSubtotal = allItemTotals + newItems.reduce((sum, n) => sum + n.lineTotalMillimes, 0);
    const totals = this.computeTotalsFromSubtotal(restaurant, newSubtotal);
    const updated = await this.orderRepo.appendItems({
      orderId: input.orderId,
      items: newItems.map((r) => ({ item: r.item, variants: r.variants })),
      totals,
    });
    return rowToOrder(updated);
  }

  async removeItem(input: {
    restaurantId: string;
    orderId: string;
    itemId: string;
    sessionId: string | null;
  }): Promise<Order> {
    const order = await this.requireOrder(input.restaurantId, input.orderId);
    if (input.sessionId !== null && order.sessionId !== input.sessionId) {
      throw new ForbiddenError('Order belongs to a different session');
    }
    if (!isOpenForCustomerEdits(order.status as OrderStatus)) {
      throw new ConflictError(`Order is in '${order.status}', items can only be removed while 'received'`);
    }
    const target = order.items.find((i) => i.id === input.itemId);
    if (!target) throw new NotFoundError('Order item not found');
    if (order.items.length === 1) {
      throw new ConflictError('Cannot remove the last item — cancel the order instead');
    }
    const restaurant = await this.restaurantRepo.findById(input.restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    const remainingSubtotal = order.items
      .filter((i) => i.id !== input.itemId)
      .reduce((sum, it) => sum + this.itemLineTotal(it), 0);
    const totals = this.computeTotalsFromSubtotal(restaurant, remainingSubtotal);
    const updated = await this.orderRepo.removeItem({
      orderId: input.orderId,
      itemId: input.itemId,
      totals,
    });
    if (!updated) throw new NotFoundError('Order item not found');
    return rowToOrder(updated);
  }

  async get(restaurantId: string, id: string): Promise<Order> {
    const row = await this.requireOrder(restaurantId, id);
    return rowToOrder(row);
  }

  async getForCustomer(sessionId: string, id: string): Promise<Order> {
    const row = await this.orderRepo.findFullById(id);
    if (!row) throw new NotFoundError('Order not found');
    if (row.sessionId !== sessionId) {
      throw new ForbiddenError('Order belongs to a different session');
    }
    return rowToOrder(row);
  }

  async listActive(restaurantId: string): Promise<Order[]> {
    const rows = await this.orderRepo.listActive(restaurantId);
    return rows.map(rowToOrder);
  }

  async list(restaurantId: string, query: OrderListQuery): Promise<OrderListResult> {
    const { rows, total } = await this.orderRepo.listByStatus(
      restaurantId,
      query.status,
      query.page,
      query.pageSize,
    );
    return { orders: rows.map(rowToOrder), total, page: query.page, pageSize: query.pageSize };
  }

  async history(restaurantId: string, query: OrderHistoryQuery): Promise<OrderListResult> {
    const { rows, total } = await this.orderRepo.listHistory(
      restaurantId,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
      query.page,
      query.pageSize,
    );
    return { orders: rows.map(rowToOrder), total, page: query.page, pageSize: query.pageSize };
  }

  async updateStatus(
    restaurantId: string,
    id: string,
    body: UpdateOrderStatusRequest,
  ): Promise<Order> {
    const row = await this.requireOrder(restaurantId, id);
    const current = row.status as OrderStatus;
    const next = body.status as OrderStatus;
    if (!STATUS_TRANSITIONS[current].includes(next)) {
      throw new ConflictError(`Cannot transition order from '${current}' to '${next}'`);
    }
    const patch: Record<string, unknown> = {
      status: next,
      ...this.statusPatch(next),
    };
    if (next === 'ready' && !row.assignedWaiterId) {
      const waiterId = await this.pickLeastBusyWaiter(restaurantId);
      if (waiterId) patch.assignedWaiterId = waiterId;
    }
    const updated = await this.orderRepo.updateOrder(id, patch);
    if (!updated) throw new NotFoundError('Order not found');
    return rowToOrder(updated);
  }

  /**
   * Pick the active waiter with the fewest currently-assigned non-served orders.
   * Returns null when no eligible waiter exists (caller leaves order unassigned).
   */
  private async pickLeastBusyWaiter(restaurantId: string): Promise<string | null> {
    const rows = await db
      .select({
        userId: users.id,
        assigned: sql<number>`count(${orders.id})`.as('assigned'),
      })
      .from(users)
      .leftJoin(
        orders,
        and(
          eq(orders.assignedWaiterId, users.id),
          inArray(orders.status, ['ready']),
        ),
      )
      .where(
        and(
          eq(users.restaurantId, restaurantId),
          eq(users.role, 'waiter'),
          isNull(users.disabledAt),
        ),
      )
      .groupBy(users.id);
    if (rows.length === 0) return null;
    rows.sort((a, b) => Number(a.assigned) - Number(b.assigned));
    return rows[0]?.userId ?? null;
  }

  async cancel(restaurantId: string, id: string): Promise<Order> {
    const row = await this.requireOrder(restaurantId, id);
    const current = row.status as OrderStatus;
    if (!isCancellable(current)) {
      throw new ConflictError(`Cannot cancel order in '${current}'`);
    }
    const updated = await this.orderRepo.updateOrder(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
    if (!updated) throw new NotFoundError('Order not found');
    return rowToOrder(updated);
  }

  async cancelForCustomer(sessionId: string, id: string): Promise<Order> {
    const row = await this.orderRepo.findFullById(id);
    if (!row) throw new NotFoundError('Order not found');
    if (row.sessionId !== sessionId) {
      throw new ForbiddenError('Order belongs to a different session');
    }
    const current = row.status as OrderStatus;
    if (current !== 'received') {
      throw new ConflictError('Customers can only cancel orders that are still in `received`');
    }
    const updated = await this.orderRepo.updateOrder(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
    if (!updated) throw new NotFoundError('Order not found');
    return rowToOrder(updated);
  }

  // ───────────── helpers ─────────────

  private async requireOrder(restaurantId: string, id: string): Promise<FullOrder> {
    const row = await this.orderRepo.findFullById(id);
    if (!row) throw new NotFoundError('Order not found');
    if (row.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    return row;
  }

  private statusPatch(next: OrderStatus): Record<string, Date> {
    const now = new Date();
    if (next === 'preparing') return { preparingAt: now };
    if (next === 'ready') return { readyAt: now };
    if (next === 'served') return { servedAt: now };
    return {};
  }

  private async resolveItems(
    restaurantId: string,
    inputs: PlaceOrderItem[],
    defaultPrepMinutes: number,
  ): Promise<ResolvedItem[]> {
    if (inputs.length === 0) throw new ValidationError('Order must contain at least one item');
    const dishIds = Array.from(new Set(inputs.map((i) => i.dishId)));
    const variantIds = Array.from(new Set(inputs.flatMap((i) => i.variantIds)));
    const dishRows = await db.select().from(dishes).where(inArray(dishes.id, dishIds));
    const variantRows =
      variantIds.length === 0
        ? []
        : await db.select().from(variants).where(inArray(variants.id, variantIds));

    const dishById = new Map(dishRows.map((d) => [d.id, d] as const));
    const variantById = new Map(variantRows.map((v) => [v.id, v] as const));

    const resolved: ResolvedItem[] = [];
    for (const input of inputs) {
      const dish = dishById.get(input.dishId);
      if (!dish) throw new ValidationError(`Unknown dish: ${input.dishId}`);
      if (dish.restaurantId !== restaurantId) {
        throw new ValidationError(`Dish ${input.dishId} belongs to a different restaurant`);
      }
      if (!dish.available) {
        throw new ConflictError(`Dish '${dish.nameFr}' is currently unavailable`);
      }
      const inputVariants = input.variantIds.map((vid) => {
        const variant = variantById.get(vid);
        if (!variant) throw new ValidationError(`Unknown variant: ${vid}`);
        if (!variant.isActive) throw new ConflictError(`Variant ${vid} is inactive`);
        return variant;
      });
      const variantPriceDelta = inputVariants.reduce(
        (sum, v) => sum + v.priceDeltaMillimes,
        0,
      );
      const lineTotalMillimes = (dish.priceMillimes + variantPriceDelta) * input.quantity;
      resolved.push({
        item: {
          orderId: '',
          dishId: dish.id,
          nameSnapshotAr: dish.nameAr,
          nameSnapshotFr: dish.nameFr,
          nameSnapshotEn: dish.nameEn,
          unitPriceMillimes: dish.priceMillimes,
          prepTimeMinutes: dish.prepTimeMinutes ?? defaultPrepMinutes,
          quantity: input.quantity,
          notes: input.notes ?? null,
        },
        variants: inputVariants.map((v) => ({
          variantId: v.id,
          groupId: v.groupId,
          nameSnapshotAr: v.nameAr,
          nameSnapshotFr: v.nameFr,
          nameSnapshotEn: v.nameEn,
          priceDeltaMillimes: v.priceDeltaMillimes,
        })),
        lineTotalMillimes,
      });
    }
    return resolved;
  }

  private computeTotals(
    restaurant: RestaurantRow,
    resolved: ResolvedItem[],
  ): {
    subtotalMillimes: number;
    taxMillimes: number;
    serviceMillimes: number;
    totalMillimes: number;
  } {
    const subtotalMillimes = resolved.reduce((sum, r) => sum + r.lineTotalMillimes, 0);
    return this.computeTotalsFromSubtotal(restaurant, subtotalMillimes);
  }

  private computeTotalsFromSubtotal(
    restaurant: RestaurantRow,
    subtotalMillimes: number,
  ): {
    subtotalMillimes: number;
    taxMillimes: number;
    serviceMillimes: number;
    totalMillimes: number;
  } {
    const taxMillimes = Math.round((subtotalMillimes * restaurant.taxPercent) / 100);
    const serviceMillimes = Math.round((subtotalMillimes * restaurant.servicePercent) / 100);
    const totalMillimes = subtotalMillimes + taxMillimes + serviceMillimes;
    return { subtotalMillimes, taxMillimes, serviceMillimes, totalMillimes };
  }

  private itemLineTotal(item: FullOrder['items'][number]): number {
    const variantDelta = item.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0);
    return (item.unitPriceMillimes + variantDelta) * item.quantity;
  }

  // referenced indirectly to avoid removal as unused
  static readonly ACTIVE_ORDER_STATUSES = ACTIVE_ORDER_STATUSES;
}
