import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/http.js';
import { resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { loginStaff, openCustomerSession } from '../helpers/sessions.js';

describe('Tables routes', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('GET /tables returns 8 tables for staff', async () => {
    const admin = await loginStaff('admin@demo.tn');
    const res = await request(app())
      .get('/tables')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.data[0].derivedStatus).toBeDefined();
  });

  it('POST /tables/:id/call-waiter as customer flips derivedStatus to call_waiter', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const ring = await request(app())
      .post(`/tables/${ids.tableIds[0]}/call-waiter`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({});
    expect(ring.status).toBe(201);

    const admin = await loginStaff('admin@demo.tn');
    const list = await request(app())
      .get('/tables')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    const target = list.body.data.find((t: { id: string }) => t.id === ids.tableIds[0]);
    expect(target.derivedStatus).toBe('call_waiter');
  });

  it('GET /tables/:id/qr returns image/png with x-qr-url header', async () => {
    const ids = await loadSeededIds();
    const admin = await loginStaff('admin@demo.tn');
    const res = await request(app())
      .get(`/tables/${ids.tableIds[1]}/qr`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.headers['x-qr-url']).toContain('/t/');
  });

  it('PATCH /tables/:id by waiter is forbidden', async () => {
    const ids = await loadSeededIds();
    const waiter = await loginStaff('waiter@demo.tn');
    const res = await request(app())
      .patch(`/tables/${ids.tableIds[0]}`)
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ label: 'Test' });
    expect(res.status).toBe(403);
  });
});
