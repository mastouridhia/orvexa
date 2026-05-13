import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { handleApiError, isSessionExpiredError } from '../api/errorMessage.js';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { formatMillimes } from '../utils/format.js';
import { IconChevronRight } from '../components/tf-icons.js';

export function History() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const token = useSessionStore((s) => s.token);
  const ids = useOrderRefsStore((s) => s.ids);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasWork = !!token && ids.length > 0;
  const [loading, setLoading] = useState(hasWork);

  useEffect(() => {
    if (!hasWork || !token) return;
    let cancelled = false;
    void (async () => {
      const fetched: Order[] = [];
      for (const id of ids) {
        try {
          const o = await api.getOrder(token, id);
          fetched.push(o);
        } catch (err) {
          if (isSessionExpiredError(err)) {
            setError(handleApiError(err, t));
            break;
          }
          if (err instanceof ApiError && err.status >= 500) {
            setError(err.message);
          }
        }
      }
      if (!cancelled) {
        setOrders(fetched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids, token, hasWork, t]);

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1].map((i) => (
          <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <p>{t('cart.empty')}</p>
        <Link to="/menu" className="btn btn-primary btn-pill">
          {t('order.back')}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '18px 16px 32px' }}>
      <h2
        style={{
          marginTop: 0,
          marginBottom: 14,
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: '-0.6px',
        }}
      >
        {t('order.history')}
      </h2>
      {error ? <div className="error-banner">{error}</div> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orders.map((o) => (
          <Link
            key={o.id}
            to={`/orders/${o.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              color: 'inherit',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: 'var(--fg-faint)', textTransform: 'uppercase' }}>
                #{o.id.slice(0, 8).toUpperCase()}
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-soft)', marginTop: 2 }}>
                {new Date(o.createdAt).toLocaleString(lang === 'ar' ? 'ar-TN' : lang)}
              </div>
              <span
                className={`tf-status-pill tf-status-pill--${o.status}`}
                style={{ marginTop: 8 }}
              >
                {t(`order.status.${o.status}`)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {formatMillimes(o.totalMillimes)}
              </span>
              <IconChevronRight size={14} color="var(--fg-faint)" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
