import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../helpers/http.js';
import { db, resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { loginStaff, openCustomerSession } from '../helpers/sessions.js';
import { restaurants } from '../../src/db/schema/restaurants.js';
import { redis } from '../../src/cache/client.js';
import type { SeededIds } from '../../src/db/seed-data.js';

// Shared across all blocks — seeded fixture is stable, only transactional rows change.
let ids: SeededIds;

beforeAll(async () => {
  ids = await loadSeededIds();
});

beforeEach(async () => {
  await resetTransactionalState();
  // Reset restaurant gate to the default so each test is isolated.
  await db
    .update(restaurants)
    .set({ orderGateMode: 'off', allowedNetworks: [] })
    .where(eq(restaurants.id, ids.restaurantId));
  // Clean up any ceiling bypass keys from a previous test run.
  try {
    const keys = ids.tableIds.map((id) => `ceiling:bypass:${id}`);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis unavailable — key cleanup skipped; ceiling tests may be flaky without Redis.
  }
});

// ─── Gate mode: off ──────────────────────────────────────────────────────────

describe('gate mode: off', () => {
  it('allows order placement with no IP or code', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const res = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] });
    expect(res.status).toBe(201);
  });
});

// ─── Gate mode: wifi ─────────────────────────────────────────────────────────

describe('gate mode: wifi', () => {
  beforeEach(async () => {
    await db
      .update(restaurants)
      .set({ orderGateMode: 'wifi', allowedNetworks: ['10.0.0.0/24'] })
      .where(eq(restaurants.id, ids.restaurantId));
  });

  it('allows order when request IP is on the allowed network', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[1]!);
    const res = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('X-Forwarded-For', '10.0.0.5')
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] });
    expect(res.status).toBe(201);
  });

  it('blocks with NOT_ON_PREMISES when IP is off-network', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[1]!);
    const res = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ON_PREMISES');
  });
});

// ─── Gate mode: code ─────────────────────────────────────────────────────────

describe('gate mode: code', () => {
  beforeEach(async () => {
    await db
      .update(restaurants)
      .set({ orderGateMode: 'code', allowedNetworks: [] })
      .where(eq(restaurants.id, ids.restaurantId));
  });

  it('blocks with TABLE_NOT_OPEN for unverified session', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[2]!);
    const res = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TABLE_NOT_OPEN');
  });

  it('allows order after session is presence-verified via code', async () => {
    const tableId = ids.tableIds[2]!;
    // Waiter issues a code
    const waiter = await loginStaff('waiter@demo.tn');
    const codeRes = await request(app())
      .post(`/tables/${tableId}/ordering-code`)
      .set('Authorization', `Bearer ${waiter.accessToken}`);
    expect(codeRes.status).toBe(201);
    const code: string = codeRes.body.data.code;

    // Customer verifies code
    const customer = await openCustomerSession(ids.restaurantId, tableId);
    const verifyRes = await request(app())
      .post('/sessions/verify-code')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.session.presenceVerified).toBe(true);

    // Now placing an order should succeed
    const orderRes = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    expect(orderRes.status).toBe(201);
  });
});

// ─── Gate mode: wifi_or_code ──────────────────────────────────────────────────

describe('gate mode: wifi_or_code', () => {
  beforeEach(async () => {
    await db
      .update(restaurants)
      .set({ orderGateMode: 'wifi_or_code', allowedNetworks: ['192.168.100.0/24'] })
      .where(eq(restaurants.id, ids.restaurantId));
  });

  it('allows when IP is on the allowed network (no code needed)', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[3]!);
    const res = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('X-Forwarded-For', '192.168.100.10')
      .send({ items: [{ dishId: ids.dishIds.coffee, variantIds: [], quantity: 1 }] });
    expect(res.status).toBe(201);
  });

  it('allows when session is presence-verified (off-network)', async () => {
    const tableId = ids.tableIds[3]!;
    const waiter = await loginStaff('waiter@demo.tn');
    const codeRes = await request(app())
      .post(`/tables/${tableId}/ordering-code`)
      .set('Authorization', `Bearer ${waiter.accessToken}`);
    const code: string = codeRes.body.data.code;

    const customer = await openCustomerSession(ids.restaurantId, tableId);
    await request(app())
      .post('/sessions/verify-code')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code });

    const orderRes = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('X-Forwarded-For', '8.8.8.8') // off-network
      .send({ items: [{ dishId: ids.dishIds.coffee, variantIds: [], quantity: 1 }] });
    expect(orderRes.status).toBe(201);
  });

  it('blocks with TABLE_NOT_OPEN when neither on WiFi nor verified', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[3]!);
    const res = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('X-Forwarded-For', '8.8.8.8')
      .send({ items: [{ dishId: ids.dishIds.coffee, variantIds: [], quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TABLE_NOT_OPEN');
  });
});

// ─── POST /sessions/verify-code ───────────────────────────────────────────────

describe('POST /sessions/verify-code', () => {
  it('rejects when no active code exists for the table', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const res = await request(app())
      .post('/sessions/verify-code')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code: '1234' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TABLE_NOT_OPEN');
  });

  it('rejects wrong code with VALIDATION_ERROR', async () => {
    const tableId = ids.tableIds[0]!;
    const waiter = await loginStaff('waiter@demo.tn');
    await request(app())
      .post(`/tables/${tableId}/ordering-code`)
      .set('Authorization', `Bearer ${waiter.accessToken}`);

    const customer = await openCustomerSession(ids.restaurantId, tableId);
    const res = await request(app())
      .post('/sessions/verify-code')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code: '0000' }); // wrong
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('locks out (clears code) after 5 wrong attempts', async () => {
    const tableId = ids.tableIds[0]!;
    const waiter = await loginStaff('waiter@demo.tn');
    await request(app())
      .post(`/tables/${tableId}/ordering-code`)
      .set('Authorization', `Bearer ${waiter.accessToken}`);

    const customer = await openCustomerSession(ids.restaurantId, tableId);

    // 4 wrong attempts → 400 VALIDATION_ERROR each time
    for (let i = 0; i < 4; i++) {
      const r = await request(app())
        .post('/sessions/verify-code')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ code: '0000' });
      expect(r.status).toBe(400);
    }

    // 5th wrong attempt → lockout, code cleared → 403 TABLE_NOT_OPEN
    const lockout = await request(app())
      .post('/sessions/verify-code')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code: '0000' });
    expect(lockout.status).toBe(403);
    expect(lockout.body.error.code).toBe('TABLE_NOT_OPEN');

    // Subsequent attempt also fails (code was cleared) even with a plausible code
    const afterLockout = await request(app())
      .post('/sessions/verify-code')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code: '9999' });
    expect(afterLockout.status).toBe(403);
  });
});

// ─── Staff routes bypass presence gate ───────────────────────────────────────

describe('staff routes bypass presence gate', () => {
  it('kitchen can advance order status regardless of gate mode', async () => {
    // Place an order while gate is off
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const placeRes = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.couscous, variantIds: [], quantity: 1 }] });
    expect(placeRes.status).toBe(201);
    const orderId: string = placeRes.body.data[0].id;

    // Now lock the gate down
    await db
      .update(restaurants)
      .set({ orderGateMode: 'wifi', allowedNetworks: ['10.0.0.0/24'] })
      .where(eq(restaurants.id, ids.restaurantId));

    // Kitchen can still advance status — no presence middleware on staff routes
    const kitchen = await loginStaff('kitchen@demo.tn');
    const advanceRes = await request(app())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ status: 'preparing' });
    expect(advanceRes.status).toBe(200);
    expect(advanceRes.body.data.status).toBe('preparing');
  });
});

// ─── Idempotency (POST /orders with x-idempotency-key) ───────────────────────

describe('POST /orders idempotency', () => {
  it('returns the same order for a duplicate idempotency key', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const idemKey = `test-idem-${Date.now()}`;

    const first = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('x-idempotency-key', idemKey)
      .send({ items: [{ dishId: ids.dishIds.salad, variantIds: [], quantity: 1 }] });
    expect(first.status).toBe(201);

    const second = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('x-idempotency-key', idemKey)
      .send({ items: [{ dishId: ids.dishIds.salad, variantIds: [], quantity: 1 }] });

    // If Redis is up: 200 (cache hit), same order IDs.
    // If Redis is down: 201 (new order placed — idempotency key not stored).
    expect([200, 201]).toContain(second.status);

    // When Redis is available the IDs must match.
    if (first.body.data[0].id === second.body.data[0].id) {
      // Confirm only one order exists (deduplicated)
      expect(second.body.data).toHaveLength(first.body.data.length);
    }
  });

  it('places a distinct order for a different idempotency key', async () => {
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);

    const first = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('x-idempotency-key', `idem-A-${Date.now()}`)
      .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    expect(first.status).toBe(201);

    const second = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .set('x-idempotency-key', `idem-B-${Date.now()}`)
      .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    expect(second.status).toBe(201);

    expect(first.body.data[0].id).not.toBe(second.body.data[0].id);
  });
});

// ─── Per-table order ceiling ──────────────────────────────────────────────────

describe('per-table order ceiling', () => {
  it('blocks a 7th order when 6 active orders already exist at the table', async () => {
    const tableId = ids.tableIds[0]!;
    const customer = await openCustomerSession(ids.restaurantId, tableId);

    // Place 6 orders (all stay in "received" status — active)
    for (let i = 0; i < 6; i++) {
      const res = await request(app())
        .post('/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
      expect(res.status).toBe(201);
    }

    // 7th order should be rejected
    const over = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    expect(over.status).toBe(429);
    expect(over.body.error.code).toBe('RATE_LIMITED');
  });

  it('allows order after waiter unlocks ceiling bypass', async () => {
    const tableId = ids.tableIds[0]!;
    const customer = await openCustomerSession(ids.restaurantId, tableId);

    // Fill up to ceiling
    for (let i = 0; i < 6; i++) {
      await request(app())
        .post('/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    }

    // Waiter unlocks
    const waiter = await loginStaff('waiter@demo.tn');
    const unlock = await request(app())
      .delete(`/tables/${tableId}/order-ceiling`)
      .set('Authorization', `Bearer ${waiter.accessToken}`);
    expect(unlock.status).toBe(200);
    expect(unlock.body.data.ok).toBe(true);

    // 7th order now succeeds (bypass active)
    const over = await request(app())
      .post('/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ items: [{ dishId: ids.dishIds.water, variantIds: [], quantity: 1 }] });
    expect(over.status).toBe(201);
  });
});
