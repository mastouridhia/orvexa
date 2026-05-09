import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { connectStaffSocket } from '../socket/client.js';
import { TicketCard } from '../components/TicketCard.js';
import { ageBucket } from '../utils/kds.js';
import { navigate } from '../utils/nav.js';
import { IconTablet } from '../components/tf-icons.js';

/**
 * Read-only "wall display" — designed for the line cook's overhead screen.
 * No interaction; just a glanceable grid of the 6 oldest open tickets and a
 * stat strip. Rendered at /wall (auth still required).
 */
export function Wall() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const accessToken = useAuthStore((s) => s.accessToken);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const tableLabels = useMemo(() => new Map<string, string>(), []);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!accessToken || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const list = await authedFetch((tk) => api.listActive(tk));
        setOrders(list);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
  }, [accessToken, authedFetch]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectStaffSocket(accessToken);
    const onCreated = (payload: { order: Order }) => {
      setOrders((prev) => (prev.some((o) => o.id === payload.order.id) ? prev : [payload.order, ...prev]));
    };
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === payload.orderId ? { ...o, status: payload.status } : o))
          .filter((o) => o.status === 'received' || o.status === 'preparing' || o.status === 'ready'),
      );
    };
    socket.on('order:created', onCreated);
    socket.on('order:status', onStatus);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:status', onStatus);
    };
  }, [accessToken]);

  // Stat strip data
  const open = orders.filter((o) => o.status !== 'ready');
  const ready = orders.filter((o) => o.status === 'ready');
  const late = orders.filter((o) => o.status !== 'ready' && ageBucket(o.createdAt, now) === 'late');

  // Show the 6 oldest open tickets — design is glanceable, not exhaustive.
  const visible = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 6);

  const clock = new Date(now).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="tf-kds tf-kds--wall">
      <header className="tf-kds__wall-head">
        <div className="tf-kds__wall-brand">
          <span className="tf-display tf-kds__wall-brand-name">Pass</span>
          <span className="tf-mono tf-kds__wall-brand-sub">{t('wall.subtitle')}</span>
        </div>
        <div className="tf-kds__wall-stats">
          <WallStat label={t('stat.open')} value={open.length} />
          <WallStat label={t('stat.ready')} value={ready.length} accent="lime" />
          <WallStat label={t('stat.late')} value={late.length} accent="late" />
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
          visible.map((o) => (
            <TicketCard
              key={o.id}
              order={o}
              lang={lang}
              tableLabels={tableLabels}
              now={now}
              onAdvance={() => Promise.resolve()}
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
