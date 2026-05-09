import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/http.js';
import { resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { loginStaff, openCustomerSession } from '../helpers/sessions.js';

async function placeAndAdvanceToReady(
  customerToken: string,
  staffToken: string,
  dishId: string,
): Promise<{ orderId: string; totalMillimes: number }> {
  const place = await request(app())
    .post('/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ items: [{ dishId, variantIds: [], quantity: 1 }] });
  if (place.status !== 201) throw new Error(`place: ${place.status}`);
  const orderId = place.body.data.id as string;
  const totalMillimes = place.body.data.totalMillimes as number;
  await request(app())
    .patch(`/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'preparing' });
  await request(app())
    .patch(`/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'ready' });
  return { orderId, totalMillimes };
}

describe('Payments routes', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('full cash payment flips order paymentStatus to paid', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const kitchen = await loginStaff('kitchen@demo.tn');
    const waiter = await loginStaff('waiter@demo.tn');
    const { orderId } = await placeAndAdvanceToReady(
      customer.token,
      kitchen.accessToken,
      ids.dishIds.brik,
    );

    const pay = await request(app())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ method: 'cash', tipMillimes: 0 });
    expect(pay.status).toBe(201);
    expect(pay.body.data.fullyPaid).toBe(true);
    expect(pay.body.data.order.paymentStatus).toBe('paid');
  });

  it('split bill across two cash payments — first leaves pending, second flips to paid', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[1]!);
    const kitchen = await loginStaff('kitchen@demo.tn');
    const waiter = await loginStaff('waiter@demo.tn');
    const { orderId, totalMillimes } = await placeAndAdvanceToReady(
      customer.token,
      kitchen.accessToken,
      ids.dishIds.brik,
    );
    const half = Math.floor(totalMillimes / 2);
    const rest = totalMillimes - half;

    const first = await request(app())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ method: 'cash', amountMillimes: half, tipMillimes: 0 });
    expect(first.status).toBe(201);
    expect(first.body.data.fullyPaid).toBe(false);
    expect(first.body.data.order.paymentStatus).toBe('pending');

    const second = await request(app())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ method: 'cash', amountMillimes: rest, tipMillimes: 0 });
    expect(second.status).toBe(201);
    expect(second.body.data.fullyPaid).toBe(true);
    expect(second.body.data.order.paymentStatus).toBe('paid');
  });

  it('kitchen role is forbidden from POST /pay (waiter/admin/manager only)', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[2]!);
    const kitchen = await loginStaff('kitchen@demo.tn');
    const { orderId } = await placeAndAdvanceToReady(
      customer.token,
      kitchen.accessToken,
      ids.dishIds.brik,
    );

    const res = await request(app())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ method: 'cash', tipMillimes: 0 });
    expect(res.status).toBe(403);
  });

  it('GET /receipt.html returns text/html', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[3]!);
    const kitchen = await loginStaff('kitchen@demo.tn');
    const waiter = await loginStaff('waiter@demo.tn');
    const { orderId } = await placeAndAdvanceToReady(
      customer.token,
      kitchen.accessToken,
      ids.dishIds.brik,
    );
    await request(app())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ method: 'cash', tipMillimes: 0 });

    const res = await request(app())
      .get(`/orders/${orderId}/receipt.html`)
      .set('Authorization', `Bearer ${waiter.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Total');
  });
});
