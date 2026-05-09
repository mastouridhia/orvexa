import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { OrderService } from '../../src/services/order.js';
import { ConflictError, ForbiddenError, ValidationError } from '../../src/utils/errors.js';
import { variantGroups, variants } from '../../src/db/schema/menu.js';

const service = new OrderService();

async function pickFirstVariant(groupDishId: string): Promise<string> {
  const groups = await db
    .select({ id: variantGroups.id })
    .from(variantGroups)
    .where(eq(variantGroups.dishId, groupDishId));
  if (!groups[0]) throw new Error('test fixture: variant group missing');
  const vs = await db.select().from(variants).where(eq(variants.groupId, groups[0].id));
  if (!vs[0]) throw new Error('test fixture: variant missing');
  return vs[0].id;
}

describe('OrderService.place — totals', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('computes subtotal, 19% tax, 10% service, total for a single item', async () => {
    const ids = await loadSeededIds();
    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });
    // brik = 4500
    expect(order.subtotalMillimes).toBe(4500);
    expect(order.taxMillimes).toBe(Math.round(4500 * 0.19)); // 855
    expect(order.serviceMillimes).toBe(Math.round(4500 * 0.1)); // 450
    expect(order.totalMillimes).toBe(4500 + 855 + 450); // 5805
  });

  it('includes variant price deltas in the line total', async () => {
    const ids = await loadSeededIds();
    // water 2000 + Large variant +1500 = 3500
    const variantsRows = await db
      .select()
      .from(variants);
    const sizeVariants = variantsRows.filter((v) => v.nameEn === 'Large');
    const largeId = sizeVariants[0]?.id;
    if (!largeId) throw new Error('test fixture: Large variant missing');

    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.water, variantIds: [largeId], quantity: 2 }] },
    });
    expect(order.subtotalMillimes).toBe(7000); // 2 × (2000 + 1500)
    expect(order.totalMillimes).toBe(7000 + Math.round(7000 * 0.19) + Math.round(7000 * 0.1));
  });

  it('snapshots names + prices into order_items so menu edits do not retro-mutate orders', async () => {
    const ids = await loadSeededIds();
    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });
    expect(order.items[0]?.nameSnapshot.fr).toBe('Brik à l’œuf');
    expect(order.items[0]?.nameSnapshot.en).toBe('Egg Brik');
    expect(order.items[0]?.unitPriceMillimes).toBe(4500);
  });

  it('rejects a dish from a different restaurant', async () => {
    const ids = await loadSeededIds();
    await expect(
      service.place({
        restaurantId: '11111111-1111-1111-1111-111111111111',
        tableId: ids.tableIds[0]!,
        tableDayTokenId: null,
        sessionId: null,
        body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
      }),
    ).rejects.toBeDefined();
  });

  it('rejects an empty items array', async () => {
    const ids = await loadSeededIds();
    await expect(
      service.place({
        restaurantId: ids.restaurantId,
        tableId: ids.tableIds[0]!,
        tableDayTokenId: null,
        sessionId: null,
        body: { items: [] },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('OrderService — state machine', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  async function placeOne() {
    const ids = await loadSeededIds();
    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });
    return { ids, order };
  }

  it('walks received → preparing → ready → served', async () => {
    const { ids, order } = await placeOne();
    const a = await service.updateStatus(ids.restaurantId, order.id, { status: 'preparing' });
    expect(a.status).toBe('preparing');
    const b = await service.updateStatus(ids.restaurantId, order.id, { status: 'ready' });
    expect(b.status).toBe('ready');
    const c = await service.updateStatus(ids.restaurantId, order.id, { status: 'served' });
    expect(c.status).toBe('served');
  });

  it('rejects skipping states (received → ready)', async () => {
    const { ids, order } = await placeOne();
    await expect(
      service.updateStatus(ids.restaurantId, order.id, { status: 'ready' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects transitions from a terminal state', async () => {
    const { ids, order } = await placeOne();
    await service.cancel(ids.restaurantId, order.id);
    await expect(
      service.updateStatus(ids.restaurantId, order.id, { status: 'preparing' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('cancellable while received and preparing, not after ready', async () => {
    const { ids, order } = await placeOne();
    const cancelled = await service.cancel(ids.restaurantId, order.id);
    expect(cancelled.status).toBe('cancelled');

    const { ids: ids2, order: order2 } = await placeOne();
    await service.updateStatus(ids2.restaurantId, order2.id, { status: 'preparing' });
    await service.updateStatus(ids2.restaurantId, order2.id, { status: 'ready' });
    await expect(service.cancel(ids2.restaurantId, order2.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe('OrderService — customer edits', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('addItems while received recomputes totals; rejects after preparing', async () => {
    const ids = await loadSeededIds();
    const sessionId = '00000000-0000-0000-0000-000000000aaa';
    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null, // customer guard skipped when null
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });

    const after = await service.addItems({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.salad, variantIds: [], quantity: 1 }] },
    });
    expect(after.subtotalMillimes).toBe(4500 + 6000);
    expect(after.items).toHaveLength(2);

    await service.updateStatus(ids.restaurantId, order.id, { status: 'preparing' });
    await expect(
      service.addItems({
        restaurantId: ids.restaurantId,
        orderId: order.id,
        sessionId: null,
        body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    // session guard
    void sessionId;
  });

  it('cancelForCustomer enforces session ownership', async () => {
    const ids = await loadSeededIds();
    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });
    await expect(
      service.cancelForCustomer('00000000-0000-0000-0000-000000000bbb', order.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('OrderService — variant resolution coverage', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('serializes selected variant snapshots correctly', async () => {
    const ids = await loadSeededIds();
    const variantId = await pickFirstVariant(ids.dishIds.couscous);
    const order = await service.place({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: {
        items: [{ dishId: ids.dishIds.couscous, variantIds: [variantId], quantity: 1 }],
      },
    });
    expect(order.items[0]?.variants).toHaveLength(1);
    expect(order.items[0]?.variants[0]?.variantId).toBe(variantId);
  });
});
