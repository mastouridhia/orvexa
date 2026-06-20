import { describe, it, expect } from 'vitest';
import { tunisYesterdayWindow } from './daily-report.js';

// Africa/Tunis is UTC+1 year-round, so a Tunis calendar day [00:00, 24:00) maps
// to UTC [previous-day 23:00, same-day 23:00).
describe('tunisYesterdayWindow', () => {
  it('reports the previous Tunis day for a mid-morning run', () => {
    // 2026-06-19 07:00 Africa/Tunis === 2026-06-19 06:00 UTC
    const { from, to, label } = tunisYesterdayWindow(new Date('2026-06-19T06:00:00Z'));
    expect(from.toISOString()).toBe('2026-06-17T23:00:00.000Z'); // 2026-06-18 00:00 Tunis
    expect(to.toISOString()).toBe('2026-06-18T23:00:00.000Z'); // 2026-06-19 00:00 Tunis
    expect(label).toContain('18 juin 2026');
  });

  it('treats the moments just after Tunis midnight as the new day', () => {
    // 2026-06-19 00:30 Africa/Tunis === 2026-06-18 23:30 UTC — Tunis date is the 19th
    const { from, to } = tunisYesterdayWindow(new Date('2026-06-18T23:30:00Z'));
    expect(from.toISOString()).toBe('2026-06-17T23:00:00.000Z');
    expect(to.toISOString()).toBe('2026-06-18T23:00:00.000Z');
  });

  it('rolls the window forward across a UTC→Tunis date boundary', () => {
    // 2026-06-19 23:30 UTC === 2026-06-20 00:30 Africa/Tunis — yesterday is the 19th
    const { from, to, label } = tunisYesterdayWindow(new Date('2026-06-19T23:30:00Z'));
    expect(from.toISOString()).toBe('2026-06-18T23:00:00.000Z'); // 2026-06-19 00:00 Tunis
    expect(to.toISOString()).toBe('2026-06-19T23:00:00.000Z'); // 2026-06-20 00:00 Tunis
    expect(label).toContain('19 juin 2026');
  });

  it('produces a 24-hour window', () => {
    const { from, to } = tunisYesterdayWindow(new Date('2026-06-19T06:00:00Z'));
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
