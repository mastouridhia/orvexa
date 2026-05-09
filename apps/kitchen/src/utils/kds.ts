import type { OrderStatus } from '@orvexa/shared';

export type AgeBucket = 'fresh' | 'normal' | 'pushing' | 'late';

const FRESH_MAX_S = 120;
const NORMAL_MAX_S = 360;
const PUSHING_MAX_S = 600;

export function ageBucketFromSeconds(elapsedSeconds: number): AgeBucket {
  const s = Math.max(0, elapsedSeconds);
  if (s < FRESH_MAX_S) return 'fresh';
  if (s < NORMAL_MAX_S) return 'normal';
  if (s < PUSHING_MAX_S) return 'pushing';
  return 'late';
}

export function ageBucket(createdAtIso: string, nowMs: number): AgeBucket {
  const elapsed = Math.max(0, (nowMs - new Date(createdAtIso).getTime()) / 1000);
  return ageBucketFromSeconds(elapsed);
}

export function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function elapsedMs(createdAtIso: string, nowMs: number): number {
  return Math.max(0, nowMs - new Date(createdAtIso).getTime());
}

/**
 * Maps the design's age buckets to translation keys + visual tokens.
 * Used by the ticket header chip + filter pills.
 */
export const AGE_LABELS: Record<AgeBucket, { key: string; bg: string; ink: string }> = {
  fresh: { key: 'age.fresh', bg: 'var(--age-fresh-bg)', ink: 'var(--age-fresh-ink)' },
  normal: { key: 'age.cooking', bg: 'var(--age-normal-bg)', ink: 'var(--age-normal-ink)' },
  pushing: { key: 'age.pushing', bg: 'var(--age-pushing-bg)', ink: 'var(--age-pushing-ink)' },
  late: { key: 'age.late', bg: 'var(--age-late-bg)', ink: 'var(--age-late-ink)' },
};

/** What a "Hold to bump" press should advance the order to next. */
export function nextStatus(current: OrderStatus): 'preparing' | 'ready' | 'served' | null {
  if (current === 'received') return 'preparing';
  if (current === 'preparing') return 'ready';
  if (current === 'ready') return 'served';
  return null;
}

/** Short ticket id (last 6 chars of UUID, uppercased — readable across the line). */
export function shortTicketId(orderId: string): string {
  return orderId.replace(/-/g, '').slice(-6).toUpperCase();
}
