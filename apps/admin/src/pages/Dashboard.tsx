import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardSummary, LanguageCode } from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { connectAdminSocket } from '../socket/client.js';
import { FirstRunChecklist } from '../components/FirstRunChecklist.js';
import { ServicePulse } from '../components/ServicePulse.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import { IconLeaf } from '../components/tf-icons.js';

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a minute — for the date/clock in the topbar.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await authedFetch((tk) => api.getDashboardSummary(tk));
        if (!cancelled) setSummary(s);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authedFetch, reloadKey]);

  // Re-fetch on order/table change events.
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectAdminSocket(accessToken);
    const bump = () => setReloadKey((k) => k + 1);
    socket.on('order:created', bump);
    socket.on('order:status', bump);
    socket.on('table:status', bump);
    return () => {
      socket.off('order:created', bump);
      socket.off('order:status', bump);
      socket.off('table:status', bump);
    };
  }, [accessToken]);

  const userName = user?.email ? user.email.split('@')[0] : t('dashboard.defaultUser');
  const dateNow = new Date(now);
  const dateLabel = dateNow.toLocaleDateString(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const greeting = useMemo(() => {
    const h = new Date(now).getHours();
    if (h < 12) return t('dashboard.greet.morning');
    if (h < 18) return t('dashboard.greet.afternoon');
    return t('dashboard.greet.evening');
  }, [now, t]);

  // Loading
  if (!summary && !error) {
    return <AdminLoading />;
  }

  if (error) {
    return (
      <>
        <h1 className="tf-a-page-title">{t('dashboard.title')}</h1>
        <div className="error-banner">{error}</div>
      </>
    );
  }

  // (TS narrowing — error===null and summary is set by here)
  const s = summary as DashboardSummary;

  // Empty / closed-day: zero activity today
  if (s.salesTodayMillimes === 0 && s.ordersTodayCount === 0) {
    return <AdminEmptyDay />;
  }

  const avgTicketMillimes = s.ordersTodayCount > 0 ? Math.round(s.salesTodayMillimes / s.ordersTodayCount) : 0;

  return (
    <div className="tf-a-dash">
      {/* Top bar */}
      <header className="tf-a-dash__topbar">
        <div>
          <div className="tf-caption">{dateLabel}</div>
          <h1 className="tf-a-dash__title">
            {greeting}, <span className="tf-display">{userName}</span>.
          </h1>
        </div>
        <div className="tf-a-dash__topbar-actions">
          <span className="tf-a-dash__health">
            <IconLeaf size={12} />
            <span>{t('dashboard.allGreen')}</span>
          </span>
        </div>
      </header>

      <FirstRunChecklist />

      {/* KPI strip */}
      <section className="tf-a-dash__kpis" data-stagger>
        <KPI label={t('dashboard.kpi.revenue')} value={formatMillimes(s.salesTodayMillimes)} />
        <KPI label={t('dashboard.kpi.orders')} value={String(s.ordersTodayCount)} />
        <KPI label={t('dashboard.kpi.avgTicket')} value={formatMillimes(avgTicketMillimes)} />
        <KPI
          label={t('dashboard.kpi.tables')}
          value={`${s.activeTablesCount}`}
          suffix={`/${s.tablesTotal}`}
        />
      </section>

      {/* Service pulse — full-width 15-min bar chart, today vs yesterday */}
      <ServicePulse refreshKey={reloadKey} lang={lang} now={now} />

      {/* Main grid: menu perf + live panel */}
      <section className="tf-a-dash__grid">
        <MenuPerf summary={s} lang={lang} />
        <LivePanel summary={s} />
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="tf-a-kpi">
      <div className="tf-caption">{label}</div>
      <div className="tf-a-kpi__row">
        <span className="tf-tabular tf-a-kpi__value">{value}</span>
        {suffix ? <span className="tf-mono tf-a-kpi__suffix">{suffix}</span> : null}
      </div>
    </div>
  );
}

function MenuPerf({ summary, lang }: { summary: DashboardSummary; lang: LanguageCode }) {
  const { t } = useTranslation();
  const items = summary.topItemsToday;
  const max = items[0]?.quantity ?? 0;

  return (
    <article className="tf-a-card tf-a-menuperf">
      <header className="tf-a-card__head">
        <div>
          <div className="tf-caption">{t('dashboard.menu.caption')}</div>
          <div className="tf-a-card__title">
            {items.length > 0 ? (
              <>
                <span className="tf-display">{pickLang(items[0].name, lang)}</span>{' '}
                {t('dashboard.menu.lead')}
              </>
            ) : (
              t('dashboard.menu.titleNone')
            )}
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="tf-a-menuperf__empty">{t('dashboard.menu.empty')}</div>
      ) : (
        <div className="tf-a-menuperf__list" data-stagger>
          {items.map((it, i) => {
            const score = max > 0 ? Math.max(6, Math.round((it.quantity / max) * 100)) : 0;
            return (
              <div key={it.dishId} className="tf-a-menuperf__row">
                <span className="tf-mono tf-a-menuperf__rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="tf-a-menuperf__name">
                  <span className="tf-a-menuperf__name-fr">{pickLang(it.name, lang)}</span>
                  {lang !== 'ar' && it.name.ar ? (
                    <span className="tf-a-menuperf__name-ar" dir="rtl">
                      {it.name.ar}
                    </span>
                  ) : null}
                </span>
                <span className="tf-mono tf-a-menuperf__qty">{it.quantity}×</span>
                <span className="tf-mono tf-a-menuperf__rev">{formatMillimes(it.revenueMillimes)}</span>
                <span className="tf-a-menuperf__bar">
                  <span className="tf-a-menuperf__bar-track">
                    <span
                      className={`tf-a-menuperf__bar-fill${score > 80 ? ' is-strong' : score > 60 ? ' is-mid' : ' is-weak'}`}
                      style={{ width: `${score}%` }}
                    />
                  </span>
                  <span className="tf-mono tf-a-menuperf__bar-score">{score}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function LivePanel({ summary }: { summary: DashboardSummary }) {
  const { t } = useTranslation();
  return (
    <article className="tf-a-card tf-a-card--ink tf-a-live">
      <header className="tf-a-live__head">
        <span className="tf-caption">{t('dashboard.live.caption')}</span>
        <span className="tf-a-live__status">
          <span className="tf-a-live__dot" />
          <span className="tf-mono">{t('dashboard.live.status')}</span>
        </span>
      </header>
      <div className="tf-a-live__stats">
        <LiveStat
          label={t('dashboard.live.onFloor')}
          value={String(summary.activeTablesCount)}
          sub={`/${summary.tablesTotal}`}
        />
        <LiveStat label={t('dashboard.live.activeOrders')} value={String(summary.activeOrdersCount)} />
        <LiveStat label={t('dashboard.live.todayOrders')} value={String(summary.ordersTodayCount)} />
      </div>
      <div className="tf-a-live__hint">{t('dashboard.live.hint')}</div>
    </article>
  );
}

function LiveStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tf-a-live__stat">
      <div className="tf-mono tf-a-live__stat-label">{label}</div>
      <div className="tf-tabular tf-a-live__stat-value">
        {value}
        {sub ? <span className="tf-a-live__stat-sub">{sub}</span> : null}
      </div>
    </div>
  );
}

/** Skeleton rendered while the summary is loading. Mirrors the design's `AdminLoading`. */
function AdminLoading() {
  return (
    <div className="tf-a-dash" aria-busy="true">
      <header className="tf-a-dash__topbar">
        <div>
          <div className="skeleton" style={{ width: 160, height: 11 }} />
          <div className="skeleton" style={{ width: 280, height: 28, marginTop: 8, borderRadius: 4 }} />
        </div>
      </header>
      <section className="tf-a-dash__kpis">
        {[0, 1, 2, 3].map((i) => (
          <SkelBox key={i}>
            <div className="skeleton" style={{ width: 100, height: 10 }} />
            <div className="skeleton" style={{ width: 140, height: 36, marginTop: 12, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 120, height: 10, marginTop: 10 }} />
          </SkelBox>
        ))}
      </section>
      <section className="tf-a-dash__grid">
        <SkelBox style={{ height: 380 }}>
          <div className="skeleton" style={{ width: 200, height: 10 }} />
          <div className="skeleton" style={{ width: 320, height: 24, marginTop: 8, borderRadius: 4 }} />
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ width: '100%', height: 22, borderRadius: 4 }} />
            ))}
          </div>
        </SkelBox>
        <div className="tf-a-card tf-a-card--ink" style={{ height: 380, padding: 24 }}>
          <div className="skeleton" style={{ width: 100, height: 10, opacity: 0.4 }} />
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ width: '80%', height: 12, opacity: 0.4 }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SkelBox({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="tf-a-card"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', ...style }}
    >
      {children}
    </div>
  );
}

/** Closed-day / no-activity state. Mirrors the design's `AdminEmptyDay`. */
function AdminEmptyDay() {
  const { t } = useTranslation();
  return (
    <div className="tf-a-empty-day">
      <div className="tf-caption">{t('dashboard.closed.caption')}</div>
      <div className="tf-display tf-a-empty-day__title">{t('dashboard.closed.title')}</div>
      <div className="tf-a-empty-day__sub">{t('dashboard.closed.sub')}</div>
    </div>
  );
}

