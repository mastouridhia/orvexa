import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/http.js';
import { resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { loginStaff, openCustomerSession } from '../helpers/sessions.js';

describe('Orders end-to-end (HTTP)', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('customer places an order; kitchen advances received → preparing → ready → served', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);

    const place = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 2 }] });
    expect(place.status).toBe(201);
    expect(place.body.data.status).toBe('received');
    expect(place.body.data.subtotalMillimes).toBe(9000); // 2 × 4500
    const orderId = place.body.data.id as string;

    const kitchen = await loginStaff('kitchen@demo.tn');

    const toPreparing = await request(app())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'preparing' });
    expect(toPreparing.status).toBe(200);
    expect(toPreparing.body.data.status).toBe('preparing');

    const toReady = await request(app())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'ready' });
    expect(toReady.status).toBe(200);
    expect(toReady.body.data.status).toBe('ready');

    const waiter = await loginStaff('waiter@demo.tn');
    const toServed = await request(app())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ status: 'served' });
    expect(toServed.status).toBe(200);
    expect(toServed.body.data.status).toBe('served');
  });

  it('customer cannot add items after order leaves received', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[1]!);

    const place = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] });
    const orderId = place.body.data.id as string;

    const kitchen = await loginStaff('kitchen@demo.tn');
    await request(app())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'preparing' });

    const addAfter = await request(app())
      .post(`/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.salad, variantIds: [], quantity: 1 }] });
    expect(addAfter.status).toBe(409);
    expect(addAfter.body.error.code).toBe('CONFLICT');
  });

  it('kitchen role cannot transition received → ready (must go through preparing)', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[2]!);
    const place = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] });
    const orderId = place.body.data.id as string;

    const kitchen = await loginStaff('kitchen@demo.tn');
    const skip = await request(app())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'ready' });
    expect(skip.status).toBe(409);
  });

  it('orders/active is gated by staff JWT (401 without)', async () => {
    const res = await request(app()).get('/orders/active');
    expect(res.status).toBe(401);
  });

  it('GET /orders/:id with customer session returns own order, 403 across sessions', async () => {
    const ids = await loadSeededIds();
    const customerA = await openCustomerSession(ids.restaurantId, ids.tableIds[3]!);
    const place = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customerA.token}`)
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] });
    const orderId = place.body.data.id as string;

    const own = await request(app())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerA.token}`);
    expect(own.status).toBe(200);

    const customerB = await openCustomerSession(ids.restaurantId, ids.tableIds[4]!);
    const cross = await request(app())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerB.token}`);
    expect(cross.status).toBe(403);
  });
});
