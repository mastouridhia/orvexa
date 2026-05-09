import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, resetTransactionalState, loadSeededIds } from './helpers/db.js';
import { orders, orderItems } from '../src/db/schema/orders.js';
import { tables } from '../src/db/schema/tables.js';

describe('db harness', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('global setup created the fixture (restaurant, staff, tables, menu)', async () => {
    const ids = await loadSeededIds();
    expect(ids.restaurantId).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids.staff.admin).toBeDefined();
    expect(ids.staff.kitchen).toBeDefined();
    expect(ids.tableIds).toHaveLength(8);
    expect(ids.dishIds.couscous).toBeDefined();
  });

  it('resetTransactionalState clears orders but leaves tables intact', async () => {
    const ids = await loadSeededIds();
    const tableId = ids.tableIds[0];
    if (!tableId) throw new Error('no seeded table');

    await db.insert(orders).values({
      restaurantId: ids.restaurantId,
      tableId,
      status: 'received',
      subtotalMillimes: 1000,
      taxMillimes: 190,
      serviceMillimes: 100,
      totalMillimes: 1290,
    });

    const before = await db.select().from(orders);
    expect(before).toHaveLength(1);

    await resetTransactionalState();

    const after = await db.select().from(orders);
    expect(after).toHaveLength(0);

    // Tables fixture survives
    const fixtureTables = await db.select().from(tables);
    expect(fixtureTables).toHaveLength(8);
  });

  it('cascading truncate also clears order_items', async () => {
    const ids = await loadSeededIds();
    const tableId = ids.tableIds[0];
    if (!tableId) throw new Error('no seeded table');

    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: ids.restaurantId,
        tableId,
        status: 'received',
        subtotalMillimes: 0,
        taxMillimes: 0,
        serviceMillimes: 0,
        totalMillimes: 0,
      })
      .returning();
    if (!order) throw new Error('failed to insert order');

    await db.insert(orderItems).values({
      orderId: order.id,
      dishId: ids.dishIds.brik,
      nameSnapshotAr: 'بريك',
      nameSnapshotFr: 'Brik',
      nameSnapshotEn: 'Brik',
      unitPriceMillimes: 4500,
      quantity: 1,
    });

    const itemsBefore = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(itemsBefore).toHaveLength(1);

    await resetTransactionalState();

    const itemsAfter = await db.select().from(orderItems);
    expect(itemsAfter).toHaveLength(0);
  });

  it('isolation across tests: a previous insert is gone by the next test (sentinel check)', async () => {
    const all = await db.select().from(orders);
    expect(all).toHaveLength(0);
  });
});
