import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, TableWithDerived, WaiterCall } from '@orvexa/shared';
import { useEscapeKey, useFocusTrap } from '@orvexa/ui';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatMillimes, parseMillimes, pickLang } from '../utils/format.js';
import { visualStateOf, type WaiterVisualState } from '../utils/waiter.js';
import { IconBolt, IconChevronLeft } from './tf-icons.js';
import { WaiterOrderSheet } from './WaiterOrderSheet.js';

export function TableDetail({
  table,
  order,
  call,
  lang,
  now,
  onClose,
  onOrderChange,
  onCallCleared,
}: {
  table: TableWithDerived;
  order: Order | null;
  call: WaiterCall | null;
  lang: LanguageCode;
  now: number;
  onClose: () => void;
  onOrderChange: (next: Order | null) => void;
  onCallCleared: (id: string) => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const me = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [tipInput, setTipInput] = useState('');
  const [billRequested, setBillRequested] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!order || order.paymentStatus === 'paid') {
        if (!cancelled) setPendingPaymentId(null);
        return;
      }
      try {
        const payments = await authedFetch((tk) => api.listOrderPayments(tk, order.id));
        if (cancelled) return;
        const pending = payments.find((p) => p.status === 'pending');
        setPendingPaymentId(pending ? pending.id : null);
      } catch {
        // Silent — surface only if user hits Mark paid.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order, authedFetch]);

  const confirmPending = async () => {
    if (!pendingPaymentId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authedFetch((tk) => api.confirmPayment(tk, pendingPaymentId));
      onOrderChange(result.order);
      setPendingPaymentId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  const state: WaiterVisualState = visualStateOf(table, order ? [order] : [], call);
  const assignedToMe = order !== null && me !== null && order.assignedWaiterId === me.id;
  const assignedToOther =
    order !== null && order.assignedWaiterId !== null && !assignedToMe;
  const canRequestBill =
    order !== null && order.status === 'served' && order.paymentStatus !== 'paid';

  const requestBill = async () => {
    setBusy(true);
    setError(null);
    try {
      await authedFetch((tk) => api.requestBillForTable(tk, table.id));
      setBillRequested(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const advance = async (next: 'preparing' | 'ready' | 'served') => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await authedFetch((tk) => api.updateOrderStatus(tk, order.id, next));
      onOrderChange(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitPay = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const tip = parseMillimes(tipInput) ?? 0;
      const result = await authedFetch((tk) =>
        api.recordPayment(tk, order.id, { method: 'cash', tipMillimes: tip }),
      );
      onOrderChange(result.order);
      if (result.fullyPaid) setShowPay(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const closeAndPaid = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      // Ensure the order is in a payable lifecycle state.
      if (order.status === 'ready') {
        const updated = await authedFetch((tk) => api.updateOrderStatus(tk, order.id, 'served'));
        onOrderChange(updated);
      }
      const tip = parseMillimes(tipInput) ?? 0;
      const updatedPay = await authedFetch((tk) =>
        api.recordPayment(tk, order.id, { method: 'cash', tipMillimes: tip }),
      );
      onOrderChange(updatedPay.order);
      setShowPay(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ackCall = async () => {
    if (!call) return;
    setBusy(true);
    setError(null);
    try {
      await authedFetch((tk) => api.clearWaiterCall(tk, call.id));
      onCallCleared(call.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const markClean = async () => {
    setBusy(true);
    setError(null);
    try {
      await authedFetch((tk) => api.markTableClean(tk, table.id));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const minsInOrder = order
    ? Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000))
    : 0;

  return (
    <div
      ref={sheetRef}
      className="tf-w-detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="td-title"
    >
      <header className="tf-w-detail__head">
        <button type="button" className="tf-w-detail__back" onClick={onClose}>
          <IconChevronLeft />
          <span>{t('detail.back')}</span>
        </button>
        <div className="tf-w-detail__head-row">
          <div>
            <div className="tf-caption">{t('detail.seats', { count: table.seats })}</div>
            <h1 id="td-title" className="tf-w-detail__title">
              {t('detail.titleLead')} <span className="tf-display">{table.label}</span>
            </h1>
          </div>
          <span className={`tf-w-detail__pill tf-w-floor__dot--${state}`}>
            {t(`state.${state}`)}
            {minsInOrder > 0 && ['ordered', 'cooking', 'paying'].includes(state)
              ? ` · ${minsInOrder}m`
              : ''}
          </span>
        </div>
        {assignedToMe || assignedToOther ? (
          <div className="tf-w-detail__assign">
            <span className={`tf-w-detail__assign-pill ${assignedToMe ? 'is-me' : ''}`}>
              {assignedToMe ? t('detail.assignedToMe') : t('detail.assignedToOther')}
            </span>
          </div>
        ) : null}
      </header>

      <div className="tf-w-detail__body">
        {error ? <div className="error-banner">{error}</div> : null}
        {pendingPaymentId ? (
          <div className="tf-w-detail__pending">
            <div>
              <strong>{t('detail.payment.pendingTitle')}</strong>
              <div className="tf-caption">{t('detail.payment.pendingSub')}</div>
            </div>
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={confirmPending}
            >
              {t('detail.payment.markPaid')}
            </button>
          </div>
        ) : null}

        {order ? (
          <section className="tf-w-detail__order-card">
            <div className="tf-w-detail__order-head">
              <span className="tf-caption">
                {t('detail.orderRef', {
                  id: order.id.slice(0, 6).toUpperCase(),
                  count: order.items.reduce((s, i) => s + i.quantity, 0),
                })}
              </span>
              {minsInOrder > 0 ? (
                <span className="tf-mono tf-w-detail__order-elapsed">
                  {minsInOrder}m {t('detail.elapsed')}
                </span>
              ) : null}
            </div>
            <div className="tf-w-detail__items">
              {order.items.map((item) => (
                <div className="tf-w-detail__item" key={item.id}>
                  <span className="tf-mono tf-w-detail__item-qty">{item.quantity}×</span>
                  <span className="tf-w-detail__item-body">
                    <span className="tf-w-detail__item-name">{pickLang(item.nameSnapshot, lang)}</span>
                    {lang !== 'ar' && item.nameSnapshot.ar ? (
                      <span className="tf-w-detail__item-ar" dir="rtl">
                        {item.nameSnapshot.ar}
                      </span>
                    ) : null}
                    {item.variants.length > 0 ? (
                      <span className="tf-w-detail__item-variants">
                        {item.variants.map((v) => pickLang(v.nameSnapshot, lang)).join(' · ')}
                      </span>
                    ) : null}
                    {item.notes ? (
                      <span className="tf-w-detail__item-notes">{item.notes}</span>
                    ) : null}
                  </span>
                  <span className="tf-mono tf-w-detail__item-line">
                    {formatMillimes(
                      (item.unitPriceMillimes +
                        item.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0)) *
                        item.quantity,
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="tf-w-detail__totals">
              <Row k={t('detail.subtotal')} v={formatMillimes(order.subtotalMillimes)} />
              <Row k={t('detail.tax')} v={formatMillimes(order.taxMillimes)} />
              <Row k={t('detail.service')} v={formatMillimes(order.serviceMillimes)} />
              <Row k={t('detail.total')} v={formatMillimes(order.totalMillimes)} grand />
              {order.paymentStatus === 'paid' ? (
                <Row k={t('detail.paid')} v="✓" success />
              ) : null}
            </div>
            {showPay ? (
              <div className="tf-w-detail__pay">
                <h3 className="tf-w-detail__pay-title">{t('detail.payment.title')}</h3>
                <label className="tf-w-detail__pay-label">
                  {t('detail.payment.tip')}
                  <input
                    className="tf-w-detail__pay-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.000"
                    value={tipInput}
                    onChange={(e) => setTipInput(e.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </section>
        ) : (
          <div className="tf-w-detail__no-order">
            <span className="tf-display tf-w-detail__no-order-title">
              {state === 'open' ? t('detail.empty.open') : t('detail.empty.noOrder')}
            </span>
            <span className="tf-w-detail__no-order-sub">
              {state === 'open'
                ? t('detail.empty.openSub')
                : state === 'seated'
                  ? t('detail.empty.seatedSub')
                  : t('detail.empty.cleanSub')}
            </span>
          </div>
        )}
      </div>

      <footer className="tf-w-detail__footer">
        {showOrder ? (
          <WaiterOrderSheet
            tableLabel={table.label}
            tableId={table.id}
            existingOrderId={order?.id ?? null}
            lang={lang}
            onClose={() => setShowOrder(false)}
            onSaved={(orderId) => {
              if (!orderId) return;
              void authedFetch((tk) => api.getOrder(tk, orderId))
                .then((o) => onOrderChange(o))
                .catch(() => undefined);
            }}
          />
        ) : null}

        {showPay ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => setShowPay(false)}
              disabled={busy}
            >
              {t('detail.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-success btn-lg btn-block"
              disabled={busy}
              onClick={submitPay}
              style={{ flex: 1 }}
            >
              {busy ? t('detail.saving') : t('detail.payment.submit')}
            </button>
            <button
              type="button"
              className="btn btn-lg btn-block"
              disabled={busy}
              onClick={closeAndPaid}
              style={{ flex: 1 }}
            >
              {busy ? t('detail.saving') : t('detail.closeAndPaid', { defaultValue: 'Close & paid' })}
            </button>
          </>
        ) : state === 'clean' ? (
          <button
            type="button"
            className="tf-w-detail__cta tf-w-detail__cta--lime"
            onClick={markClean}
            disabled={busy}
          >
            {busy ? t('detail.saving') : t('detail.markClean')}
          </button>
        ) : call ? (
          <button
            type="button"
            className="tf-w-detail__cta tf-w-detail__cta--ink"
            onClick={ackCall}
            disabled={busy}
          >
            {busy ? t('detail.saving') : t('detail.ackCall')}
          </button>
        ) : order && order.status === 'ready' ? (
          <button
            type="button"
            className="tf-w-detail__cta tf-w-detail__cta--lime"
            onClick={() => advance('served')}
            disabled={busy}
          >
            <IconBolt />
            <span>{busy ? t('detail.saving') : t('detail.markPassed')}</span>
          </button>
        ) : order && (state === 'paying' || canRequestBill) ? (
          order.paymentStatus !== 'paid' ? (
            <>
              {canRequestBill ? (
                <button
                  type="button"
                  className="btn btn-lg"
                  onClick={requestBill}
                  disabled={busy || billRequested}
                >
                  {billRequested ? t('detail.billRequested') : t('detail.requestBill')}
                </button>
              ) : null}
              <button
                type="button"
                className="tf-w-detail__cta tf-w-detail__cta--ink"
                onClick={() => setShowPay(true)}
                disabled={busy}
              >
                <span>{t('detail.settleBill')}</span>
                <span className="tf-mono tf-w-detail__cta-amount">
                  {formatMillimes(order.totalMillimes)}
                </span>
              </button>
            </>
          ) : null
        ) : order && state === 'cooking' ? (
          <div className="tf-w-detail__cta tf-w-detail__cta--info">{t('detail.cookingNote')}</div>
        ) : order && state === 'ordered' ? (
          <div className="tf-w-detail__cta tf-w-detail__cta--info">{t('detail.orderedNote')}</div>
        ) : order === null || order.status === 'received' ? (
          <button
            type="button"
            className="tf-w-detail__cta tf-w-detail__cta--ink"
            onClick={() => setShowOrder(true)}
            disabled={busy}
          >
            <span>{t('detail.takeOrder', { defaultValue: 'Take order' })}</span>
          </button>
        ) : (
          <div className="tf-w-detail__cta tf-w-detail__cta--info">{t('detail.noAction')}</div>
        )}
      </footer>
    </div>
  );
}

function Row({
  k,
  v,
  grand,
  success,
}: {
  k: string;
  v: string;
  grand?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={`tf-w-detail__total-row${grand ? ' is-grand' : ''}${success ? ' is-success' : ''}`}
    >
      <span>{k}</span>
      <span className={grand ? 'tf-display' : 'tf-mono'}>{v}</span>
    </div>
  );
}
