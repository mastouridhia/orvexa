export function formatMillimes(m: number, currency = 'TND'): string {
  const sign = m < 0 ? '-' : '';
  const abs = Math.abs(m);
  const whole = Math.floor(abs / 1000);
  const frac = (abs % 1000).toString().padStart(3, '0');
  return `${sign}${whole}.${frac} ${currency}`;
}

export function parseMillimes(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000);
}
