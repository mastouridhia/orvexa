import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/http.js';
import { resetTransactionalState, fullResetAndReseed, loadSeededIds } from '../helpers/db.js';
import { loginStaff, openCustomerSession } from '../helpers/sessions.js';

describe('Menu routes', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('GET /menu via customer session returns categories with dishes', async () => {
    const ids = await loadSeededIds();
    const customer = await openCustomerSession(ids.restaurantId, ids.tableIds[0]!);
    const res = await request(app())
      .get('/menu')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const drinks = res.body.data.find((c: { name: { en: string } }) => c.name.en === 'Drinks');
    expect(drinks.dishes.length).toBeGreaterThan(0);
  });

  it('GET /menu without auth returns 401', async () => {
    const res = await request(app()).get('/menu');
    expect(res.status).toBe(401);
  });
});

describe('Menu — admin CRUD', () => {
  beforeEach(async () => {
    await fullResetAndReseed();
  });

  it('admin creates a category and patches it; waiter cannot', async () => {
    const admin = await loginStaff('admin@demo.tn');
    const create = await request(app())
      .post('/categories')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: { ar: 'حلويات', fr: 'Desserts', en: 'Desserts' }, sortOrder: 99 });
    expect(create.status).toBe(201);
    const id = create.body.data.id as string;

    const patch = await request(app())
      .patch(`/categories/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: { ar: 'حلويات', fr: 'Sucreries', en: 'Sweets' } });
    expect(patch.status).toBe(200);
    expect(patch.body.data.name.en).toBe('Sweets');

    const waiter = await loginStaff('waiter@demo.tn');
    const blocked = await request(app())
      .post('/categories')
      .set('Authorization', `Bearer ${waiter.accessToken}`)
      .send({ name: { ar: 'x', fr: 'x', en: 'x' } });
    expect(blocked.status).toBe(403);
  });

  it('kitchen role can toggle dish availability (PATCH /dishes/:id/availability)', async () => {
    const ids = await loadSeededIds();
    const kitchen = await loginStaff('kitchen@demo.tn');
    const res = await request(app())
      .patch(`/dishes/${ids.dishIds.water}/availability`)
      .set('Authorization', `Bearer ${kitchen.accessToken}`)
      .send({ available: false });
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
  });
});
