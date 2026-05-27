import { describe, it, expect } from 'vitest';
import type { Order, TableWithDerived, WaiterCall } from '@orvexa/shared';
import {
  visualStateOf,
  fmtAgeShort,
  callUrgency,
  pickActiveOrder,
  pickActiveOrders,
  pickPrimaryOrder,
  pickOrdersForTable,
  indexCallsByTable,
  secondaryVisualState,
  autoPosition,
  callAgeSeconds,
} from './waiter.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTable(
  derivedStatus: TableWithDerived['derivedStatus'],
  overrides: Partial<TableWithDerived> = {},
): TableWithDerived {
  return {
    id: 't1',
    restaurantId: 'r1',
    label: 'T1',
    publicSlug: 't1',
    seats: 4,
    status: 'free',
    mergedIntoTableId: null,
    zoneId: null,
    x: 0.5,
    y: 0.5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    derivedStatus,
    mergedTableIds: [],
    ...overrides,
  };
}

function makeOrder(
  tableId: string,
  status: Order['status'],
  overrides: Partial<Order> = {},
): Order {
  return {
    id: `order-${Math.random()}`,
    restaurantId: 'r1',
    tableId,
    tableDayTokenId: null,
    sessionId: null,
    status,
    round: 1,
    items: [],
    subtotalMillimes: 5000,
    taxMillimes: 0,
    serviceMillimes: 0,
    totalMillimes: 5000,
    etaMinutes: null,
    paymentStatus: 'pending',
    paymentMethod: null,
    assignedWaiterId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCall(tableId: string, createdAt?: string): WaiterCall {
  return {
    id: `call-${Math.random()}`,
    restaurantId: 'r1',
    tableId,
    kind: 'call_waiter',
    note: null,
    clearedAt: null,
    clearedByUserId: null,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

// ── visualStateOf ─────────────────────────────────────────────────────────────

describe('visualStateOf', () => {
  it('needs_cleaning → clean (highest precedence before call check)', () => {
    const table = makeTable('needs_cleaning');
    expect(visualStateOf(table, [], makeCall('t1'))).toBe('clean');
  });

  it('open WaiterCall → call', () => {
    const table = makeTable('seated');
    expect(visualStateOf(table, [], makeCall('t1'))).toBe('call');
  });

  it('needs_bill → paying', () => {
    const table = makeTable('needs_bill');
    expect(visualStateOf(table, [], null)).toBe('paying');
  });

  it('active order at ready → ready', () => {
    const table = makeTable('waiting');
    const orders = [makeOrder('t1', 'ready')];
    expect(visualStateOf(table, orders, null)).toBe('ready');
  });

  it('active order at preparing → cooking', () => {
    const table = makeTable('waiting');
    const orders = [makeOrder('t1', 'preparing')];
    expect(visualStateOf(table, orders, null)).toBe('cooking');
  });

  it('active order at received → ordered', () => {
    const table = makeTable('waiting');
    const orders = [makeOrder('t1', 'received')];
    expect(visualStateOf(table, orders, null)).toBe('ordered');
  });

  it('served unpaid → eating', () => {
    const table = makeTable('free');
    const orders = [makeOrder('t1', 'served', { paymentStatus: 'pending' })];
    expect(visualStateOf(table, orders, null)).toBe('eating');
  });

  it('derivedStatus call_waiter (no WaiterCall row) → call', () => {
    const table = makeTable('call_waiter');
    expect(visualStateOf(table, [], null)).toBe('call');
  });

  it('derivedStatus waiting → ordered', () => {
    const table = makeTable('waiting');
    expect(visualStateOf(table, [], null)).toBe('ordered');
  });

  it('derivedStatus seated → seated', () => {
    const table = makeTable('seated');
    expect(visualStateOf(table, [], null)).toBe('seated');
  });

  it('derivedStatus free → open', () => {
    const table = makeTable('free');
    expect(visualStateOf(table, [], null)).toBe('open');
  });

  it('ready beats preparing when both active', () => {
    const table = makeTable('waiting');
    const orders = [makeOrder('t1', 'preparing'), makeOrder('t1', 'ready')];
    expect(visualStateOf(table, orders, null)).toBe('ready');
  });
});

// ── fmtAgeShort ───────────────────────────────────────────────────────────────

describe('fmtAgeShort', () => {
  it('0s → 0s', () => expect(fmtAgeShort(0)).toBe('0s'));
  it('59s → 59s', () => expect(fmtAgeShort(59)).toBe('59s'));
  it('60s → 1m 00s', () => expect(fmtAgeShort(60)).toBe('1m 00s'));
  it('65s → 1m 05s', () => expect(fmtAgeShort(65)).toBe('1m 05s'));
  it('125s → 2m 05s', () => expect(fmtAgeShort(125)).toBe('2m 05s'));
});

// ── callUrgency ───────────────────────────────────────────────────────────────

describe('callUrgency', () => {
  it('0s → fresh', () => expect(callUrgency(0)).toBe('fresh'));
  it('60s → fresh', () => expect(callUrgency(60)).toBe('fresh'));
  it('61s → stale', () => expect(callUrgency(61)).toBe('stale'));
  it('120s → stale', () => expect(callUrgency(120)).toBe('stale'));
  it('121s → overdue', () => expect(callUrgency(121)).toBe('overdue'));
  it('9999s → overdue', () => expect(callUrgency(9999)).toBe('overdue'));
});

// ── callAgeSeconds ────────────────────────────────────────────────────────────

describe('callAgeSeconds', () => {
  it('returns elapsed seconds', () => {
    const now = Date.now();
    const call = makeCall('t1', new Date(now - 90_000).toISOString());
    expect(callAgeSeconds(call, now)).toBe(90);
  });

  it('clamps to 0 for future timestamps', () => {
    const now = Date.now();
    const call = makeCall('t1', new Date(now + 5000).toISOString());
    expect(callAgeSeconds(call, now)).toBe(0);
  });
});

// ── pickActiveOrder ───────────────────────────────────────────────────────────

describe('pickActiveOrder', () => {
  it('returns null when no active orders for table', () => {
    const orders = [makeOrder('t2', 'received')];
    expect(pickActiveOrder(orders, 't1')).toBeNull();
  });

  it('returns most recent active order', () => {
    const older = makeOrder('t1', 'received', { createdAt: '2026-01-01T10:00:00Z' });
    const newer = makeOrder('t1', 'preparing', { createdAt: '2026-01-01T11:00:00Z' });
    expect(pickActiveOrder([older, newer], 't1')).toEqual(newer);
  });

  it('excludes served and cancelled', () => {
    const served = makeOrder('t1', 'served');
    const cancelled = makeOrder('t1', 'cancelled');
    expect(pickActiveOrder([served, cancelled], 't1')).toBeNull();
  });
});

// ── pickActiveOrders ──────────────────────────────────────────────────────────

describe('pickActiveOrders', () => {
  it('includes received, preparing, ready', () => {
    const orders = [
      makeOrder('t1', 'received'),
      makeOrder('t1', 'preparing'),
      makeOrder('t1', 'ready'),
    ];
    expect(pickActiveOrders(orders, 't1')).toHaveLength(3);
  });

  it('includes served-unpaid', () => {
    const order = makeOrder('t1', 'served', { paymentStatus: 'pending' });
    expect(pickActiveOrders([order], 't1')).toHaveLength(1);
  });

  it('excludes served-paid', () => {
    const order = makeOrder('t1', 'served', { paymentStatus: 'paid' });
    expect(pickActiveOrders([order], 't1')).toHaveLength(0);
  });

  it('excludes cancelled', () => {
    const order = makeOrder('t1', 'cancelled');
    expect(pickActiveOrders([order], 't1')).toHaveLength(0);
  });

  it('excludes other tables', () => {
    const order = makeOrder('t2', 'received');
    expect(pickActiveOrders([order], 't1')).toHaveLength(0);
  });
});

// ── pickPrimaryOrder ──────────────────────────────────────────────────────────

describe('pickPrimaryOrder', () => {
  it('returns null for empty list', () => {
    expect(pickPrimaryOrder([])).toBeNull();
  });

  it('prefers ready over everything', () => {
    const orders = [
      makeOrder('t1', 'preparing'),
      makeOrder('t1', 'ready'),
      makeOrder('t1', 'received'),
    ];
    expect(pickPrimaryOrder(orders)!.status).toBe('ready');
  });

  it('prefers received over preparing', () => {
    const orders = [makeOrder('t1', 'preparing'), makeOrder('t1', 'received')];
    expect(pickPrimaryOrder(orders)!.status).toBe('received');
  });

  it('falls back to served when only served', () => {
    const orders = [makeOrder('t1', 'served')];
    expect(pickPrimaryOrder(orders)!.status).toBe('served');
  });
});

// ── pickOrdersForTable ────────────────────────────────────────────────────────

describe('pickOrdersForTable', () => {
  it('returns sorted oldest-first', () => {
    const newer = makeOrder('t1', 'received', { createdAt: '2026-01-01T12:00:00Z' });
    const older = makeOrder('t1', 'received', { createdAt: '2026-01-01T10:00:00Z' });
    const result = pickOrdersForTable([newer, older], 't1');
    expect(result[0]).toEqual(older);
    expect(result[1]).toEqual(newer);
  });

  it('excludes cancelled and paid', () => {
    const cancelled = makeOrder('t1', 'cancelled');
    const paid = makeOrder('t1', 'served', { paymentStatus: 'paid' });
    expect(pickOrdersForTable([cancelled, paid], 't1')).toHaveLength(0);
  });
});

// ── indexCallsByTable ─────────────────────────────────────────────────────────

describe('indexCallsByTable', () => {
  it('returns empty map for no calls', () => {
    expect(indexCallsByTable([])).toEqual(new Map());
  });

  it('indexes by tableId', () => {
    const call = makeCall('t1');
    const map = indexCallsByTable([call]);
    expect(map.get('t1')).toEqual(call);
  });

  it('oldest call wins on tie', () => {
    const older = makeCall('t1', '2026-01-01T10:00:00Z');
    const newer = makeCall('t1', '2026-01-01T11:00:00Z');
    const map = indexCallsByTable([newer, older]);
    expect(map.get('t1')).toEqual(older);
  });

  it('indexes multiple tables independently', () => {
    const c1 = makeCall('t1');
    const c2 = makeCall('t2');
    const map = indexCallsByTable([c1, c2]);
    expect(map.size).toBe(2);
    expect(map.get('t1')).toEqual(c1);
    expect(map.get('t2')).toEqual(c2);
  });
});

// ── secondaryVisualState ──────────────────────────────────────────────────────

describe('secondaryVisualState', () => {
  it('returns null when only one state present', () => {
    const orders = [makeOrder('t1', 'ready')];
    expect(secondaryVisualState('ready', orders)).toBeNull();
  });

  it('returns secondary state when two states present', () => {
    const orders = [makeOrder('t1', 'ready'), makeOrder('t1', 'preparing')];
    expect(secondaryVisualState('ready', orders)).toBe('cooking');
  });

  it('prefers ready > cooking > ordered > eating', () => {
    const orders = [
      makeOrder('t1', 'served', { paymentStatus: 'pending' }),
      makeOrder('t1', 'preparing'),
    ];
    expect(secondaryVisualState('eating', orders)).toBe('cooking');
  });
});

// ── autoPosition ─────────────────────────────────────────────────────────────

describe('autoPosition', () => {
  it('single table → single row centered vertically, first col horizontally', () => {
    const { x, y } = autoPosition(0, 1);
    expect(x).toBe(0.1); // col 0 of 5 → padX
    expect(y).toBe(0.5); // single row → centered
  });

  it('single table with cols=1 → fully centered', () => {
    const { x, y } = autoPosition(0, 1, 1);
    expect(x).toBe(0.5);
    expect(y).toBe(0.5);
  });

  it('positions stay within 0-1 range', () => {
    for (let i = 0; i < 20; i++) {
      const { x, y } = autoPosition(i, 20);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('first item in multi-table → top-left area', () => {
    const { x, y } = autoPosition(0, 10);
    expect(x).toBeLessThan(0.5);
    expect(y).toBeLessThan(0.5);
  });
});
