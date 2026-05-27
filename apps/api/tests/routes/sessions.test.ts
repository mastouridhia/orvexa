import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../helpers/http.js';
import { db, resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { openCustomerSession } from '../helpers/sessions.js';
import { customerSessions } from '../../src/db/schema/sessions.js';

describe('Customer sessions', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('opens a session from a valid QR token', async () => {
    const ids = await loadSeededIds();
    const session = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    expect(session.token).toBeTruthy();
    expect(session.sessionId).toBeTruthy();
    expect(session.tableId).toBe(ids.tableIds[0]);
  });

  it('expired session is rejected with 401', async () => {
    const ids = await loadSeededIds();
    const session = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);

    // Expire the session by moving its expiresAt to the past
    await db
      .update(customerSessions)
      .set({
        expiresAt: new Date(Date.now() - 1000),
        absoluteExpiresAt: new Date(Date.now() - 1000),
      })
      .where(eq(customerSessions.id, session.sessionId));

    const res = await request(app())
      .get('/menu')
      .set('Authorization', `Bearer ${session.token}`);
    expect(res.status).toBe(401);
  });

  it('renews session when close to expiry', async () => {
    const ids = await loadSeededIds();
    const session = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);

    // Move expiresAt within the renewal threshold (< 30 min from now)
    const soonToExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await db
      .update(customerSessions)
      .set({ expiresAt: soonToExpire })
      .where(eq(customerSessions.id, session.sessionId));

    const res = await request(app())
      .post('/sessions/renew')
      .set('Authorization', `Bearer ${session.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    // New token should be different (extended session issues a fresh JWT)
  });

  it('rejects session renewal when absolutely expired', async () => {
    const ids = await loadSeededIds();
    const session = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);

    // Expire both relative and absolute TTL
    const past = new Date(Date.now() - 1000);
    await db
      .update(customerSessions)
      .set({ expiresAt: past, absoluteExpiresAt: past })
      .where(eq(customerSessions.id, session.sessionId));

    const res = await request(app())
      .post('/sessions/renew')
      .set('Authorization', `Bearer ${session.token}`);
    expect(res.status).toBe(401);
  });

  it('rejects an invalid QR token', async () => {
    const res = await request(app())
      .post('/sessions')
      .send({ qrToken: 'totally-invalid-qr-token', locale: 'fr' });
    expect(res.status).toBe(401);
  });
});
