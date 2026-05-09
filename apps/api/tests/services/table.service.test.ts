import { describe, it, expect, beforeEach } from 'vitest';
import { resetTransactionalState, loadSeededIds } from '../helpers/db.js';
import { OrderService } from '../../src/services/order.js';
import { TableService, deriveStatus } from '../../src/services/table.js';
import type { WaiterCallRow } from '../../src/repositories/waiter-call.js';
import type { OrderRow } from '../../src/repositories/order.js';

const tableService = new TableService();
const orderService = new OrderService();

const callStub = (kind: 'call_waiter' | 'request_bill'): WaiterCallRow =>
  ({ kind, tableId: 'x' }) as unknown as WaiterCallRow;
const orderStub = (status: string): OrderRow =>
  ({ tableId: 'x', status }) as unknown as OrderRow;

describe('TableService.deriveStatus (pure)', () => {
  it('request_bill wins over call_waiter and active orders', () => {
    const status = deriveStatus(
      'free',
      [callStub('call_waiter'), callStub('request_bill')],
      [orderStub('received')],
    );
    expect(status).toBe('needs_bill');
  });

  it('call_waiter beats active-orders waiting', () => {
    const status = deriveStatus('free', [callStub('call_waiter')], [orderStub('received')]);
    expect(status).toBe('call_waiter');
  });

  it('active orders alone surface as waiting', () => {
    const status = deriveStatus('free', [], [orderStub('preparing')]);
    expect(status).toBe('waiting');
  });

  it('empty signals fall back to stored status', () => {
    expect(deriveStatus('seated', [], [])).toBe('seated');
    expect(deriveStatus('free', [], [])).toBe('free');
  });
});

describe('TableService — DB-backed', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('list returns each table with derivedStatus reflecting open calls', async () => {
    const ids = await loadSeededIds();
    const tableId = ids.tableIds[0]!;

    await tableService.callWaiter(ids.restaurantId, tableId);
    const list = await tableService.list(ids.restaurantId);
    const target = list.find((t) => t.id === tableId);
    expect(target?.derivedStatus).toBe('call_waiter');

    await tableService.requestBill(ids.restaurantId, tableId);
    const list2 = await tableService.list(ids.restaurantId);
    const target2 = list2.find((t) => t.id === tableId);
    expect(target2?.derivedStatus).toBe('needs_bill');
  });

  it('deriveForTable returns waiting when an active order exists, free when nothing else', async () => {
    const ids = await loadSeededIds();
    const tableId = ids.tableIds[1]!;

    expect(await tableService.deriveForTable(ids.restaurantId, tableId)).toBe('free');

    await orderService.place({
      restaurantId: ids.restaurantId,
      tableId,
      tableDayTokenId: null,
      sessionId: null,
      body: { items: [{ dishId: ids.dishIds.brik, variantIds: [], quantity: 1 }] },
    });
    expect(await tableService.deriveForTable(ids.restaurantId, tableId)).toBe('waiting');
  });

  it('deriveForTable returns null for cross-restaurant access', async () => {
    const ids = await loadSeededIds();
    const result = await tableService.deriveForTable(
      '11111111-1111-1111-1111-111111111111',
      ids.tableIds[0]!,
    );
    expect(result).toBeNull();
  });

  it('qr issues a token and re-uses it on the same day', async () => {
    const ids = await loadSeededIds();
    const tableId = ids.tableIds[2]!;
    const a = await tableService.qr(ids.restaurantId, tableId, 'svg');
    const b = await tableService.qr(ids.restaurantId, tableId, 'svg');
    expect(a.token).toBe(b.token);
    expect(typeof a.body).toBe('string'); // svg
    expect(a.contentType).toBe('image/svg+xml');
  });

  it('qr png path returns a Buffer with image/png', async () => {
    const ids = await loadSeededIds();
    const tableId = ids.tableIds[3]!;
    const r = await tableService.qr(ids.restaurantId, tableId, 'png');
    expect(Buffer.isBuffer(r.body)).toBe(true);
    expect(r.contentType).toBe('image/png');
    expect(r.url).toContain(`/t/${r.token}`);
  });
});
