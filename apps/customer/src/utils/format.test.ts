import { describe, it, expect } from 'vitest';
import { pickLang, formatMillimes } from './format.js';

describe('pickLang', () => {
  it('returns the requested language when present', () => {
    expect(pickLang({ ar: 'A', fr: 'F', en: 'E' }, 'en')).toBe('E');
    expect(pickLang({ ar: 'A', fr: 'F', en: 'E' }, 'ar')).toBe('A');
  });

  it('falls back fr → en → ar when the chosen value is empty', () => {
    expect(pickLang({ ar: 'A', fr: 'F', en: '' }, 'en')).toBe('F');
    expect(pickLang({ ar: 'A', fr: '', en: '' }, 'en')).toBe('A');
  });

  it('returns empty string for undefined input', () => {
    expect(pickLang(undefined, 'fr')).toBe('');
  });
});

describe('formatMillimes', () => {
  it('formats integers as decimal TND with 3 fractional digits', () => {
    expect(formatMillimes(4500)).toBe('4.500 TND');
    expect(formatMillimes(0)).toBe('0.000 TND');
    expect(formatMillimes(1)).toBe('0.001 TND');
  });

  it('handles negative amounts with a minus prefix', () => {
    expect(formatMillimes(-1500)).toBe('-1.500 TND');
  });

  it('honors a custom currency code', () => {
    expect(formatMillimes(1000, 'EUR')).toBe('1.000 EUR');
  });
});
