import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type {
  BillRequestedPayload,
  CloseDayPreview,
  CloseDayResult,
  DashboardSummary,
  LanguageCode,
  OrderCreatedPayload,
  OrderStatusPayload,
  TableStatusPayload,
  WaiterCalledPayload,
} from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { isPlan1 } from '../utils/plan.js';
import { connectAdminSocket } from '../socket/client.js';
import { FirstRunChecklist } from '../components/FirstRunChecklist.js';
import { ServicePulse } from '../components/ServicePulse.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import {
  IconBell,
  IconBolt,
  IconCheck,
  IconLeaf,
  IconReceipt,
  IconTable,
  IconUtensils,
  IconX,
} from '../components/tf-icons.js';

type FeedEntryKind =
  | 'order_created'
  | 'order_preparing'
  | 'order_ready'
  | 'order_served'
  | 'order_cancelled'
  | 'table_seated'
  | 'waiter_called'
  | 'bill_requested';

type FeedEntry = {
  id: string;
  kind: FeedEntryKind;
  tableLabel: string;
  detail?: string;
  at: number;
};

type CloseDayModal =
  | { phase: 'loading' }
  | { phase: 'preview'; preview: CloseDayPreview }
  | { phase: 'confirming' }
  | { phase: 'success'; result: CloseDayResult }
  | { phase: 'error'; message: string };

function Plan1Dashboard() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const user = useAuthStore((s) => s.user);
  const now = Date.now();
  const dateNow = new Date(now);
  const dateLabel = dateNow.toLocaleDateString(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const userName = user?.email ? user.email.split('@')[0] : t('dashboard.defaultUser');
  const h = dateNow.getHours();
  const greeting =
    h < 12 ? t('dashboard.greet.morning') : h < 18 ? t('dashboard.greet.afternoon') : t('dashboard.greet.evening');

  return (
    <div className="tf-a-dash">
      <header className="tf-a-dash__topbar">
        <div>
          <div className="tf-caption">{dateLabel}</div>
          <h1 className="tf-a-dash__title">
            {greeting}, <span className="tf-display">{userName}</span>.
          </h1>
        </div>
      </header>
      <FirstRunChecklist />
      <div
        className="tf-a-card"
        style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}
      >
        <div className="tf-caption">{t('dashboard.plan1.caption', { defaultValue: 'MENU EN LIGNE' })}</div>
        <div className="tf-a-card__title" style={{ fontSize: '1.25rem' }}>
          {t('dashboard.plan1.title', { defaultValue: 'Votre menu est en ligne.' })}
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.65, lineHeight: 1.6 }}>
          {t('dashboard.plan1.sub', {
            defaultValue:
              'Les clients peuvent scanner les QR codes des tables pour consulter le menu. Pour activer la prise de commande, passez au plan Plus.',
          })}
        </p>
      </div>
    </div>
  );
}

export function Dashboard() {
  if (isPlan1) return <Plan1Dashboard />;

  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [closeDayModal, setCloseDayModal] = useState<CloseDayModal | null>(null);
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([]);
  const tableLabelsRef = useRef<Map<string, string>>(new Map());

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
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authedFetch, reloadKey]);

  // Fetch table labels once for the activity feed.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const tables = await authedFetch((tk) => api.listTables(tk));
        if (!cancelled) {
          tableLabelsRef.current = new Map(tables.map((t) => [t.id, t.label]));
        }
      } catch {
        // non-critical — feed shows '?' for unknown tables
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authedFetch]);

  // Re-fetch on order/table/day-close events + build activity feed.
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectAdminSocket(accessToken);

    const bump = () => setReloadKey((k) => k + 1);
    const onConnect = () => {
      setSocketDisconnected(false);
      // Re-fetch summary on reconnect — socket events missed during the disconnect
      // won't arrive after reconnect, so the KPI strip would stay stale otherwise.
      setReloadKey((k) => k + 1);
    };
    const onDisconnect = () => setSocketDisconnected(true);

    const push = (entry: Omit<FeedEntry, 'id'>) =>
      setFeedEntries((prev) => [
        { ...entry, id: `${Date.now()}-${Math.random()}` },
        ...prev.slice(0, 19),
      ]);
    const label = (id: string) => tableLabelsRef.current.get(id) ?? '?';

    const onOrderCreated = (p: OrderCreatedPayload) => {
      push({
        kind: 'order_created',
        tableLabel: label(p.order.tableId),
        detail: String(p.order.items.length),
        at: Date.now(),
      });
    };
    const onOrderStatus = (p: OrderStatusPayload) => {
      const tl = label(p.tableId);
      if (p.status === 'preparing')
        push({ kind: 'order_preparing', tableLabel: tl, at: Date.now() });
      else if (p.status === 'ready') push({ kind: 'order_ready', tableLabel: tl, at: Date.now() });
      else if (p.status === 'served')
        push({ kind: 'order_served', tableLabel: tl, at: Date.now() });
      else if (p.status === 'cancelled')
        push({ kind: 'order_cancelled', tableLabel: tl, at: Date.now() });
    };
    const onWaiterCalled = (p: WaiterCalledPayload) => {
      push({ kind: 'waiter_called', tableLabel: label(p.tableId), at: Date.now() });
    };
    const onBillRequested = (p: BillRequestedPayload) => {
      push({ kind: 'bill_requested', tableLabel: label(p.tableId), at: Date.now() });
    };
    const onTableStatus = (p: TableStatusPayload) => {
      if (p.status === 'seated')
        push({ kind: 'table_seated', tableLabel: label(p.tableId), at: Date.now() });
    };

    socket.on('order:created', bump);
    socket.on('order:created', onOrderCreated);
    socket.on('order:status', bump);
    socket.on('order:status', onOrderStatus);
    socket.on('table:status', bump);
    socket.on('table:status', onTableStatus);
    socket.on('waiter:called', onWaiterCalled);
    socket.on('bill:requested', onBillRequested);
    socket.on('day:closed', bump);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('order:created', bump);
      socket.off('order:created', onOrderCreated);
      socket.off('order:status', bump);
      socket.off('order:status', onOrderStatus);
      socket.off('table:status', bump);
      socket.off('table:status', onTableStatus);
      socket.off('waiter:called', onWaiterCalled);
      socket.off('bill:requested', onBillRequested);
      socket.off('day:closed', bump);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [accessToken]);

  async function handleCloseDayClick() {
    setCloseDayModal({ phase: 'loading' });
    try {
      const preview = await authedFetch((tk) => api.previewCloseDay(tk));
      setCloseDayModal({ phase: 'preview', preview });
    } catch (err) {
      const msg = getErrorMessage(err);
      setCloseDayModal({ phase: 'error', message: msg });
    }
  }

  async function handleCloseDayConfirm() {
    setCloseDayModal({ phase: 'confirming' });
    try {
      const result = await authedFetch((tk) => api.closeDay(tk));
      setCloseDayModal({ phase: 'success', result });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = getErrorMessage(err);
      setCloseDayModal({ phase: 'error', message: msg });
    }
  }

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
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
        >
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </>
    );
  }

  // (TS narrowing — error===null and summary is set by here)
  const s = summary as DashboardSummary;

  // Empty / closed-day: no revenue AND no active orders (received/preparing/ready).
  // ordersTodayCount only counts served orders, so this must also gate on activeOrdersCount
  // — otherwise a restaurant at the start of service (orders placed but nothing served yet)
  // would see the empty-day screen while tables are live.
  if (s.salesTodayMillimes === 0 && s.ordersTodayCount === 0 && s.activeOrdersCount === 0) {
    return <AdminEmptyDay />;
  }

  const avgTicketMillimes =
    s.ordersTodayCount > 0 ? Math.round(s.salesTodayMillimes / s.ordersTodayCount) : 0;

  return (
    <div className="tf-a-dash">
      {socketDisconnected ? (
        <div className="error-banner" style={{ marginBottom: '0.5rem' }}>
          {t('common.offline', { defaultValue: 'Connection lost — reconnecting…' })}
        </div>
      ) : null}
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
          <button
            className="tf-btn tf-btn--ghost tf-btn--sm"
            onClick={() => void handleCloseDayClick()}
          >
            {t('dashboard.closeDay.button')}
          </button>
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
      <ServicePulse refreshKey={reloadKey} lang={lang} now={now} avgDwellMinutesToday={s.avgDwellMinutesToday} />

      {/* Main grid: menu perf + live panel */}
      <section className="tf-a-dash__grid">
        <MenuPerf summary={s} lang={lang} />
        <LivePanel summary={s} feedEntries={feedEntries} now={now} />
      </section>

      {closeDayModal !== null && (
        <CloseDayModalDialog
          state={closeDayModal}
          onConfirm={() => void handleCloseDayConfirm()}
          onDismiss={() => setCloseDayModal(null)}
        />
      )}
    </div>
  );
}

function KPI({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
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
                <span className="tf-mono tf-a-menuperf__rank">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="tf-a-menuperf__name">
                  <span className="tf-a-menuperf__name-fr">{pickLang(it.name, lang)}</span>
                  {lang !== 'ar' && it.name.ar ? (
                    <span className="tf-a-menuperf__name-ar" dir="rtl">
                      {it.name.ar}
                    </span>
                  ) : null}
                </span>
                <span className="tf-mono tf-a-menuperf__qty">{it.quantity}×</span>
                <span className="tf-mono tf-a-menuperf__rev">
                  {formatMillimes(it.revenueMillimes)}
                </span>
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

function fmtTable(label: string): string {
  return /^\d/.test(label) ? `T${label}` : label;
}

function fmtAgo(at: number, now: number, t: TFunction): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 90) return t('dashboard.feed.justNow');
  const m = Math.floor(s / 60);
  if (m < 60) return t('dashboard.feed.minAgo', { n: m });
  return t('dashboard.feed.hrAgo', { n: Math.floor(m / 60) });
}

function feedConfig(entry: FeedEntry, t: TFunction): { cls: string; icon: ReactNode; label: string } {
  const tbl = fmtTable(entry.tableLabel);
  const n = Number(entry.detail ?? 0);
  switch (entry.kind) {
    case 'order_created':
      return {
        cls: 'tf-a-feed__icon--orange',
        icon: <IconUtensils size={13} />,
        label: `${tbl} · ${n} ${n === 1 ? t('dashboard.feed.dish') : t('dashboard.feed.dishes')}`,
      };
    case 'order_preparing':
      return {
        cls: 'tf-a-feed__icon--amber',
        icon: <IconBolt size={13} />,
        label: `${tbl} · ${t('dashboard.feed.preparing')}`,
      };
    case 'order_ready':
      return {
        cls: 'tf-a-feed__icon--green',
        icon: <IconCheck size={13} />,
        label: `${tbl} · ${t('dashboard.feed.ready')}`,
      };
    case 'order_served':
      return {
        cls: 'tf-a-feed__icon--green',
        icon: <IconCheck size={13} />,
        label: `${tbl} · ${t('dashboard.feed.served')}`,
      };
    case 'order_cancelled':
      return {
        cls: 'tf-a-feed__icon--red',
        icon: <IconX size={13} />,
        label: `${tbl} · ${t('dashboard.feed.cancelled')}`,
      };
    case 'table_seated':
      return {
        cls: 'tf-a-feed__icon--ink',
        icon: <IconTable size={13} />,
        label: `${tbl} · ${t('dashboard.feed.seated')}`,
      };
    case 'waiter_called':
      return {
        cls: 'tf-a-feed__icon--red',
        icon: <IconBell size={13} />,
        label: `${tbl} · ${t('dashboard.feed.waiterCalled')}`,
      };
    case 'bill_requested':
      return {
        cls: 'tf-a-feed__icon--orange',
        icon: <IconReceipt size={13} />,
        label: `${tbl} · ${t('dashboard.feed.billRequested')}`,
      };
  }
}

function LivePanel({
  feedEntries,
  now,
}: {
  summary: DashboardSummary;
  feedEntries: FeedEntry[];
  now: number;
}) {
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
      {feedEntries.length === 0 ? (
        <div className="tf-a-feed__empty">{t('dashboard.feed.empty')}</div>
      ) : (
        <div className="tf-a-feed">
          {feedEntries.map((entry) => {
            const { cls, icon, label } = feedConfig(entry, t);
            const time = new Date(entry.at).toLocaleTimeString('fr-TN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div key={entry.id} className="tf-a-feed__item">
                <span className={`tf-a-feed__icon ${cls}`}>{icon}</span>
                <div className="tf-a-feed__body">
                  <div className="tf-a-feed__label">{label}</div>
                  <div className="tf-a-feed__ago">
                    {time} · {fmtAgo(entry.at, now, t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}


/** Skeleton rendered while the summary is loading. Mirrors the design's `AdminLoading`. */
function AdminLoading() {
  return (
    <div className="tf-a-dash" aria-busy="true">
      <header className="tf-a-dash__topbar">
        <div>
          <div className="skeleton" style={{ width: 160, height: 11 }} />
          <div
            className="skeleton"
            style={{ width: 280, height: 28, marginTop: 8, borderRadius: 4 }}
          />
        </div>
      </header>
      <section className="tf-a-dash__kpis">
        {[0, 1, 2, 3].map((i) => (
          <SkelBox key={i}>
            <div className="skeleton" style={{ width: 100, height: 10 }} />
            <div
              className="skeleton"
              style={{ width: 140, height: 36, marginTop: 12, borderRadius: 4 }}
            />
            <div className="skeleton" style={{ width: 120, height: 10, marginTop: 10 }} />
          </SkelBox>
        ))}
      </section>
      <section className="tf-a-dash__grid">
        <SkelBox style={{ height: 380 }}>
          <div className="skeleton" style={{ width: 200, height: 10 }} />
          <div
            className="skeleton"
            style={{ width: 320, height: 24, marginTop: 8, borderRadius: 4 }}
          />
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ width: '100%', height: 22, borderRadius: 4 }}
              />
            ))}
          </div>
        </SkelBox>
        <div className="tf-a-card tf-a-card--ink" style={{ height: 380, padding: 24 }}>
          <div className="skeleton" style={{ width: 100, height: 10, opacity: 0.4 }} />
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ width: '80%', height: 12, opacity: 0.4 }}
              />
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

function CloseDayModalDialog({
  state,
  onConfirm,
  onDismiss,
}: {
  state: CloseDayModal;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const busy = state.phase === 'loading' || state.phase === 'confirming';

  return (
    <div className="tf-modal-overlay" onClick={busy ? undefined : onDismiss}>
      <div className="tf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tf-modal__head">
          <span className="tf-caption">{t('dashboard.closeDay.title')}</span>
        </div>
        <div className="tf-modal__body">
          {state.phase === 'loading' && (
            <p className="tf-mono">{t('dashboard.closeDay.loading')}</p>
          )}
          {(state.phase === 'preview' || state.phase === 'confirming') && (
            <ul className="tf-modal__list">
              <li>
                {t('dashboard.closeDay.preview.activeOrders', {
                  count: state.phase === 'preview' ? state.preview.activeOrdersToCancel : '…',
                })}
              </li>
              {state.phase === 'preview' && state.preview.unpaidServedOrders > 0 && (
                <li className="tf-modal__list-warn">
                  {t('dashboard.closeDay.preview.unpaidServed', {
                    count: state.preview.unpaidServedOrders,
                  })}
                </li>
              )}
              <li>
                {t('dashboard.closeDay.preview.tables', {
                  count: state.phase === 'preview' ? state.preview.tablesToReset : '…',
                })}
              </li>
              <li>
                {t('dashboard.closeDay.preview.calls', {
                  count: state.phase === 'preview' ? state.preview.callsToClear : '…',
                })}
              </li>
            </ul>
          )}
          {state.phase === 'success' && (
            <p className="tf-modal__success">{t('dashboard.closeDay.success')}</p>
          )}
          {state.phase === 'error' && <p className="tf-modal__error">{state.message}</p>}
        </div>
        <div className="tf-modal__foot">
          {state.phase === 'preview' && (
            <button className="tf-btn tf-btn--danger" onClick={onConfirm}>
              {t('dashboard.closeDay.confirm')}
            </button>
          )}
          <button className="tf-btn tf-btn--ghost" onClick={onDismiss} disabled={busy}>
            {state.phase === 'success' ? t('common.close') : t('dashboard.closeDay.cancel')}
          </button>
        </div>
      </div>
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
