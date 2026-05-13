import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { handleApiError } from '../api/errorMessage.js';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { useCartStore } from '../store/cart.js';
import { connectCustomerSocket } from '../socket/client.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import {
  IconBell,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconReceipt,
} from '../components/tf-icons.js';

type StageId = 'received' | 'preparing' | 'ready';
const STAGES: StageId[] = ['received', 'preparing', 'ready'];

function stageIndex(status: OrderStatus): number {
  switch (status) {
    case 'received':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
      return 2;
    case 'served':
      return 3; // all stages done
    case 'cancelled':
      return -1;
  }
}

export function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const startEditing = useCartStore((s) => s.startEditing);
  const stopEditing = useCartStore((s) => s.stopEditing);
  const orderIds = useOrderRefsStore((s) => s.ids);
  const [order, setOrder] = useState<Order | null>(null);
  const [siblings, setSiblings] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const o = await api.getOrder(token, id);
        if (!cancelled) setOrder(o);
      } catch (err) {
        if (!cancelled) {
          setError(handleApiError(err, t));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, navigate, t]);

  // Live status updates
  useEffect(() => {
    if (!token || !id) return;
    const socket = connectCustomerSocket(token);
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
      if (payload.orderId === id) {
        setOrder((cur) => (cur ? { ...cur, status: payload.status } : cur));
      }
      setSiblings((prev) =>
        prev.map((s) => (s.id === payload.orderId ? { ...s, status: payload.status } : s)),
      );
    };
    socket.on('order:status', onStatus);
    return () => {
      socket.off('order:status', onStatus);
    };
  }, [token, id]);

  // Fetch sibling orders (other rounds on this table session) so the
  // customer can see every round at a glance — fixes the "I forgot what
  // I had ordered" confusion when there are multiple rounds.
  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    const otherIds = orderIds.filter((oid) => oid !== id);
    if (otherIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSiblings([]);
      return;
    }
    void (async () => {
      const fetched: Order[] = [];
      for (const oid of otherIds) {
        try {
          const o = await api.getOrder(token, oid);
          if (o.status !== 'cancelled') fetched.push(o);
        } catch {
          // skip
        }
      }
      if (!cancelled) setSiblings(fetched);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id, orderIds]);

  const cancel = async () => {
    if (!token || !order) return;
    if (!window.confirm(t('order.cancelConfirm'))) return;
    setBusy(true);
    try {
      const updated = await api.cancelOrder(token, order.id);
      setOrder(updated);
    } catch (err) {
      setError(handleApiError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = () => {
    if (!order) return;
    startEditing(order.id);
    navigate('/menu');
  };

  const removeItem = async (itemId: string) => {
    if (!token || !order) return;
    if (!window.confirm(t('order.removeItemConfirm'))) return;
    setBusy(true);
    try {
      const updated = await api.removeOrderItem(token, order.id, itemId);
      setOrder(updated);
    } catch (err) {
      setError(handleApiError(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="empty-state">
        <h2>{t('errors.title')}</h2>
        <p>{error}</p>
        <Link to="/menu" className="btn">
          {t('order.back')}
        </Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="tf-tracking">
        <div className="tf-tracking__header">
          <div className="skeleton" style={{ height: 12, width: 120, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 32, width: '60%' }} />
        </div>
        <div className="tf-tracking__body">
          <div className="tf-card">
            <div className="skeleton" style={{ height: 24, width: '50%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 24, width: '70%' }} />
          </div>
        </div>
      </div>
    );
  }

  const idx = stageIndex(order.status);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const editable = order.status === 'received';
  const canOrderMore =
    order.status === 'preparing' ||
    order.status === 'ready' ||
    order.status === 'served';
  const billAvailable = order.status === 'served';
  const tableShort = session?.tableLabel ?? '—';
  const orderShort = order.id.slice(0, 8).toUpperCase();

  const isReady = order.status === 'ready' || order.status === 'served';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="tf-tracking">
      <div className="tf-tracking__header">
        <button
          type="button"
          className="tf-back"
          onClick={() => navigate('/menu')}
        >
          <IconChevronLeft size={14} />
          {t('order.back')}
        </button>

        <div className="tf-tracking__id tf-mono">
          {t('tracking.id')} #{orderShort} · {t('header.tableShort')} {tableShort}
        </div>

        {isCancelled ? (
          <>
            <h1 className="tf-tracking__title">{t('order.status.cancelled')}.</h1>
            <p className="tf-tracking__sub">
              <span className="tf-status-pill tf-status-pill--cancelled">
                {t('order.status.cancelled')}
              </span>
            </p>
          </>
        ) : (
          <>
            <h1 className="tf-tracking__title">
              {isReady ? (
                t('tracking.readyTitle')
              ) : (
                <>
                  {t('tracking.cookingTitle')}{' '}
                  <em>{t('tracking.cookingTitleEm')}</em>
                </>
              )}
            </h1>
            <p className="tf-tracking__sub">
              {isReady ? t('tracking.readySub') : t('tracking.cookingSub')}
            </p>
            {!isReady && order.etaMinutes != null ? (
              <p className="tf-tracking__eta tf-mono">
                {t('tracking.eta', { minutes: order.etaMinutes })}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="tf-tracking__body">
        {!isCancelled ? (
          <div className="tf-card">
            {STAGES.map((s, i) => {
              const done = i < idx;
              const active = i === idx;
              const isLast = i === STAGES.length - 1;
              return (
                <div className="tf-timeline__step" key={s}>
                  {!isLast ? (
                    <span
                      className={`tf-timeline__connector${done ? ' is-done' : ''}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="tf-timeline__dot-wrap">
                    <div
                      className={`tf-timeline__dot${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                    >
                      {done ? <IconCheck size={14} color="#fff" /> : null}
                      {active ? <span className="tf-timeline__dot-active-inner" /> : null}
                    </div>
                    {active ? <span className="tf-timeline__pulse" aria-hidden="true" /> : null}
                  </div>
                  <div style={{ flex: 1, paddingTop: 1 }}>
                    <div
                      className={`tf-timeline__name${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                    >
                      {t(`tracking.${s}.name`)}
                    </div>
                    <div className="tf-timeline__sub">
                      {active ? t(`tracking.${s}.sub`) : done ? t('tracking.done') : ''}
                      {active ? (
                        <span className="tf-timeline__sub-live">
                          · {t('tracking.live')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="tf-card">
          <div className="tf-summary__head">
            {t('tracking.summaryHead', { count: itemCount })}
          </div>
          {order.items.map((it) => {
            const lineTotal =
              (it.unitPriceMillimes +
                it.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0)) *
              it.quantity;
            const canRemove = editable && order.items.length > 1;
            return (
              <div className="tf-summary__row" key={it.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span>
                    <span className="qty">{it.quantity}× </span>
                    {pickLang(it.nameSnapshot, lang)}
                  </span>
                  {it.variants.length ? (
                    <div className="notes" style={{ fontStyle: 'normal' }}>
                      {it.variants.map((v) => pickLang(v.nameSnapshot, lang)).join(' · ')}
                    </div>
                  ) : null}
                  {it.notes ? <div className="notes">{it.notes}</div> : null}
                </div>
                <span className="price">{formatMillimes(lineTotal)}</span>
                {canRemove ? (
                  <button
                    type="button"
                    className="tf-summary__remove"
                    aria-label={t('order.removeItem')}
                    title={t('order.removeItem')}
                    disabled={busy}
                    onClick={() => removeItem(it.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
          <div className="tf-summary__total">
            <span>{t('cart.subtotal')}</span>
            <span className="value">
              {formatMillimes(order.subtotalMillimes)}
              <span
                className="tf-mono"
                style={{ fontSize: 11, color: 'var(--fg-faint)', marginInlineStart: 6 }}
              >
                TND
              </span>
            </span>
          </div>
          {order.taxMillimes > 0 ? (
            <div
              className="tf-summary__total"
              style={{ color: 'var(--fg-soft)', fontSize: 13 }}
            >
              <span>{t('cart.tax', { percent: '' })}</span>
              <span className="value">{formatMillimes(order.taxMillimes)}</span>
            </div>
          ) : null}
          {order.serviceMillimes > 0 ? (
            <div
              className="tf-summary__total"
              style={{ color: 'var(--fg-soft)', fontSize: 13 }}
            >
              <span>{t('cart.service', { percent: '' })}</span>
              <span className="value">{formatMillimes(order.serviceMillimes)}</span>
            </div>
          ) : null}
          <div
            className="tf-summary__total"
            style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 6 }}
          >
            <span>{t('cart.total')}</span>
            <span className="value" style={{ fontSize: 17, fontWeight: 600 }}>
              {formatMillimes(order.totalMillimes)}
              <span
                className="tf-mono"
                style={{ fontSize: 11, color: 'var(--fg-faint)', marginInlineStart: 6 }}
              >
                TND
              </span>
            </span>
          </div>
        </div>

        {siblings.length > 0 ? (
          <div className="tf-card">
            <div className="tf-summary__head">
              {t('tracking.otherRounds', { defaultValue: 'Other rounds on your table' })}
            </div>
            {siblings
              .slice()
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="tf-summary__row"
                  onClick={() => navigate(`/orders/${s.id}`)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    width: '100%',
                    textAlign: 'start',
                    cursor: 'pointer',
                    padding: '10px 0',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tf-mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
                      #{s.id.slice(0, 8).toUpperCase()}
                    </div>
                    <span
                      className={`tf-status-pill tf-status-pill--${s.status}`}
                      style={{ marginTop: 4 }}
                    >
                      {t(`order.status.${s.status}`)}
                    </span>
                  </div>
                  <span className="price">{formatMillimes(s.totalMillimes)}</span>
                  <IconChevronRight size={14} color="var(--fg-faint)" />
                </button>
              ))}
          </div>
        ) : null}

        {!isCancelled ? (
          <div className="tf-quick">
            <button
              type="button"
              className="tf-quick__card"
              onClick={() => navigate('/waiter')}
            >
              <span className="tf-quick__icon tf-quick__icon--saffron">
                <IconBell size={18} />
              </span>
              <span style={{ flex: 1 }}>
                <span className="tf-quick__title" style={{ display: 'block' }}>
                  {t('tracking.callTitle')}
                </span>
                <span className="tf-quick__sub">{t('tracking.callSub')}</span>
              </span>
              <IconChevronRight size={14} color="var(--fg-faint)" />
            </button>
            <button
              type="button"
              className="tf-quick__card"
              onClick={() => navigate('/bill')}
              disabled={!billAvailable}
              style={!billAvailable ? { opacity: 0.55 } : undefined}
            >
              <span className="tf-quick__icon">
                <IconReceipt size={18} />
              </span>
              <span style={{ flex: 1 }}>
                <span className="tf-quick__title" style={{ display: 'block' }}>
                  {t('tracking.billTitle')}
                </span>
                <span className="tf-quick__sub">
                  {billAvailable ? t('tracking.billSub') : t('actions.billAvailableAfterServed')}
                </span>
              </span>
              <IconChevronRight size={14} color="var(--fg-faint)" />
            </button>
          </div>
        ) : null}

        {editable ? (
          <div className="tf-tracking__actions">
            <button type="button" className="btn" onClick={handleEdit}>
              {t('order.editAddItems')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={cancel}
            >
              {t('order.cancel')}
            </button>
          </div>
        ) : canOrderMore ? (
          <div className="tf-tracking__actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                stopEditing();
                navigate('/menu');
              }}
            >
              {t('tracking.orderMore')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
