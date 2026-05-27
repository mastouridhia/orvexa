import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/http.js';
import { resetTransactionalState } from '../helpers/db.js';

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('200 with envelope { data: { accessToken, refreshToken, user } }', async () => {
    const res = await request(app())
      .post('/auth/login')
      .send({ email: 'admin@demo.tn', password: 'orvexa' });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.user.email).toBe('admin@demo.tn');
    expect(res.body.data.user.role).toBe('admin');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('401 on wrong password', async () => {
    const res = await request(app())
      .post('/auth/login')
      .send({ email: 'admin@demo.tn', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('400 on missing email with VALIDATION_ERROR code', async () => {
    const res = await request(app()).post('/auth/login').send({ password: 'orvexa' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refresh works after login; access token sent as refresh is rejected', async () => {
    const login = await request(app())
      .post('/auth/login')
      .send({ email: 'manager@demo.tn', password: 'orvexa' });
    const { accessToken, refreshToken } = login.body.data as {
      accessToken: string;
      refreshToken: string;
    };

    const refresh = await request(app()).post('/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(200);
    expect(typeof refresh.body.data.accessToken).toBe('string');

    const xtyp = await request(app()).post('/auth/refresh').send({ refreshToken: accessToken });
    expect(xtyp.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('401 without bearer token', async () => {
    const res = await request(app()).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user with valid bearer', async () => {
    const login = await request(app())
      .post('/auth/login')
      .send({ email: 'kitchen@demo.tn', password: 'orvexa' });
    const accessToken = login.body.data.accessToken as string;

    const res = await request(app()).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('kitchen@demo.tn');
    expect(res.body.data.role).toBe('kitchen');
  });
});
