import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { restaurants } from '../db/schema/restaurants.js';
import { ReportsService } from '../services/reports.js';
import { sendDailyReportEmail } from '../services/email.js';
import { logger } from '../utils/logger.js';

const reports = new ReportsService();

// Africa/Tunis is UTC+1 year-round (no DST). Baking the offset into Date.UTC
// keeps the day boundaries aligned to Tunisian wall-clock time.
const TUNIS_OFFSET_HOURS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Plan ≥ this tier (Plus) may receive the daily report. */
const MIN_REPORT_PLAN = 2;

/**
 * UTC `[from, to)` instants spanning *yesterday* in Africa/Tunis, plus a FR
 * human label for that day. `now` is injectable for tests.
 */
export function tunisYesterdayWindow(now: Date = new Date()): {
  from: Date;
  to: Date;
  label: string;
} {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number) as [number, number, number];

  // Today 00:00 Africa/Tunis expressed in UTC (hour = -offset normalizes the date).
  const todayStartUtcMs = Date.UTC(year, month - 1, day, -TUNIS_OFFSET_HOURS, 0, 0);
  const to = new Date(todayStartUtcMs);
  const from = new Date(todayStartUtcMs - DAY_MS);
  const label = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(from);

  return { from, to, label };
}

/**
 * Send yesterday's summary to every active Plus+ restaurant that has the daily
 * report enabled and a recipient set. Per-restaurant failures are logged and do
 * not abort the run.
 */
export async function runDailyReports(now: Date = new Date()): Promise<void> {
  const { from, to, label } = tunisYesterdayWindow(now);

  let recipients: {
    id: string;
    name: string;
    reportEmail: string | null;
  }[];
  try {
    recipients = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        reportEmail: restaurants.reportEmail,
      })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.dailyReportEnabled, true),
          eq(restaurants.isActive, true),
          gte(restaurants.plan, MIN_REPORT_PLAN),
          isNotNull(restaurants.reportEmail),
        ),
      );
  } catch (err) {
    logger.error({ err }, 'daily-report: failed to list restaurants');
    return;
  }

  logger.info({ count: recipients.length, day: label }, 'daily-report running');

  for (const r of recipients) {
    if (!r.reportEmail) continue;
    try {
      const summary = await reports.dailySummary(r.id, from, to);
      await sendDailyReportEmail(r.reportEmail, {
        restaurantName: r.name,
        dateLabel: label,
        salesMillimes: summary.salesMillimes,
        ordersCount: summary.ordersCount,
        scans: summary.scans,
        topItems: summary.topItems.map((it) => ({
          name: it.name.fr || it.name.ar || it.name.en || '—',
          quantity: it.quantity,
        })),
      });
      logger.info({ restaurantId: r.id, to: r.reportEmail }, 'daily-report sent');
    } catch (err) {
      logger.error({ err, restaurantId: r.id }, 'daily-report failed for restaurant');
    }
  }
}
