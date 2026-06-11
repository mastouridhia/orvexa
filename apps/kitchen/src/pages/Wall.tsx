import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KitchenSection, LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { connectStaffSocket } from '../socket/client.js';
import { TicketCard } from '../components/TicketCard.js';
import { ageBucket } from '../utils/kds.js';
import { navigate } from '../utils/nav.js';
import { playDing, scheduleAutoUnlock } from '../utils/audio.js';
import { IconTablet, IconWifi, IconWifiOff } from '../components/tf-icons.js';

const WALL_SECTIONS: KitchenSection[] = ['kitchen', 'bar', 'restaurant', 'cafe', 'pizzeria'];

function sectionFromPath(path: string): KitchenSection {
  const slug = path.replace(/^\/wall\/?/, '') as KitchenSection;
  return WALL_SECTIONS.includes(slug) ? slug : 'kitchen';
}

/**
 * Read-only "wall display" — designed for overhead screens at each station.
 * /wall → kitchen, /wall/bar → bar, /wall/restaurant → restaurant,
 * /wall/cafe → cafe, /wall/pizzeria → pizzeria.
 * No interaction; just a glanceable grid of the 6 oldest open tickets and a
 * stat strip. Auth still required.
 */
export function Wall() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const accessToken = useAuthStore((s) => s.accessToken);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const section: KitchenSection = sectionFromPath(window.location.pathname);

  const [orders, setOrders] = useState<Order[]>([]);
  const [doneOrders, setDoneOrders] = useState<Map<string, Order>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => navigator.onLine);
  const tableLabels = useMemo(() => new Map<string, string>(), []);
  const fetchedRef = useRef(false);
  const ordersRef = useRef<Order[]>([]);
  const authedFetchRef = useRef(authedFetch);
  const connectedOnce = useRef(false);

  // Keep refs in sync so socket callbacks always see fresh values without stale closures.
  useLayoutEffect(() => {
    ordersRef.current = orders;
    authedFetchRef.current = authedFetch;
  });

  useEffect(() => {
    scheduleAutoUnlock();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!accessToken || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const list = await authedFetch((tk) => api.listActive(tk));
        setOrders(list);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, [accessToken, authedFetch]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectStaffSocket(accessToken);
    const seenIds = new Set<string>();
    const onCreated = (payload: { order: Order }) => {
      setOrders((prev) =>
        prev.some((o) => o.id === payload.order.id) ? prev : [payload.order, ...prev],
      );
      if (!seenIds.has(payload.order.id)) {
        seenIds.add(payload.order.id);
        playDing();
      }
    };
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
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
    };
    const onConnect = () => {
      setError(null);
      if (!connectedOnce.current) {
        connectedOnce.current = true;
        return;
      }
      void authedFetchRef
        .current((tk) => api.listActive(tk))
        .then((list) => {
          setOrders(list);
          setDoneOrders(new Map());
        })
        .catch(() => {});
    };
    socket.on('order:created', onCreated);
    socket.on('order:status', onStatus);
    socket.on('connect', onConnect);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:status', onStatus);
      socket.off('connect', onConnect);
    };
  }, [accessToken]);

  // Only orders that have at least one item for this station.
  const sectionOrders = orders.filter((o) => o.items.some((i) => i.kitchenSection === section));
  const sectionDone = Array.from(doneOrders.values()).filter((o) =>
    o.items.some((i) => i.kitchenSection === section),
  );

  // Stat strip data — scoped to this station's items.
  const open = sectionOrders.filter((o) => o.status !== 'ready');
  const ready = sectionOrders.filter((o) => o.status === 'ready');
  const late = sectionOrders.filter(
    (o) => o.status !== 'ready' && ageBucket(o.createdAt, now) === 'late',
  );

  // 6 oldest active tickets + all recent done cards at the end.
  const active = [...sectionOrders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 6)
    .map((o) => ({
      order: o,
      isDone: false,
      items: o.items.filter((i) => i.kitchenSection === section),
    }));
  const done = sectionDone.map((o) => ({
    order: o,
    isDone: true,
    items: o.items.filter((i) => i.kitchenSection === section),
  }));
  const visible = [...active, ...done];

  const clock = new Date(now).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="tf-kds tf-kds--wall">
      <header className="tf-kds__wall-head">
        <div className="tf-kds__wall-brand">
          <span className="tf-display tf-kds__wall-brand-name">Pass</span>
          <span className="tf-mono tf-kds__wall-brand-sub">{t(`section.${section}`)}</span>
        </div>
        <div className="tf-kds__wall-stats">
          <WallStat label={t('stat.open')} value={open.length} />
          <WallStat label={t('stat.ready')} value={ready.length} accent="lime" />
          <WallStat label={t('stat.late')} value={late.length} accent="late" />
          <span
            className={`tf-kds__wall-net tf-kds__wall-net--${online ? 'on' : 'off'}`}
            title={online ? 'Connected' : 'No internet'}
          >
            {online ? <IconWifi size={20} /> : <IconWifiOff size={20} />}
          </span>
          <span className="tf-mono tf-kds__wall-clock">{clock}</span>
          <button
            type="button"
            className="tf-kds__icon-btn"
            onClick={() => navigate('/')}
            title={t('header.backToBoard')}
            aria-label={t('header.backToBoard')}
          >
            <IconTablet />
          </button>
        </div>
      </header>

      {error ? <div className="tf-kds__err">{error}</div> : null}

      <main className="tf-kds__wall-grid">
        {visible.length === 0 ? (
          <div className="tf-kds__empty">
            <div className="tf-display tf-kds__empty-title">{t('empty.allClear.title')}</div>
            <div className="tf-kds__empty-sub">{t('empty.allClear.sub')}</div>
          </div>
        ) : (
          visible.map(({ order: o, isDone, items }) => (
            <TicketCard
              key={o.id}
              order={o}
              lang={lang}
              section={section}
              tableLabels={tableLabels}
              now={now}
              onAdvance={() => Promise.resolve()}
              isDone={isDone}
              visibleItems={items}
              large
            />
          ))
        )}
      </main>
    </div>
  );
}

function WallStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'lime' | 'late';
}) {
  return (
    <div className={`tf-kds__wall-stat ${accent ? `tf-kds__wall-stat--${accent}` : ''}`}>
      <span className="tf-caption tf-kds__wall-stat-label">{label}</span>
      <span className="tf-tabular tf-kds__wall-stat-value">{value}</span>
    </div>
  );
}
