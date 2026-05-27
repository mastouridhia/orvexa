import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { handleApiError } from '../api/errorMessage.js';
import { useSessionStore } from '../store/session.js';
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
      return 3;
    case 'cancelled':
      return -1;
  }
}

function sectionLabel(order: Order, t: (k: string) => string): string {
  const hasBar = order.items.some((i) => i.kitchenSection === 'bar');
  const hasKitchen = order.items.some((i) => i.kitchenSection === 'kitchen');
  if (hasBar && !hasKitchen) return t('tracking.round.barSection');
  if (hasKitchen && !hasBar) return t('tracking.round.kitchenSection');
  return t('tracking.round.kitchenSection');
}

function MiniTimeline({ order }: { order: Order }) {
  const { t } = useTranslation();
  const idx = stageIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  if (isCancelled) {
    return (
      <span className={`tf-status-pill tf-status-pill--cancelled`}>
        {t('order.status.cancelled')}
      </span>
    );
  }

  return (
    <div className="tf-timeline tf-timeline--compact">
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
              {active ? (
                <div className="tf-timeline__sub">
                  {t(`tracking.${s}.sub`)}
                  <span className="tf-timeline__sub-live"> · {t('tracking.live')}</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RoundPage() {
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);

  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);

  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const fetched = await Promise.all(ids.map((id) => api.getOrder(token, id)));
        if (!cancelled) setOrders(fetched);
      } catch (err) {
        if (!cancelled) setError(handleApiError(err, t));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, searchParams.toString()]);

  // Live status updates
  useEffect(() => {
    if (!token) return;
    const socket = connectCustomerSocket(token);
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.status } : o)),
      );
    };
    socket.on('order:status', onStatus);
    return () => {
      socket.off('order:status', onStatus);
    };
  }, [token]);

  const tableShort = session?.tableLabel ?? '—';
  const allServed = orders.length > 0 && orders.every((o) => o.status === 'served');
  const anyReady = orders.some((o) => o.status === 'ready' || o.status === 'served');
  const grandTotal = orders.reduce((s, o) => s + o.totalMillimes, 0);

  if (error) {
    return (
      <div className="empty-state">
        <h2>{t('errors.title')}</h2>
        <p>{error}</p>
        <button type="button" className="btn" onClick={() => navigate('/menu')}>
          {t('order.back')}
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="tf-tracking">
        <div className="tf-tracking__header">
          <div className="skeleton" style={{ height: 12, width: 120, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 32, width: '60%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="tf-tracking">
      <div className="tf-tracking__header">
        <button type="button" className="tf-back" onClick={() => navigate('/menu')}>
          <IconChevronLeft size={14} />
          {t('order.back')}
        </button>

        <div className="tf-tracking__id tf-mono">
          {t('header.tableShort')} {tableShort}
        </div>

        <h1 className="tf-tracking__title">
          {allServed ? (
            t('tracking.readyTitle')
          ) : anyReady ? (
            t('tracking.round.partialReadyTitle')
          ) : (
            <>
              {t('tracking.cookingTitle')} <em>{t('tracking.cookingTitleEm')}</em>
            </>
          )}
        </h1>
        <p className="tf-tracking__sub">
          {allServed
            ? t('tracking.readySub')
            : anyReady
              ? t('tracking.round.partialReadySub')
              : t('tracking.round.cookingSub')}
        </p>
      </div>

      <div className="tf-tracking__body">
        {orders.map((order) => {
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <div className="tf-card" key={order.id}>
              <div className="tf-round__section-head">
                <span className="tf-caption tf-round__section-label">{sectionLabel(order, t)}</span>
                {order.status === 'ready' ? (
                  <span className="tf-status-pill tf-status-pill--ready">
                    {t('order.status.ready')}
                  </span>
                ) : null}
                {!order.etaMinutes || order.status !== 'received' ? null : (
                  <span className="tf-mono" style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
                    {t('tracking.eta', { minutes: order.etaMinutes })}
                  </span>
                )}
              </div>

              <MiniTimeline order={order} />

              <div style={{ marginTop: 16 }}>
                {order.items.map((it) => {
                  const lineTotal =
                    (it.unitPriceMillimes +
                      it.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0)) *
                    it.quantity;
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
                    </div>
                  );
                })}
                <div className="tf-summary__total" style={{ marginTop: 8 }}>
                  <span className="tf-caption">
                    {t('tracking.summaryHead_one', { count: itemCount })}
                  </span>
                  <span className="value">{formatMillimes(order.totalMillimes)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {orders.length > 1 ? (
          <div className="tf-card">
            <div
              className="tf-summary__total"
              style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}
            >
              <span style={{ fontWeight: 600 }}>{t('tracking.round.grandTotal')}</span>
              <span className="value" style={{ fontSize: 17, fontWeight: 600 }}>
                {formatMillimes(grandTotal)}
                <span
                  className="tf-mono"
                  style={{ fontSize: 11, color: 'var(--fg-faint)', marginInlineStart: 6 }}
                >
                  TND
                </span>
              </span>
            </div>
          </div>
        ) : null}

        <div className="tf-quick">
          <button type="button" className="tf-quick__card" onClick={() => navigate('/waiter')}>
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
            disabled={!allServed}
            style={!allServed ? { opacity: 0.55 } : undefined}
          >
            <span className="tf-quick__icon">
              <IconReceipt size={18} />
            </span>
            <span style={{ flex: 1 }}>
              <span className="tf-quick__title" style={{ display: 'block' }}>
                {t('tracking.billTitle')}
              </span>
              <span className="tf-quick__sub">
                {allServed ? t('tracking.billSub') : t('actions.billAvailableAfterServed')}
              </span>
            </span>
            <IconChevronRight size={14} color="var(--fg-faint)" />
          </button>
        </div>

        <div className="tf-tracking__actions">
          <button type="button" className="btn" onClick={() => navigate('/menu')}>
            {t('tracking.orderMore')}
          </button>
        </div>
      </div>
    </div>
  );
}
