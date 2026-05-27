import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { CloseDayPreview, CloseDayResult } from '@orvexa/shared';
import { db } from '../db/index.js';
import { tableCarts } from '../db/schema/table-carts.js';
import { tables } from '../db/schema/tables.js';
import { waiterCalls } from '../db/schema/waiter-calls.js';
import { orders } from '../db/schema/orders.js';

const ACTIVE_STATUSES = ['received', 'preparing', 'ready'] as const;

export async function previewCloseDay(restaurantId: string): Promise<CloseDayPreview> {
  const [activeOrders, unpaidServed, tablesToReset, cartsToDelete, callsToClear] =
    await Promise.all([
      db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(eq(orders.restaurantId, restaurantId), inArray(orders.status, [...ACTIVE_STATUSES])),
        ),
      db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, 'served'),
            ne(orders.paymentStatus, 'paid'),
          ),
        ),
      db
        .select({ id: tables.id })
        .from(tables)
        .where(and(eq(tables.restaurantId, restaurantId), ne(tables.status, 'free'))),
      db
        .select({ id: tableCarts.id })
        .from(tableCarts)
        .where(eq(tableCarts.restaurantId, restaurantId)),
      db
        .select({ id: waiterCalls.id })
        .from(waiterCalls)
        .where(and(eq(waiterCalls.restaurantId, restaurantId), isNull(waiterCalls.clearedAt))),
    ]);

  return {
    activeOrdersToCancel: activeOrders.length,
    unpaidServedOrders: unpaidServed.length,
    tablesToReset: tablesToReset.length,
    cartsToDelete: cartsToDelete.length,
    callsToClear: callsToClear.length,
  };
}

export async function closeDayForRestaurant(restaurantId: string): Promise<CloseDayResult> {
  const now = new Date();
  return db.transaction(async (tx) => {
    const cancelledOrders = await tx
      .update(orders)
      .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(
        and(eq(orders.restaurantId, restaurantId), inArray(orders.status, [...ACTIVE_STATUSES])),
      )
      .returning({ id: orders.id });

    const unpaidServed = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          eq(orders.status, 'served'),
          ne(orders.paymentStatus, 'paid'),
        ),
      );

    const resetTables = await tx
      .update(tables)
      .set({ status: 'free', updatedAt: now })
      .where(and(eq(tables.restaurantId, restaurantId), ne(tables.status, 'free')))
      .returning({ id: tables.id });

    const deletedCarts = await tx
      .delete(tableCarts)
      .where(eq(tableCarts.restaurantId, restaurantId))
      .returning({ id: tableCarts.id });

    const clearedCalls = await tx
      .update(waiterCalls)
      .set({ clearedAt: now })
      .where(and(eq(waiterCalls.restaurantId, restaurantId), isNull(waiterCalls.clearedAt)))
      .returning({ id: waiterCalls.id });

    return {
      activeOrdersToCancel: cancelledOrders.length,
      unpaidServedOrders: unpaidServed.length,
      tablesToReset: resetTables.length,
      cartsToDelete: deletedCarts.length,
      callsToClear: clearedCalls.length,
      closedAt: now.toISOString(),
    };
  });
}
