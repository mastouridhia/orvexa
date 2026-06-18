import { WEEKDAYS, type OpeningHours } from '@orvexa/shared';

/**
 * Live service status for the menu subtitle, derived from the owner's
 * per-weekday opening hours (admin Settings → `openingHours`).
 *
 * Returns `null` when today's hours are unspecified (key absent) — the caller
 * hides the line rather than inventing a time. Tunisia-only, so client-local
 * time is used directly.
 */
export type ServiceStatus =
  | { kind: 'openUntil'; time: string }
  | { kind: 'opensAt'; time: string }
  | { kind: 'closedToday' };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function serviceStatus(
  openingHours: OpeningHours | null | undefined,
  now: Date = new Date(),
): ServiceStatus | null {
  if (!openingHours) return null;

  // JS getDay(): 0 = Sun … 6 = Sat. WEEKDAYS is mon … sun.
  const today = WEEKDAYS[(now.getDay() + 6) % 7];
  const dh = openingHours[today];

  if (dh === undefined) return null; // unspecified → hide the line
  if (dh === null) return { kind: 'closedToday' }; // explicitly closed today

  const cur = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(dh.open);
  const close = toMinutes(dh.close);

  // Overnight range (e.g. 18:00–02:00): open if after opening OR before close.
  if (close <= open) {
    if (cur >= open || cur < close) return { kind: 'openUntil', time: dh.close };
    return { kind: 'opensAt', time: dh.open };
  }

  if (cur < open) return { kind: 'opensAt', time: dh.open };
  if (cur < close) return { kind: 'openUntil', time: dh.close };
  return { kind: 'closedToday' }; // after closing time
}
