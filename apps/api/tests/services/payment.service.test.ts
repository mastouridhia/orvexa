import { describe, it, expect, beforeEach } from 'vitest';
import { resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { OrderService } from '../../src/services/order.js';
import { PaymentService } from '../../src/services/payment.js';
import { ConflictError, ForbiddenError, ValidationError } from '../../src/utils/errors.js';
import type { Order } from '@orvexa/shared';
import type { SeededIds } from '../../src/db/seed-data.js';

const orderService = new OrderService();
const paymentService = new PaymentService();

async function placeReadyOrder(): Promise<{ ids: SeededIds; order: Order }> {
  const ids = await loadSeededIds();
  const [placed] = await orderService.placeMulti({
    restaurantId: ids.restaurantId,
    tableId: ids.tableIds[0]!,
    tableDayTokenId: null,
    sessionId: null,
    body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
  });
  await orderService.updateStatus(ids.restaurantId, placed!.id, { status: 'preparing' });
  await orderService.updateStatus(ids.restaurantId, placed!.id, { status: 'ready' });
  const order = await orderService.get(ids.restaurantId, placed!.id);
  return { ids, order };
}

describe('PaymentService.record', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('cash full payment marks order paid and stamps the method', async () => {
    const { ids, order } = await placeReadyOrder();
    const result = await paymentService.record({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      collectedByUserId: ids.staff.waiter,
      body: { method: 'cash', tipMillimes: 0 },
    });
    expect(result.fullyPaid).toBe(true);
    expect(result.order.paymentStatus).toBe('paid');
    expect(result.order.paymentMethod).toBe('cash');
    expect(result.payment.amountMillimes).toBe(order.totalMillimes);
    expect(result.payment.status).toBe('paid');
    expect(result.payment.paidAt).not.toBeNull();
  });

  it('rejects payment when order is in received (not yet ready)', async () => {
    const ids = await loadSeededIds();
    const [order] = await orderService.placeMulti({
      restaurantId: ids.restaurantId,
      tableId: ids.tableIds[0]!,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });
    await expect(
      paymentService.record({
        restaurantId: ids.restaurantId,
        orderId: order!.id,
        collectedByUserId: ids.staff.waiter,
        body: { method: 'cash', tipMillimes: 0 },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects double-pay once order is fully paid', async () => {
    const { ids, order } = await placeReadyOrder();
    await paymentService.record({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      collectedByUserId: ids.staff.waiter,
      body: { method: 'cash', tipMillimes: 0 },
    });
    await expect(
      paymentService.record({
        restaurantId: ids.restaurantId,
        orderId: order.id,
        collectedByUserId: ids.staff.waiter,
        body: { method: 'cash', tipMillimes: 0 },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('split bill: two cash payments add up; first leaves order pending, second flips it to paid', async () => {
    const { ids, order } = await placeReadyOrder();
    const half = Math.floor(order.totalMillimes / 2);
    const rest = order.totalMillimes - half;

    const first = await paymentService.record({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      collectedByUserId: ids.staff.waiter,
      body: { method: 'cash', amountMillimes: half, tipMillimes: 0 },
    });
    expect(first.fullyPaid).toBe(false);
    expect(first.order.paymentStatus).toBe('pending');

    const second = await paymentService.record({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      collectedByUserId: ids.staff.waiter,
      body: { method: 'cash', amountMillimes: rest, tipMillimes: 0 },
    });
    expect(second.fullyPaid).toBe(true);
    expect(second.order.paymentStatus).toBe('paid');

    const receipt = await paymentService.getReceipt(ids.restaurantId, order.id);
    expect(receipt.payments).toHaveLength(2);
    expect(receipt.amountPaidMillimes).toBe(order.totalMillimes);
    expect(receipt.amountDueMillimes).toBe(0);
  });

  it('amount > remaining is rejected', async () => {
    const { ids, order } = await placeReadyOrder();
    await expect(
      paymentService.record({
        restaurantId: ids.restaurantId,
        orderId: order.id,
        collectedByUserId: ids.staff.waiter,
        body: { method: 'cash', amountMillimes: order.totalMillimes + 1, tipMillimes: 0 },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('card method creates a pending payment with stub-* providerReference; order stays pending', async () => {
    const { ids, order } = await placeReadyOrder();
    const result = await paymentService.record({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      collectedByUserId: ids.staff.waiter,
      body: { method: 'card', tipMillimes: 0 },
    });
    expect(result.fullyPaid).toBe(false);
    expect(result.payment.status).toBe('pending');
    expect(result.payment.providerReference).toMatch(/^stub-/);
    expect(result.order.paymentStatus).toBe('pending');
  });

  it('cross-restaurant access on getReceipt is forbidden', async () => {
    const { order } = await placeReadyOrder();
    await expect(
      paymentService.getReceipt('11111111-1111-1111-1111-111111111111', order.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('tip is preserved per payment row and totaled in the receipt', async () => {
    const { ids, order } = await placeReadyOrder();
    await paymentService.record({
      restaurantId: ids.restaurantId,
      orderId: order.id,
      collectedByUserId: ids.staff.waiter,
      body: { method: 'cash', tipMillimes: 1500 },
    });
    const receipt = await paymentService.getReceipt(ids.restaurantId, order.id);
    expect(receipt.tipTotalMillimes).toBe(1500);
  });
});
