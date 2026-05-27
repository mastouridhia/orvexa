import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../helpers/http.js';
import { db, resetTransactionalState } from '../helpers/db.js';
import { loginStaff } from '../helpers/sessions.js';
import { users } from '../../src/db/schema/staff.js';

describe('Auth — token invalidation', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('refresh token rotates on /auth/refresh and old refresh token is rejected', async () => {
    const { refreshToken } = await loginStaff('admin@demo.tn');

    const refresh1 = await request(app())
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(refresh1.status).toBe(200);
    const newRefreshToken = refresh1.body.data.refreshToken as string;

    // Original refresh token must now be invalid (rotation)
    const refresh2 = await request(app())
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(refresh2.status).toBe(401);

    // New refresh token is valid
    const refresh3 = await request(app())
      .post('/auth/refresh')
      .send({ refreshToken: newRefreshToken });
    expect(refresh3.status).toBe(200);
  });

  it('access token is rejected after tokenVersion bump', async () => {
    const { accessToken, userId } = await loginStaff('admin@demo.tn');

    // Verify token works before bump
    const before = await request(app())
      .get('/restaurant')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(before.status).toBe(200);

    // Bump tokenVersion directly (simulates role change / forced logout)
    await db
      .update(users)
      .set({ tokenVersion: 999 })
      .where(eq(users.id, userId));

    // Old token should now be rejected
    const after = await request(app())
      .get('/restaurant')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(after.status).toBe(401);
  });

  it('logout invalidates refresh token', async () => {
    const { accessToken, refreshToken } = await loginStaff('admin@demo.tn');

    const logout = await request(app())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    // Refresh token must be invalid after logout
    const refresh = await request(app())
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(refresh.status).toBe(401);
  });

  it('rejects requests with no Authorization header', async () => {
    const res = await request(app()).get('/orders');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a malformed JWT', async () => {
    const res = await request(app())
      .get('/orders')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });
});
