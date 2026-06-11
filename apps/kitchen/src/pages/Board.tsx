import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KitchenSection, LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { connectStaffSocket } from '../socket/client.js';
import { TicketCard } from '../components/TicketCard.js';
import { LanguageSelector, Modal } from '@orvexa/ui';
import {
  isAudioEnabled,
  playDing,
  enableAudio,
  disableAudio,
  unlockAudio,
  scheduleAutoUnlock,
} from '../utils/audio.js';
import { ageBucket, type AgeBucket } from '../utils/kds.js';
import { navigate } from '../utils/nav.js';
import {
  IconBell,
  IconBellOff,
  IconLeaf,
  IconLogout,
  IconPause,
  IconPlay,
  IconBellRing,
  IconScreen,
  IconSettings,
} from '../components/tf-icons.js';

type SectionBumpStatus = 'preparing' | 'ready';

type FilterId = 'all' | 'pushing' | 'received' | 'preparing' | 'ready';
type SectionId = KitchenSection;

type Counts = {
  open: number;
  received: number;
  preparing: number;
  ready: number;
  late: number;
  pushing: number;
  lateOrPushing: number;
};

const FILTERS: { id: FilterId; key: string }[] = [
  { id: 'all', key: 'filter.all' },
  { id: 'pushing', key: 'filter.pushing' },
  { id: 'received', key: 'filter.received' },
  { id: 'preparing', key: 'filter.preparing' },
  { id: 'ready', key: 'filter.ready' },
];

export function Board() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [orders, setOrders] = useState<Order[]>([]);
  const [doneOrders, setDoneOrders] = useState<Map<string, Order>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  const [section, setSection] = useState<SectionId>('kitchen');
  const [now, setNow] = useState(() => Date.now());
  const [recentIds, setRecentIds] = useState<Set<string>>(() => new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const seenOrderIds = useRef<Set<string>>(new Set());
  const ordersRef = useRef<Order[]>([]);
  const authedFetchRef = useRef(authedFetch);
  const connectedOnce = useRef(false);
  const tableLabels = useMemo(() => new Map<string, string>(), []);

  // Keep refs in sync so socket callbacks always see fresh values without stale closures.
  // useLayoutEffect fires synchronously after every render, satisfying the refs rule.
  useLayoutEffect(() => {
    ordersRef.current = orders;
    authedFetchRef.current = authedFetch;
  });

  // Unlock audio on first user interaction — covers page-refresh / direct-URL cases
  // where the login form gesture never fired.
  useEffect(() => {
    scheduleAutoUnlock();
  }, []);

  // Tick every second so age + MM:SS counters update live.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  // Initial fetch
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await authedFetch((tk) => api.listActive(tk));
        if (cancelled) return;
        setOrders(list);
        for (const o of list) seenOrderIds.current.add(o.id);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authedFetch]);

  // Socket subscriptions — live order:created and order:status events.
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectStaffSocket(accessToken);
    const onCreated = (payload: { order: Order }) => {
      try {
        setOrders((prev) => {
          if (prev.some((o) => o.id === payload.order.id)) return prev;
          return [payload.order, ...prev];
        });
        if (!seenOrderIds.current.has(payload.order.id)) {
          seenOrderIds.current.add(payload.order.id);
          playDing();
          setRecentIds((prev) => {
            const next = new Set(prev);
            next.add(payload.order.id);
            return next;
          });
          window.setTimeout(() => {
            setRecentIds((prev) => {
              if (!prev.has(payload.order.id)) return prev;
              const next = new Set(prev);
              next.delete(payload.order.id);
              return next;
            });
          }, 2400);
        }
      } catch {
        // socket handler errors must not crash the component
      }
    };
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
      try {
        if (payload.status === 'served' || payload.status === 'cancelled') {
          const order = ordersRef.current.find((o) => o.id === payload.orderId);
          if (order) {
            const done: Order = { ...order, status: payload.status };
            setDoneOrders((m) => new Map(m).set(payload.orderId, done));
            window.setTimeout(() => {
              setDoneOrders((m) => {
                const n = new Map(m);
                n.delete(payload.orderId);
                return n;
              });
            }, 10_000);
          }
          setOrders((prev) => prev.filter((o) => o.id !== payload.orderId));
        } else {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.status } : o)),
          );
        }
      } catch {
        // socket handler errors must not crash the component
      }
    };
    // Re-fetch on reconnect to recover any events missed during the disconnect window.
    // Skip the first connect — the initial fetch effect already covers that.
    const onConnect = () => {
      setError(null);
      setSocketDisconnected(false);
      if (!connectedOnce.current) {
        connectedOnce.current = true;
        return;
      }
      void authedFetchRef
        .current((tk) => api.listActive(tk))
        .then((list) => {
          setOrders(list);
          setDoneOrders(new Map());
          for (const o of list) seenOrderIds.current.add(o.id);
        })
        .catch(() => {});
    };
    const onDisconnect = () => setSocketDisconnected(true);
    socket.on('order:created', onCreated);
    socket.on('order:status', onStatus);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:status', onStatus);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [accessToken]);

  const bumpSection = async (orderId: string, sec: SectionId, status: SectionBumpStatus) => {
    try {
      const updated = await authedFetch((tk) => api.advanceSection(tk, orderId, sec, status));
      setOrders((prev) => {
        if (updated.status === 'served' || updated.status === 'cancelled') {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const on86Dish = async (dishId: string) => {
    try {
      await authedFetch((tk) => api.setDishAvailability(tk, dishId, false));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleSound = () => {
    if (soundOn) {
      disableAudio();
      setSoundOn(false);
    } else {
      enableAudio();
      unlockAudio();
      setSoundOn(true);
    }
  };

  // Per-section active-order counts for tab badges.
  const sectionCounts = useMemo(() => {
    const counts: Record<SectionId, number> = { kitchen: 0, bar: 0, restaurant: 0, cafe: 0, pizzeria: 0 };
    for (const o of orders) {
      for (const sec of ['kitchen', 'bar', 'restaurant', 'cafe', 'pizzeria'] as SectionId[]) {
        if (o.items.some((i) => i.kitchenSection === sec)) counts[sec] += 1;
      }
    }
    return counts;
  }, [orders]);

  // Aggregate counts for the header stat strip + filter pill badges (scoped to active section).
  const counts = useMemo(() => {
    let received = 0;
    let preparing = 0;
    let ready = 0;
    let late = 0;
    let pushing = 0;
    for (const o of orders) {
      if (!o.items.some((i) => i.kitchenSection === section)) continue;
      if (o.status === 'received') received += 1;
      else if (o.status === 'preparing') preparing += 1;
      else if (o.status === 'ready') ready += 1;
      const b: AgeBucket = ageBucket(o.createdAt, now);
      if (b === 'late' && o.status !== 'ready') late += 1;
      if (b === 'pushing' && o.status !== 'ready') pushing += 1;
    }
    return {
      open: received + preparing,
      received,
      preparing,
      ready,
      late,
      pushing,
      lateOrPushing: late + pushing,
    };
  }, [orders, now, section]);

  const visible = useMemo(() => {
    const active = orders
      .filter((o) => {
        if (!o.items.some((i) => i.kitchenSection === section)) return false;
        if (filter === 'all') return true;
        if (filter === 'pushing') {
          const b = ageBucket(o.createdAt, now);
          return (b === 'late' || b === 'pushing') && o.status !== 'ready';
        }
        return o.status === filter;
      })
      .map((o) => ({
        order: o,
        sectionItems: o.items.filter((i) => i.kitchenSection === section),
        isDone: false,
      }))
      .sort((a, b) => a.order.createdAt.localeCompare(b.order.createdAt));

    // Append recently-served/cancelled cards so kitchen can see what happened to late orders.
    const done = Array.from(doneOrders.values())
      .filter((o) => o.items.some((i) => i.kitchenSection === section))
      .map((o) => ({
        order: o,
        sectionItems: o.items.filter((i) => i.kitchenSection === section),
        isDone: true,
      }));
    return [...active, ...done];
  }, [orders, doneOrders, filter, now, section]);

  // Full-page network error (handoff "Lost the floor." state).
  const networkDown = error && orders.length === 0;
  if (networkDown) {
    return (
      <KitchenOffline
        message={error ?? ''}
        onRetry={() => {
          setError(null);
          setLoading(true);
          (async () => {
            try {
              const list = await authedFetch((tk) => api.listActive(tk));
              setOrders(list);
            } catch (err) {
              setError(getErrorMessage(err));
            } finally {
              setLoading(false);
            }
          })();
        }}
      />
    );
  }

  return (
    <div className="tf-kds">
      {/* Top chrome */}
      <header className="tf-kds__topbar">
        <div className="tf-kds__brand">
          <span className="tf-display tf-kds__brand-name">Orvexa</span>
          <span className="tf-mono tf-kds__brand-sub">{t('board.subtitle')}</span>
        </div>
        <span className="tf-kds__sep" aria-hidden="true" />
        <div className="tf-kds__live" aria-live="polite">
          <span
            className={`tf-kds__live-dot ${paused ? 'is-paused' : ''} ${socketDisconnected ? 'is-offline' : ''}`}
          />
          <span className="tf-mono tf-kds__live-label">
            {socketDisconnected
              ? t('board.offline', { defaultValue: 'Offline' })
              : paused
                ? t('board.paused')
                : t('board.live')}
          </span>
        </div>

        <div className="tf-kds__stats">
          <Stat label={t('stat.open')} value={counts.open} />
          <Stat
            label={t('stat.pushing')}
            value={counts.pushing}
            accent={counts.pushing > 0 ? 'saffron' : undefined}
          />
          <Stat
            label={t('stat.late')}
            value={counts.late}
            accent={counts.late > 0 ? 'late' : undefined}
          />
          <Stat
            label={t('stat.ready')}
            value={counts.ready}
            accent={counts.ready > 0 ? 'lime' : undefined}
          />
        </div>

        <div className="tf-kds__topbar-actions">
          <button
            type="button"
            className={`tf-kds__icon-btn ${soundOn ? 'is-on-lime' : ''}`}
            onClick={toggleSound}
            aria-pressed={soundOn}
            title={soundOn ? t('header.soundOn') : t('header.soundOff')}
          >
            {soundOn ? <IconBell /> : <IconBellOff />}
          </button>
          <button
            type="button"
            className="tf-kds__icon-btn"
            onClick={() => setPaused((p) => !p)}
            title={paused ? t('header.resume') : t('header.pause')}
          >
            {paused ? <IconPlay /> : <IconPause />}
          </button>
          <button
            type="button"
            className="tf-kds__icon-btn"
            onClick={() => navigate(section === 'kitchen' ? '/wall' : `/wall/${section}`)}
            title={t('header.openWall')}
            aria-label={t('header.openWall')}
          >
            <IconScreen />
          </button>
          <button
            type="button"
            className="tf-kds__icon-btn"
            onClick={() => setSettingsOpen(true)}
            title={t('header.settings')}
            aria-label={t('header.settings')}
          >
            <IconSettings />
          </button>
          <button
            type="button"
            className="tf-kds__icon-btn"
            onClick={logout}
            title={t('header.logout')}
            aria-label={t('header.logout')}
          >
            <IconLogout />
          </button>
        </div>
      </header>

      {settingsOpen ? (
        <Modal title={t('settings.title')} onClose={() => setSettingsOpen(false)}>
          <div className="stack">
            <div>
              <div style={{ fontWeight: 600 }}>{t('settings.language')}</div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--fg-soft)',
                  marginTop: '0.2rem',
                  marginBottom: '0.5rem',
                }}
              >
                {t('settings.languageHint')}
              </div>
              <LanguageSelector />
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Section tabs */}
      <nav className="tf-kds__sections" aria-label="Kitchen section">
        {(['kitchen', 'bar', 'restaurant', 'cafe', 'pizzeria'] as SectionId[]).map((sec) => {
          const active = section === sec;
          const count = sectionCounts[sec];
          return (
            <button
              key={sec}
              type="button"
              className={`tf-kds__section-tab ${active ? 'is-on' : ''}`}
              aria-pressed={active}
              onClick={() => {
                setSection(sec);
                setFilter('all');
              }}
            >
              <span>{t(`section.${sec}`)}</span>
              {count > 0 && !active ? (
                <span className="tf-mono tf-kds__section-badge">{count}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Filter strip */}
      <nav className="tf-kds__filters" aria-label="Ticket filter">
        {FILTERS.map((f) => {
          const c = filterCount(f.id, counts);
          const urgent = f.id === 'pushing' && counts.late > 0;
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`tf-kds__filter ${on ? 'is-on' : ''} ${urgent ? 'is-urgent' : ''}`}
              aria-pressed={on}
            >
              <span>{t(f.key)}</span>
              <span className="tf-mono tf-kds__filter-count">{c}</span>
            </button>
          );
        })}
        <span className="tf-kds__filter-spacer" aria-hidden="true" />
        {user?.email ? <span className="tf-mono tf-kds__user">{user.email}</span> : null}
      </nav>

      {/* Soft (recoverable) error banner — only when we still have orders to show */}
      {error ? <div className="tf-kds__err">{error}</div> : null}

      {/* Ticket grid */}
      <main className="tf-kds__grid-wrap">
        {loading ? (
          <div className="tf-kds__loading">
            <span className="tf-mono">{t('board.loading')}</span>
          </div>
        ) : visible.length === 0 ? (
          <KitchenEmptyQueue filter={filter} />
        ) : (
          <div className="tf-kds__grid" data-stagger>
            {visible.map(({ order: o, sectionItems, isDone }) => (
              <TicketCard
                key={o.id}
                order={o}
                lang={lang}
                section={section}
                tableLabels={tableLabels}
                now={now}
                onAdvance={bumpSection}
                on86Dish={isDone ? undefined : on86Dish}
                freshlyArrived={!isDone && recentIds.has(o.id)}
                visibleItems={sectionItems}
                isDone={isDone}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function filterCount(id: FilterId, c: Counts): number {
  if (id === 'all') return c.open + c.ready;
  if (id === 'pushing') return c.lateOrPushing;
  if (id === 'received') return c.received;
  if (id === 'preparing') return c.preparing;
  return c.ready;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'saffron' | 'lime' | 'late';
}) {
  return (
    <div className={`tf-kds__stat ${accent ? `tf-kds__stat--${accent}` : ''}`}>
      <span className="tf-caption tf-kds__stat-label">{label}</span>
      <span className="tf-tabular tf-kds__stat-value">{value}</span>
    </div>
  );
}

function KitchenEmptyQueue({ filter }: { filter: FilterId }) {
  const { t } = useTranslation();
  const filtered = filter !== 'all';
  return (
    <div className="tf-kds__empty">
      <div className="tf-kds__empty-halo">
        <IconLeaf size={40} />
      </div>
      <div className="tf-display tf-kds__empty-title">
        {filtered ? t('empty.filtered.title') : t('empty.allClear.title')}
      </div>
      <div className="tf-kds__empty-sub">
        {filtered ? t('empty.filtered.sub') : t('empty.allClear.sub')}
      </div>
    </div>
  );
}

function KitchenOffline({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="tf-kds tf-kds--offline">
      <div className="tf-kds__offline">
        <div className="tf-kds__offline-halo">
          <IconBellRing size={40} />
        </div>
        <div className="tf-display tf-kds__offline-title">{t('offline.title')}</div>
        <div className="tf-kds__offline-sub">{t('offline.sub')}</div>
        {message ? <div className="tf-mono tf-kds__offline-detail">{message}</div> : null}
        <div className="tf-kds__offline-status">
          <span className="tf-kds__offline-dot" />
          <span className="tf-mono tf-kds__offline-status-label">{t('offline.queueing')}</span>
        </div>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('offline.retry')}
        </button>
      </div>
    </div>
  );
}
