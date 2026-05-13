import { and, count, desc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { orderItems, orderItemVariants, orders } from '../db/schema/orders.js';
import { BaseRepository } from './base.js';

export type OrderRow = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
export type OrderPatch = Partial<OrderInsert>;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderItemInsert = typeof orderItems.$inferInsert;
export type OrderItemVariantRow = typeof orderItemVariants.$inferSelect;
export type OrderItemVariantInsert = typeof orderItemVariants.$inferInsert;

export const ACTIVE_ORDER_STATUSES = ['received', 'preparing', 'ready'] as const;
export const TERMINAL_ORDER_STATUSES = ['served', 'cancelled'] as const;

export type FullOrder = OrderRow & {
  items: (OrderItemRow & { variants: OrderItemVariantRow[] })[];
};

async function loadFullOrders(tx: Db, rows: OrderRow[]): Promise<FullOrder[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const items = await tx.select().from(orderItems).where(inArray(orderItems.orderId, ids));
  const itemIds = items.map((i) => i.id);
  const variantsRows =
    itemIds.length === 0
      ? []
      : await tx
          .select()
          .from(orderItemVariants)
          .where(inArray(orderItemVariants.orderItemId, itemIds));
  const variantsByItem = new Map<string, OrderItemVariantRow[]>();
  for (const v of variantsRows) {
    const list = variantsByItem.get(v.orderItemId) ?? [];
    list.push(v);
    variantsByItem.set(v.orderItemId, list);
  }
  const itemsByOrder = new Map<string, (OrderItemRow & { variants: OrderItemVariantRow[] })[]>();
  for (const it of items) {
    const enriched = { ...it, variants: variantsByItem.get(it.id) ?? [] };
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push(enriched);
    itemsByOrder.set(it.orderId, list);
  }
  return rows.map((r) => ({ ...r, items: itemsByOrder.get(r.id) ?? [] }));
}

export class OrderRepository extends BaseRepository {
  async listActiveForTables(tableIds: string[]): Promise<OrderRow[]> {
    if (tableIds.length === 0) return [];
    return this.db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.tableId, tableIds),
          inArray(orders.status, [...ACTIVE_ORDER_STATUSES]),
        ),
      );
  }

  async hasNonTerminalForTable(tableId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(eq(orders.tableId, tableId), ne(orders.status, TERMINAL_ORDER_STATUSES[0])),
      )
      .limit(1);
    return row !== undefined;
  }

  async findFullById(id: string): Promise<FullOrder | null> {
    const [row] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!row) return null;
    const [full] = await loadFullOrders(this.db, [row]);
    return full ?? null;
  }

  async listOpenBills(restaurantId: string): Promise<FullOrder[]> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          ne(orders.status, 'cancelled'),
          ne(orders.paymentStatus, 'paid'),
        ),
      )
      .orderBy(desc(orders.createdAt));
    return loadFullOrders(this.db, rows);
  }

  async listActive(restaurantId: string): Promise<FullOrder[]> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, [...ACTIVE_ORDER_STATUSES]),
        ),
      )
      .orderBy(desc(orders.createdAt));
    return loadFullOrders(this.db, rows);
  }

  async listByStatus(
    restaurantId: string,
    status: OrderRow['status'] | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ rows: FullOrder[]; total: number }> {
    const where = status
      ? and(eq(orders.restaurantId, restaurantId), eq(orders.status, status))
      : eq(orders.restaurantId, restaurantId);
    const [{ value }] = await this.db.select({ value: count() }).from(orders).where(where);
    const rows = await this.db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const full = await loadFullOrders(this.db, rows);
    return { rows: full, total: value };
  }

  async listHistory(
    restaurantId: string,
    from: Date | undefined,
    to: Date | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ rows: FullOrder[]; total: number }> {
    const conditions = [
      eq(orders.restaurantId, restaurantId),
      inArray(orders.status, [...TERMINAL_ORDER_STATUSES]),
    ];
    if (from) conditions.push(gte(orders.createdAt, from));
    if (to) conditions.push(lte(orders.createdAt, to));
    const where = and(...conditions);
    const [{ value }] = await this.db.select({ value: count() }).from(orders).where(where);
    const rows = await this.db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const full = await loadFullOrders(this.db, rows);
    return { rows: full, total: value };
  }

  async createWithItems(input: {
    order: OrderInsert;
    items: { item: OrderItemInsert; variants: Omit<OrderItemVariantInsert, 'orderItemId'>[] }[];
  }): Promise<FullOrder> {
    return this.db.transaction(async (tx) => {
      const [orderRow] = await tx.insert(orders).values(input.order).returning();
      if (!orderRow) throw new Error('Failed to insert order');
      for (const it of input.items) {
        const [itemRow] = await tx
          .insert(orderItems)
          .values({ ...it.item, orderId: orderRow.id })
          .returning();
        if (!itemRow) throw new Error('Failed to insert order_item');
        if (it.variants.length > 0) {
          await tx
            .insert(orderItemVariants)
            .values(it.variants.map((v) => ({ ...v, orderItemId: itemRow.id })));
        }
      }
      const [full] = await loadFullOrders(tx as unknown as Db, [orderRow]);
      if (!full) throw new Error('Failed to load full order');
      return full;
    });
  }

  async appendItems(input: {
    orderId: string;
    items: { item: OrderItemInsert; variants: Omit<OrderItemVariantInsert, 'orderItemId'>[] }[];
    totals: { subtotalMillimes: number; taxMillimes: number; serviceMillimes: number; totalMillimes: number };
  }): Promise<FullOrder> {
    return this.db.transaction(async (tx) => {
      for (const it of input.items) {
        const [itemRow] = await tx
          .insert(orderItems)
          .values({ ...it.item, orderId: input.orderId })
          .returning();
        if (!itemRow) throw new Error('Failed to insert order_item');
        if (it.variants.length > 0) {
          await tx
            .insert(orderItemVariants)
            .values(it.variants.map((v) => ({ ...v, orderItemId: itemRow.id })));
        }
      }
      await tx
        .update(orders)
        .set({ ...input.totals, updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));
      const [updated] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!updated) throw new Error('Order vanished mid-update');
      const [full] = await loadFullOrders(tx as unknown as Db, [updated]);
      if (!full) throw new Error('Failed to load full order');
      return full;
    });
  }

  async removeItem(input: {
    orderId: string;
    itemId: string;
    totals: { subtotalMillimes: number; taxMillimes: number; serviceMillimes: number; totalMillimes: number };
  }): Promise<FullOrder | null> {
    return this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(orderItems)
        .where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, input.orderId)))
        .returning({ id: orderItems.id });
      if (deleted.length === 0) return null;
      await tx
        .update(orders)
        .set({ ...input.totals, updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));
      const [updated] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!updated) return null;
      const [full] = await loadFullOrders(tx as unknown as Db, [updated]);
      return full ?? null;
    });
  }

  async updateOrder(id: string, patch: OrderPatch): Promise<FullOrder | null> {
    const [row] = await this.db
      .update(orders)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    if (!row) return null;
    const [full] = await loadFullOrders(this.db, [row]);
    return full ?? null;
  }
}
