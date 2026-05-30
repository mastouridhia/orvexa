import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, TableWithDerived, WaiterCall } from '@orvexa/shared';
import { useEscapeKey, useFocusTrap } from '@orvexa/ui';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatMillimes, parseMillimes, pickLang } from '../utils/format.js';
import { pickPrimaryOrder, visualStateOf, type WaiterVisualState } from '../utils/waiter.js';
import { IconBolt, IconChevronLeft } from './tf-icons.js';
import { WaiterOrderSheet } from './WaiterOrderSheet.js';

export function TableDetail({
  table,
  orders,
  call,
  lang,
  now,
  onClose,
  onOrderChange,
  onCallCleared,
  cleanPromptOpen,
  onDismissCleanPrompt,
}: {
  table: TableWithDerived;
  orders: Order[];
  call: WaiterCall | null;
  lang: LanguageCode;
  now: number;
  onClose: () => void;
  onOrderChange: (next: Order | null) => void;
  onCallCleared: (id: string) => void;
  cleanPromptOpen: boolean;
  onDismissCleanPrompt: () => void;
}) {
  const order = pickPrimaryOrder(orders);
  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'paid');
  const billTotalMillimes = unpaidOrders.reduce((s, o) => s + o.totalMillimes, 0);
  const activeOrderCount = orders.filter((o) =>
    ['received', 'preparing', 'ready'].includes(o.status),
  ).length;
  const ceilingHit = activeOrderCount >= 6;
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const me = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [tipInput, setTipInput] = useState('');
  const [showOrder, setShowOrder] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [ceilingBusy, setCeilingBusy] = useState(false);
  const [ceilingUnlocked, setCeilingUnlocked] = useState(false);

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
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  const state: WaiterVisualState = visualStateOf(table, orders, call);
  const assignedToMe = order !== null && me !== null && order.assignedWaiterId === me.id;
  const assignedToOther = order !== null && order.assignedWaiterId !== null && !assignedToMe;
  const canSettleBill = unpaidOrders.some((o) => o.status === 'served');

  const advance = async (next: 'preparing' | 'ready' | 'served') => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await authedFetch((tk) => api.updateOrderStatus(tk, order.id, next));
      onOrderChange(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm(t('detail.cancelOrderConfirm', { defaultValue: 'Cancel this round?' }))) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await authedFetch((tk) => api.cancelOrder(tk, orderId));
      onOrderChange(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    if (unpaidOrders.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Advance any 'ready' rounds to 'served' first — payment endpoint
      // requires the order to be in a payable state.
      for (const o of unpaidOrders) {
        if (o.status === 'ready') {
          const updated = await authedFetch((tk) => api.updateOrderStatus(tk, o.id, 'served'));
          onOrderChange(updated);
        }
      }
      // Tip goes on the first unpaid order so we don't double-count it.
      const tip = parseMillimes(tipInput) ?? 0;
      for (let i = 0; i < unpaidOrders.length; i++) {
        const target = unpaidOrders[i];
        const tipForThis = i === 0 ? tip : 0;
        try {
          const result = await authedFetch((tk) =>
            api.recordPayment(tk, target.id, { method: 'cash', tipMillimes: tipForThis }),
          );
          onOrderChange(result.order);
        } catch (err) {
          // Stale UI: order was paid in another tab/by another waiter.
          // Refresh it and keep going instead of surfacing as an error.
          const msg = getErrorMessage(err);
          if (/already fully paid/i.test(msg)) {
            const fresh = await authedFetch((tk) => api.getOrder(tk, target.id));
            onOrderChange(fresh);
            continue;
          }
          throw err;
        }
      }
      setShowPay(false);
    } catch (err) {
      setError(getErrorMessage(err));
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
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openCodeModal = async () => {
    setCodeModalOpen(true);
    if (code) return;
    setCodeBusy(true);
    try {
      const result = await authedFetch((tk) => api.issueOrderingCode(tk, table.id));
      setCode(result.code);
    } catch (err) {
      setError(getErrorMessage(err));
      setCodeModalOpen(false);
    } finally {
      setCodeBusy(false);
    }
  };

  // Auto-open code modal when customer has requested a code.
  useEffect(() => {
    if (call?.kind === 'code_request' && !codeModalOpen) {
      void openCodeModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.kind]);

  const rotateCode = async () => {
    setCodeBusy(true);
    try {
      const result = await authedFetch((tk) => api.issueOrderingCode(tk, table.id));
      setCode(result.code);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCodeBusy(false);
    }
  };

  const unlockCeiling = async () => {
    setCeilingBusy(true);
    try {
      await authedFetch((tk) => api.resetTableOrderCeiling(tk, table.id));
      setCeilingUnlocked(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCeilingBusy(false);
    }
  };

  const markClean = async () => {
    setBusy(true);
    setError(null);
    try {
      await authedFetch((tk) => api.markTableClean(tk, table.id));
      onDismissCleanPrompt();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
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

      {codeModalOpen && (
        <div className="modal-backdrop" onClick={() => setCodeModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>{t('detail.code.title', { label: table.label })}</h2>
              <button type="button" className="close btn-ghost" onClick={() => setCodeModalOpen(false)}>×</button>
            </header>
            <div className="body" style={{ textAlign: 'center' }}>
              <p className="tf-caption" style={{ marginBottom: '0.75rem' }}>
                {t('detail.code.sub')}
              </p>
              {codeBusy ? (
                <div className="tf-w-detail__code-display tf-mono">…</div>
              ) : code ? (
                <div className="tf-w-detail__code-display tf-display">{code}</div>
              ) : null}
              <p className="tf-caption" style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                {t('detail.code.expire')}
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  setCodeModalOpen(false);
                  if (call?.kind === 'code_request') await ackCall();
                }}
              >
                {call?.kind === 'code_request' ? t('detail.code.done') : t('detail.code.close')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={rotateCode}
                disabled={codeBusy}
              >
                {t('detail.code.rotate')}
              </button>
            </footer>
          </div>
        </div>
      )}

      <div className="tf-w-detail__body">
        {error ? <div className="error-banner">{error}</div> : null}

        {ceilingHit && !ceilingUnlocked ? (
          <div className="tf-w-detail__ceiling">
            <div>
              <strong>{t('detail.code.ceilingWarning')}</strong>
              <div className="tf-caption">
                {t('detail.code.ceilingWarningSub', { count: activeOrderCount })}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={unlockCeiling}
              disabled={ceilingBusy}
            >
              {ceilingBusy
                ? t('detail.code.ceilingUnlocking')
                : t('detail.code.ceilingReset')}
            </button>
          </div>
        ) : ceilingUnlocked ? (
          <div className="tf-w-detail__ceiling tf-w-detail__ceiling--ok">
            {t('detail.code.ceilingOk')}
          </div>
        ) : null}

        {call?.kind === 'code_request' ? (
          <div className="tf-w-detail__code-request">
            <div>
              <strong>{t('detail.code.requestTitle')}</strong>
              <div className="tf-caption">{t('detail.code.requestSub')}</div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={openCodeModal}
              disabled={codeBusy}
            >
              {t('detail.code.give')}
            </button>
          </div>
        ) : (
          <div className="tf-w-detail__code-action">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={openCodeModal}
            >
              {t('detail.code.get')}
            </button>
          </div>
        )}

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

        {orders.length > 0 ? (
          orders.map((o, idx) => {
            const isPrimary = order !== null && o.id === order.id;
            const oMins = Math.max(0, Math.floor((now - new Date(o.createdAt).getTime()) / 60000));
            return (
              <section className="tf-w-detail__order-card" key={o.id}>
                <div className="tf-w-detail__order-head">
                  <span className="tf-caption">
                    {orders.length > 1
                      ? `${t('detail.round', { defaultValue: 'Round' })} ${idx + 1} · `
                      : ''}
                    {t('detail.orderRef', {
                      id: o.id.slice(0, 6).toUpperCase(),
                      count: o.items.reduce((s, i) => s + i.quantity, 0),
                    })}
                  </span>
                  {oMins > 0 ? (
                    <span className="tf-mono tf-w-detail__order-elapsed">
                      {oMins}m {t('detail.elapsed')}
                    </span>
                  ) : null}
                  {o.status === 'received' || o.status === 'preparing' ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => cancelOrder(o.id)}
                      disabled={busy}
                      style={{ color: 'var(--color-danger, #c0392b)' }}
                    >
                      {t('detail.cancelOrder', { defaultValue: 'Cancel' })}
                    </button>
                  ) : null}
                </div>
                <div className="tf-w-detail__items">
                  {o.items.map((item) => (
                    <div className="tf-w-detail__item" key={item.id}>
                      <span className="tf-mono tf-w-detail__item-qty">{item.quantity}×</span>
                      <span className="tf-w-detail__item-body">
                        <span className="tf-w-detail__item-name">
                          {pickLang(item.nameSnapshot, lang)}
                        </span>
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
                  <Row k={t('detail.subtotal')} v={formatMillimes(o.subtotalMillimes)} />
                  <Row k={t('detail.tax')} v={formatMillimes(o.taxMillimes)} />
                  <Row k={t('detail.service')} v={formatMillimes(o.serviceMillimes)} />
                  <Row k={t('detail.total')} v={formatMillimes(o.totalMillimes)} grand />
                  {o.paymentStatus === 'paid' ? <Row k={t('detail.paid')} v="✓" success /> : null}
                </div>
                {isPrimary && showPay ? (
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
            );
          })
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
              onClick={markPaid}
              style={{ flex: 1 }}
            >
              {busy ? t('detail.saving') : t('detail.payment.submit')}
            </button>
          </>
        ) : cleanPromptOpen ? (
          <div className="tf-w-detail__clean-prompt">
            <div className="tf-w-detail__clean-prompt-q">{t('detail.cleanPrompt.question')}</div>
            <div className="tf-w-detail__clean-prompt-row">
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={onDismissCleanPrompt}
                disabled={busy}
                style={{ flex: 1 }}
              >
                {t('detail.cleanPrompt.notYet')}
              </button>
              <button
                type="button"
                className="btn btn-success btn-lg"
                onClick={markClean}
                disabled={busy}
                style={{ flex: 1 }}
              >
                {busy ? t('detail.saving') : t('detail.markClean')}
              </button>
            </div>
          </div>
        ) : state === 'clean' ? (
          <button
            type="button"
            className="tf-w-detail__cta tf-w-detail__cta--lime"
            onClick={markClean}
            disabled={busy}
          >
            {busy ? t('detail.saving') : t('detail.markClean')}
          </button>
        ) : call?.kind === 'code_request' ? (
          <button
            type="button"
            className="tf-w-detail__cta tf-w-detail__cta--amber"
            onClick={openCodeModal}
            disabled={codeBusy}
          >
            {codeBusy ? t('detail.saving') : t('detail.code.give')}
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
        ) : order && (state === 'paying' || canSettleBill) ? (
          order.paymentStatus !== 'paid' ? (
            <button
              type="button"
              className="tf-w-detail__cta tf-w-detail__cta--ink"
              onClick={() => setShowPay(true)}
              disabled={busy}
            >
              <span>{t('detail.settleBill')}</span>
              <span className="tf-mono tf-w-detail__cta-amount">
                {formatMillimes(billTotalMillimes)}
              </span>
            </button>
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
