import type { Order, TableWithDerived, WaiterCall } from '@orvexa/shared';

/**
 * Visual state language from the design handoff. Eight buckets the waiter UI
 * uses to color rings, ages, and CTAs. NOT a backend enum — derived from
 * `derivedStatus` + active orders + open WaiterCalls.
 */
export type WaiterVisualState =
  | 'open'
  | 'seated'
  | 'ordered'
  | 'cooking'
  | 'ready'
  | 'eating'
  | 'paying'
  | 'clean'
  | 'call';

export type CallContext = {
  /** Most-recent open call against the table (if any). */
  call: WaiterCall | null;
};

const ACTIVE_STATUSES = new Set(['received', 'preparing', 'ready']);

/**
 * Derive the visual state from real backend data.
 *
 * Precedence (highest first):
 *   1. open WaiterCall            → 'call'
 *   2. derivedStatus = needs_bill → 'paying'
 *   3. an active order at 'ready' → 'ready'
 *   4. an active order at 'preparing' → 'cooking'
 *   5. an active order at 'received'  → 'ordered'
 *   6. derivedStatus = call_waiter → 'call' (fallback if WaiterCall row missing)
 *   7. derivedStatus = waiting       → 'ordered'
 *   8. derivedStatus = ordering | seated → 'seated'
 *   9. derivedStatus = free          → 'open'
 *
 * 'clean' is not in our schema today (transient state between paid and free).
 * If/when that gets added, slot it between paying → open.
 */
export function visualStateOf(
  table: TableWithDerived,
  ordersForTable: Order[],
  callForTable: WaiterCall | null,
): WaiterVisualState {
  if (table.derivedStatus === 'needs_cleaning') return 'clean';
  if (callForTable) return 'call';
  if (table.derivedStatus === 'needs_bill') return 'paying';
  const active = ordersForTable.filter((o) => ACTIVE_STATUSES.has(o.status));
  if (active.some((o) => o.status === 'ready')) return 'ready';
  if (active.some((o) => o.status === 'preparing')) return 'cooking';
  if (active.some((o) => o.status === 'received')) return 'ordered';
  // Food was served and not yet paid → the guests are currently dining.
  if (ordersForTable.some((o) => o.status === 'served' && o.paymentStatus !== 'paid')) {
    return 'eating';
  }
  if (table.derivedStatus === 'call_waiter') return 'call';
  if (table.derivedStatus === 'waiting') return 'ordered';
  if (table.derivedStatus === 'ordering' || table.derivedStatus === 'seated') return 'seated';
  return 'open';
}

/**
 * Auto-layout normalized x,y for a table given its index in the list and
 * total count. We don't have zone/floor-plan metadata yet (see TASKS Phase 18.x);
 * this lays them out in a 5-wide grid filling the artboard 0–1.
 */
export function autoPosition(
  index: number,
  total: number,
  cols = 5,
): { x: number; y: number } {
  const rows = Math.max(1, Math.ceil(total / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  // padding inside the artboard so dots don't kiss the edges
  const padX = 0.10;
  const padY = 0.10;
  const innerW = 1 - padX * 2;
  const innerH = 1 - padY * 2;
  const x = cols === 1 ? 0.5 : padX + (col / (cols - 1)) * innerW;
  const y = rows === 1 ? 0.5 : padY + (row / (rows - 1)) * innerH;
  return { x, y };
}

/** Seconds since a call was opened. */
export function callAgeSeconds(call: WaiterCall, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(call.createdAt).getTime()) / 1000));
}

export function fmtAgeShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export type CallUrgency = 'fresh' | 'stale' | 'overdue';
export function callUrgency(seconds: number): CallUrgency {
  if (seconds > 120) return 'overdue';
  if (seconds > 60) return 'stale';
  return 'fresh';
}

/** Find the most recent active order on a table (highest createdAt). */
export function pickActiveOrder(orders: Order[], tableId: string): Order | null {
  const list = orders
    .filter((o) => o.tableId === tableId && ACTIVE_STATUSES.has(o.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list[0] ?? null;
}

/**
 * All orders for a table that still affect the waiter's view of it — active
 * rounds plus served-but-unpaid rounds (the table is eating). Cancelled and
 * fully-paid rounds are excluded.
 */
export function pickActiveOrders(orders: Order[], tableId: string): Order[] {
  return orders.filter((o) => {
    if (o.tableId !== tableId) return false;
    if (o.status === 'cancelled') return false;
    if (ACTIVE_STATUSES.has(o.status)) return true;
    return o.status === 'served' && o.paymentStatus !== 'paid';
  });
}

/**
 * When a table has multiple rounds in different lifecycle stages (e.g., round 1
 * served and being eaten while round 2 is still 'preparing'), return the
 * secondary visual bucket so the floor dot can show a split color.
 * Returns null when there's no meaningful second state to surface.
 */
export function secondaryVisualState(
  primary: WaiterVisualState,
  ordersForTable: Order[],
): WaiterVisualState | null {
  const present = new Set<WaiterVisualState>();
  for (const o of ordersForTable) {
    if (o.status === 'ready') present.add('ready');
    else if (o.status === 'preparing') present.add('cooking');
    else if (o.status === 'received') present.add('ordered');
    else if (o.status === 'served' && o.paymentStatus !== 'paid') present.add('eating');
  }
  present.delete(primary);
  for (const s of ['ready', 'cooking', 'ordered', 'eating'] as const) {
    if (present.has(s)) return s;
  }
  return null;
}

/**
 * All orders for a table that still need waiter attention — anything that is
 * either in an active lifecycle state, or has been served but is not yet paid.
 * Cancelled orders are excluded. Sorted oldest-first so the UI renders rounds
 * in chronological order.
 */
export function pickOrdersForTable(orders: Order[], tableId: string): Order[] {
  return orders
    .filter((o) => {
      if (o.tableId !== tableId) return false;
      if (o.status === 'cancelled') return false;
      if (ACTIVE_STATUSES.has(o.status)) return true;
      // served stays in the list until paid
      return o.status === 'served' && o.paymentStatus !== 'paid';
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Choose the order that should drive the footer CTA: most actionable first. */
export function pickPrimaryOrder(orders: Order[]): Order | null {
  if (orders.length === 0) return null;
  const byStatus = (s: string) => orders.filter((o) => o.status === s);
  return (
    byStatus('ready')[0] ??
    byStatus('received')[0] ??
    byStatus('preparing')[0] ??
    byStatus('served')[0] ??
    orders[0] ??
    null
  );
}

/** Index calls by tableId for fast lookup; ties broken by oldest-first. */
export function indexCallsByTable(calls: WaiterCall[]): Map<string, WaiterCall> {
  const map = new Map<string, WaiterCall>();
  // sort ascending so the OLDEST call wins when multiple are open against the same table
  const sorted = [...calls].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const c of sorted) if (!map.has(c.tableId)) map.set(c.tableId, c);
  return map;
}
