import { describe, it, expect } from 'vitest';
import {
  ageBucketFromSeconds,
  ageBucket,
  formatMMSS,
  elapsedMs,
  nextStatus,
  shortTicketId,
} from './kds.js';

describe('ageBucketFromSeconds', () => {
  it('clamps negative to fresh', () => {
    expect(ageBucketFromSeconds(-10)).toBe('fresh');
  });
  it('0s → fresh', () => expect(ageBucketFromSeconds(0)).toBe('fresh'));
  it('119s → fresh', () => expect(ageBucketFromSeconds(119)).toBe('fresh'));
  it('120s → normal', () => expect(ageBucketFromSeconds(120)).toBe('normal'));
  it('359s → normal', () => expect(ageBucketFromSeconds(359)).toBe('normal'));
  it('360s → pushing', () => expect(ageBucketFromSeconds(360)).toBe('pushing'));
  it('599s → pushing', () => expect(ageBucketFromSeconds(599)).toBe('pushing'));
  it('600s → late', () => expect(ageBucketFromSeconds(600)).toBe('late'));
  it('9999s → late', () => expect(ageBucketFromSeconds(9999)).toBe('late'));
});

describe('ageBucket', () => {
  it('derives bucket from ISO string and nowMs', () => {
    const now = Date.now();
    const createdAt = new Date(now - 700_000).toISOString(); // 700s ago → late
    expect(ageBucket(createdAt, now)).toBe('late');
  });

  it('returns fresh when order just placed', () => {
    const now = Date.now();
    const createdAt = new Date(now - 5_000).toISOString(); // 5s ago
    expect(ageBucket(createdAt, now)).toBe('fresh');
  });

  it('clamps future timestamps to fresh', () => {
    const now = Date.now();
    const createdAt = new Date(now + 30_000).toISOString();
    expect(ageBucket(createdAt, now)).toBe('fresh');
  });
});

describe('formatMMSS', () => {
  it('0ms → 00:00', () => expect(formatMMSS(0)).toBe('00:00'));
  it('negative → 00:00', () => expect(formatMMSS(-500)).toBe('00:00'));
  it('59 999ms → 00:59', () => expect(formatMMSS(59_999)).toBe('00:59'));
  it('60 000ms → 01:00', () => expect(formatMMSS(60_000)).toBe('01:00'));
  it('90 500ms → 01:30', () => expect(formatMMSS(90_500)).toBe('01:30'));
  it('3 661 000ms → 61:01', () => expect(formatMMSS(3_661_000)).toBe('61:01'));
  it('pads single-digit seconds', () => expect(formatMMSS(65_000)).toBe('01:05'));
});

describe('elapsedMs', () => {
  it('returns positive difference', () => {
    const now = Date.now();
    const createdAt = new Date(now - 5000).toISOString();
    expect(elapsedMs(createdAt, now)).toBeGreaterThanOrEqual(5000);
  });

  it('clamps to 0 for future timestamps', () => {
    const now = Date.now();
    const createdAt = new Date(now + 1000).toISOString();
    expect(elapsedMs(createdAt, now)).toBe(0);
  });
});

describe('nextStatus', () => {
  it('received → preparing', () => expect(nextStatus('received')).toBe('preparing'));
  it('preparing → ready', () => expect(nextStatus('preparing')).toBe('ready'));
  it('ready → served', () => expect(nextStatus('ready')).toBe('served'));
  it('served → null', () => expect(nextStatus('served')).toBeNull());
  it('cancelled → null', () => expect(nextStatus('cancelled')).toBeNull());
});

describe('shortTicketId', () => {
  it('strips dashes and takes last 6 chars uppercased', () => {
    expect(shortTicketId('550e8400-e29b-41d4-a716-446655440000')).toBe('440000');
  });

  it('uppercases hex chars', () => {
    expect(shortTicketId('00000000-0000-0000-0000-0000abcdef12')).toBe('CDEF12');
  });

  it('handles UUID without dashes', () => {
    expect(shortTicketId('aabbccdd112233')).toBe('112233');
  });
});
