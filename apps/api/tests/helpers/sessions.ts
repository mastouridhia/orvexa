import request from 'supertest';
import { app } from './http.js';
import { TableService } from '../../src/services/table.js';

const tableService = new TableService();

export async function loginStaff(
  email: string,
  password = 'orvexa',
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const res = await request(app()).post('/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
    userId: res.body.data.user.id as string,
  };
}

export async function openCustomerSession(
  restaurantId: string,
  tableId: string,
): Promise<{ token: string; sessionId: string; tableId: string }> {
  // Lazy-create today's table_day_token by hitting the QR helper.
  const qr = await tableService.qr(restaurantId, tableId, 'svg');
  const res = await request(app())
    .post('/sessions')
    .send({ qrToken: qr.token, locale: 'fr' });
  if (res.status !== 201) {
    throw new Error(`open session failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.token as string,
    sessionId: res.body.data.session.id as string,
    tableId: res.body.data.session.tableId as string,
  };
}
