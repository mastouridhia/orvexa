import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/http.js';
import { resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { loginStaff, openCustomerSession } from '../helpers/sessions.js';

async function placeOrder(token: string, dishId: string) {
  const res = await request(app())
    .post('/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ dishId, variantIds: [], quantity: 1 }] });
  expect(res.status).toBe(201);
  return res.body.data[0] as { id: string; status: string };
}

describe('Order status — invalid transitions', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('cannot skip from received directly to served', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const order = await placeOrder(customer.token, ids.dishIds.brik);
    const kitchen = await loginStaff('kitchen@demo.tn');

    const res = await request(app())
      .patch(`/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'served' });
    expect(res.status).toBe(409);
  });

  it('cannot transition a cancelled order', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const order = await placeOrder(customer.token, ids.dishIds.brik);
    const kitchen = await loginStaff('kitchen@demo.tn');

    // Cancel it
    const cancel = await request(app())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`);
    expect(cancel.status).toBe(200);

    // Try to advance — should fail
    const advance = await request(app())
      .patch(`/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'preparing' });
    expect(advance.status).toBe(409);
  });

  it('cannot cancel an order that is already served', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const order = await placeOrder(customer.token, ids.dishIds.brik);
    const kitchen = await loginStaff('kitchen@demo.tn');
    const waiter = await loginStaff('waiter@demo.tn');

    // Advance to served
    for (const status of ['preparing', 'ready'] as const) {
      await request(app())
        .patch(`/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${kitchen.accessToken}`)
        .send({ status });
    }
    await request(app())
      .patch(`/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ status: 'served' });

    // Cancel after served
    const cancel = await request(app())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`);
    expect(cancel.status).toBe(409);
  });

  it('customer cannot cancel an order past received', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const order = await placeOrder(customer.token, ids.dishIds.brik);
    const kitchen = await loginStaff('kitchen@demo.tn');

    await request(app())
      .patch(`/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'preparing' });

    const cancel = await request(app())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(cancel.status).toBe(409);
  });

  it('cannot remove the last item from an order (must cancel instead)', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const order = await placeOrder(customer.token, ids.dishIds.brik);
    const itemId = (order as unknown as { items: Array<{ id: string }> }).items?.[0]?.id;
    if (!itemId) throw new Error('test fixture: no items on order');

    const res = await request(app())
      .delete(`/orders/${order.id}/items/${itemId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(409);
  });

  it('waiter role cannot advance order past ready (only served)', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const order = await placeOrder(customer.token, ids.dishIds.brik);
    const waiter = await loginStaff('waiter@demo.tn');

    // Waiter tries to advance from received to preparing — should fail (role restriction)
    const res = await request(app())
      .patch(`/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ status: 'preparing' });
    expect(res.status).toBe(403);
  });
});
