import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, SalesReportRow } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatMillimes } from '../utils/format.js';
import { IconArrowDown, IconArrowUp } from './tf-icons.js';

const BUCKET_MIN = 15;
const FALLBACK_BUCKETS = 56;

// Pre-baked skeleton bar heights so the loading shimmer doesn't call Math.random()
// during render (which would re-roll on every re-render and trip react-hooks/purity).
// Sine wave + small offset keeps the silhouette interesting without looking uniform.
const SKELETON_BAR_HEIGHTS: number[] = Array.from({ length: FALLBACK_BUCKETS }, (_, i) => {
  const wave = Math.sin((i / FALLBACK_BUCKETS) * Math.PI * 3);
  return Math.round(35 + wave * 25 + (i % 5) * 3);
});

type Slot = {
  bucketStart: Date;
  orderCount: number;
  totalMillimes: number;
  isFromData: boolean;
};

/**
 * Service pulse card — intra-day 15-minute bar chart of orders received,
 * with peak callout and 4 KPIs (Orders / Avg ticket / Revenue / Avg dwell)
 * each comparing today vs the same time-window yesterday.
 *
 * Avg dwell = MAX(payment.paid_at) − order.created_at, averaged over today's
 * paid orders. Comes from DashboardSummary.avgDwellMinutesToday.
 */
export function ServicePulse({
  refreshKey,
  lang,
  now,
  avgDwellMinutesToday,
}: {
  refreshKey: number;
  lang: LanguageCode;
  now: number;
  avgDwellMinutesToday: number | null;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [today, setToday] = useState<SalesReportRow[] | null>(null);
  const [yesterday, setYesterday] = useState<SalesReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-anchor the windows once per minute (so a slow tab doesn't fire dozens of fetches)
  // and on every socket bump from the parent.
  const minuteBucket = Math.floor(now / 60_000);

  // Anchor windows for both queries. Yesterday's window stops at the SAME wall-clock
  // point as today's "now" so the two day's totals are comparing equal-length slices.
  const windows = useMemo(() => {
    const todayStart = startOfDay(new Date(now));
    const todayEnd = new Date(Math.min(now, todayStart.getTime() + 24 * 3600_000));
    const yEnd = new Date(todayEnd.getTime() - 24 * 3600_000);
    const yStart = new Date(todayStart.getTime() - 24 * 3600_000);
    return { todayStart, todayEnd, yStart, yEnd };
    // `now` itself is intentionally NOT a dep — minuteBucket already gates re-anchoring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteBucket, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t1, t2] = await Promise.all([
          authedFetch((tk) =>
            api.getSales(tk, {
              granularity: '15min',
              from: windows.todayStart.toISOString(),
              to: windows.todayEnd.toISOString(),
            }),
          ),
          authedFetch((tk) =>
            api.getSales(tk, {
              granularity: '15min',
              from: windows.yStart.toISOString(),
              to: windows.yEnd.toISOString(),
            }),
          ),
        ]);
        if (!cancelled) {
          setToday(t1);
          setYesterday(t2);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, windows]);

  // Build a slot array — one entry per 15-min bucket from todayStart → now,
  // backfilled with zeros for buckets that had no orders. This keeps the
  // chart's x-axis stable instead of jumping bar widths around.
  const todaySlots = useMemo<Slot[]>(
    () => buildSlots(today ?? [], windows.todayStart, windows.todayEnd),
    [today, windows.todayStart, windows.todayEnd],
  );
  const yesterdaySlots = useMemo<Slot[]>(
    () => buildSlots(yesterday ?? [], windows.yStart, windows.yEnd),
    [yesterday, windows.yStart, windows.yEnd],
  );

  const todayTotals = useMemo(() => sumSlots(todaySlots), [todaySlots]);
  const yesterdayTotals = useMemo(() => sumSlots(yesterdaySlots), [yesterdaySlots]);

  const peak = useMemo(() => findPeak(todaySlots), [todaySlots]);
  const max = Math.max(...todaySlots.map((s) => s.orderCount), 1);

  const avgTicketToday =
    todayTotals.orderCount > 0 ? Math.round(todayTotals.totalMillimes / todayTotals.orderCount) : 0;
  const avgTicketYesterday =
    yesterdayTotals.orderCount > 0
      ? Math.round(yesterdayTotals.totalMillimes / yesterdayTotals.orderCount)
      : 0;

  const nowFmt = new Date(now).toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (error) {
    return (
      <article className="tf-a-card tf-a-pulse">
        <div className="error-banner" style={{ margin: 0 }}>
          {error}
        </div>
      </article>
    );
  }

  // Loading skeleton (first render before fetch resolves)
  if (today === null || yesterday === null) {
    return <ServicePulseSkeleton />;
  }

  // Empty (no orders today + no orders yesterday in this window)
  const isEmpty = todayTotals.orderCount === 0 && yesterdayTotals.orderCount === 0;
  if (isEmpty) {
    return (
      <article className="tf-a-card tf-a-pulse">
        <div className="tf-caption">{t('pulse.caption')}</div>
        <div className="tf-a-pulse__title">{t('pulse.empty.title')}</div>
        <div className="tf-a-pulse__sub">{t('pulse.empty.sub')}</div>
      </article>
    );
  }

  return (
    <article className="tf-a-card tf-a-pulse">
      <header className="tf-a-pulse__head">
        <div>
          <div className="tf-caption">{t('pulse.caption')}</div>
          <div className="tf-a-pulse__title">
            {peak ? (
              <>
                {t('pulse.peakLead')}{' '}
                <span className="tf-display">
                  {t('pulse.peakAt', { time: fmtTime(peak.bucketStart, lang) })}
                </span>
              </>
            ) : (
              t('pulse.warmingUp')
            )}
          </div>
          {peak ? (
            <div className="tf-a-pulse__sub">{t('pulse.peakSub', { count: peak.orderCount })}</div>
          ) : null}
        </div>
      </header>

      <div className="tf-a-pulse__chart-wrap">
        <div className="tf-a-pulse__chart" aria-label={t('pulse.chartAria')}>
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <span
              key={p}
              className="tf-a-pulse__gridline"
              style={{ bottom: `${p * 100}%` }}
              aria-hidden="true"
            />
          ))}
          {todaySlots.map((slot, i) => {
            const ratio = slot.orderCount / max;
            const isNow = i === todaySlots.length - 1 && slot.isFromData === false;
            const isPeak =
              peak !== null && slot.bucketStart.getTime() === peak.bucketStart.getTime();
            const variant = isNow
              ? 'now'
              : isPeak
                ? 'peak'
                : slot.orderCount === 0
                  ? 'idle'
                  : 'normal';
            return (
              <span
                key={slot.bucketStart.getTime()}
                className={`tf-a-pulse__bar tf-a-pulse__bar--${variant}`}
                style={{
                  height: `${Math.max(2, ratio * 100)}%`,
                  animationDelay: `${i * 6}ms`,
                }}
                title={`${fmtTime(slot.bucketStart, lang)} · ${slot.orderCount}`}
              />
            );
          })}
          <span className="tf-a-pulse__now-line" aria-hidden="true" />
          <span className="tf-mono tf-a-pulse__now-tag">{t('pulse.nowTag', { time: nowFmt })}</span>
        </div>
      </div>

      <div className="tf-a-pulse__axis tf-mono">
        {axisTicks(windows.todayStart, windows.todayEnd, lang).map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <footer className="tf-a-pulse__kpis">
        <PulseKPI
          label={t('pulse.kpi.orders')}
          value={String(todayTotals.orderCount)}
          delta={absoluteDelta(todayTotals.orderCount, yesterdayTotals.orderCount)}
          deltaLabel={t('pulse.kpi.vsYesterday')}
        />
        <PulseKPI
          label={t('pulse.kpi.avgTicket')}
          value={formatMillimes(avgTicketToday)}
          delta={absoluteDelta(avgTicketToday, avgTicketYesterday)}
          deltaLabel={t('pulse.kpi.vsYesterday')}
        />
        <PulseKPI
          label={t('pulse.kpi.revenue')}
          value={formatMillimes(todayTotals.totalMillimes)}
          delta={absoluteDelta(todayTotals.totalMillimes, yesterdayTotals.totalMillimes)}
          deltaLabel={t('pulse.kpi.vsYesterday')}
        />
        <PulseKPI
          label={t('pulse.kpi.avgDwell')}
          value={avgDwellMinutesToday != null ? `${avgDwellMinutesToday}m` : '—'}
          delta={null}
          deltaLabel={avgDwellMinutesToday != null ? t('pulse.kpi.vsYesterday') : t('pulse.kpi.notTracked')}
        />
      </footer>
    </article>
  );
}

function PulseKPI({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  delta: number | null;
  deltaLabel: string;
}) {
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  return (
    <div className="tf-a-pulse__kpi">
      <div className="tf-caption">{label}</div>
      <div className="tf-tabular tf-a-pulse__kpi-value">{value}</div>
      <div
        className={`tf-a-pulse__kpi-delta${up ? ' is-up' : ''}${down ? ' is-down' : ''}${delta === null ? ' is-muted' : ''}`}
      >
        {delta === null ? (
          <span>{deltaLabel}</span>
        ) : delta === 0 ? (
          <span>± 0 · {deltaLabel}</span>
        ) : (
          <>
            {up ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
            <span>
              {Math.abs(delta).toLocaleString()} {deltaLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ServicePulseSkeleton() {
  return (
    <article className="tf-a-card tf-a-pulse" aria-busy="true">
      <div className="skeleton" style={{ width: 200, height: 10 }} />
      <div className="skeleton" style={{ width: 320, height: 24, marginTop: 8, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 280, height: 12, marginTop: 8 }} />
      <div className="tf-a-pulse__chart-wrap" style={{ marginTop: 24 }}>
        <div className="tf-a-pulse__chart">
          {SKELETON_BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="skeleton"
              style={{ flex: 1, height: `${h}%`, borderRadius: 1.5 }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildSlots(rows: SalesReportRow[], from: Date, to: Date): Slot[] {
  // Index real rows by bucket-start ms so we can fill missing slots with zeros.
  const byMs = new Map<number, SalesReportRow>();
  for (const r of rows) byMs.set(new Date(r.bucket).getTime(), r);

  const slots: Slot[] = [];
  // Align cursor to the bucket boundary that contains `from` (00, 15, 30, 45).
  const startMs = floorToBucket(from.getTime());
  const endMs = to.getTime();
  for (let ms = startMs; ms < endMs; ms += BUCKET_MIN * 60_000) {
    const r = byMs.get(ms);
    slots.push({
      bucketStart: new Date(ms),
      orderCount: r?.orderCount ?? 0,
      totalMillimes: r?.totalMillimes ?? 0,
      isFromData: r !== undefined,
    });
  }
  return slots;
}

function floorToBucket(ms: number): number {
  return Math.floor(ms / (BUCKET_MIN * 60_000)) * (BUCKET_MIN * 60_000);
}

function sumSlots(slots: Slot[]): { orderCount: number; totalMillimes: number } {
  let orderCount = 0;
  let totalMillimes = 0;
  for (const s of slots) {
    orderCount += s.orderCount;
    totalMillimes += s.totalMillimes;
  }
  return { orderCount, totalMillimes };
}

function findPeak(slots: Slot[]): Slot | null {
  let best: Slot | null = null;
  for (const s of slots) {
    if (s.orderCount === 0) continue;
    if (!best || s.orderCount > best.orderCount) best = s;
  }
  return best;
}

function fmtTime(d: Date, lang: LanguageCode): string {
  return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

function absoluteDelta(today: number, yesterday: number): number {
  return today - yesterday;
}

function axisTicks(from: Date, to: Date, lang: LanguageCode): string[] {
  // Show ~4 evenly-spaced labels.
  const span = to.getTime() - from.getTime();
  if (span <= 0) return [fmtTime(from, lang)];
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    out.push(fmtTime(new Date(from.getTime() + (span * i) / 3), lang));
  }
  return out;
}
