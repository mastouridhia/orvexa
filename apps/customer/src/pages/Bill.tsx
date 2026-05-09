import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { LanguageCode, Order } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import { IconCheck, IconChevronLeft } from '../components/tf-icons.js';

function buildBillHtml(opts: {
  order: Order;
  restaurantName: string;
  tableLabel: string;
  lang: LanguageCode;
}): string {
  const { order, restaurantName, tableLabel, lang } = opts;
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (m: number) => formatMillimes(m);
  const itemRows = order.items
    .map((it) => {
      const variantDelta = it.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0);
      const lineTotal = (it.unitPriceMillimes + variantDelta) * it.quantity;
      const variants = it.variants.length
        ? `<div class="var">${it.variants.map((v) => escape(pickLang(v.nameSnapshot, lang))).join(' · ')}</div>`
        : '';
      const notes = it.notes ? `<div class="note">${escape(it.notes)}</div>` : '';
      return `<tr>
          <td>${it.quantity}×</td>
          <td><div>${escape(pickLang(it.nameSnapshot, lang))}</div>${variants}${notes}</td>
          <td class="r">${fmt(lineTotal)}</td>
        </tr>`;
    })
    .join('');
  const date = new Date(order.createdAt).toLocaleString(lang);
  return `<!doctype html><html><head><meta charset="utf-8" /><title>Receipt ${escape(order.id.slice(0, 8))}</title>
<style>
  body { font-family: ui-monospace, Menlo, Consolas, monospace; max-width: 420px; margin: 1rem auto; padding: 0 1rem; color: #111; }
  h1 { font-size: 1.2rem; text-align: center; margin: 0 0 .25rem; }
  .meta { text-align: center; color: #555; font-size: .85rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .3rem .15rem; vertical-align: top; font-size: .9rem; }
  th { border-bottom: 1px dashed #aaa; text-align: left; }
  td.r, th.r { text-align: right; }
  .var { color: #555; font-size: .78rem; padding-left: .5rem; }
  .note { color: #555; font-style: italic; font-size: .78rem; padding-left: .5rem; }
  .totals { margin-top: .75rem; border-top: 1px dashed #aaa; padding-top: .5rem; }
  .totals .row { display: flex; justify-content: space-between; padding: .1rem 0; }
  .totals .grand { font-weight: 700; border-top: 1px solid #111; margin-top: .25rem; padding-top: .25rem; font-size: 1.05rem; }
  .footer { margin-top: 1rem; text-align: center; color: #555; font-size: .8rem; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${escape(restaurantName)}</h1>
  <div class="meta">Table ${escape(tableLabel)} · #${escape(order.id.slice(0, 8).toUpperCase())} · ${escape(date)}</div>
  <table><thead><tr><th>Qt</th><th>Item</th><th class="r">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(order.subtotalMillimes)}</span></div>
    ${
      order.taxMillimes > 0
        ? `<div class="row"><span>Tax</span><span>${fmt(order.taxMillimes)}</span></div>`
        : ''
    }
    ${
      order.serviceMillimes > 0
        ? `<div class="row"><span>Service</span><span>${fmt(order.serviceMillimes)}</span></div>`
        : ''
    }
    <div class="row grand"><span>Total</span><span>${fmt(order.totalMillimes)}</span></div>
  </div>
  <div class="footer">Merci · Thank you · شكرًا</div>
</body></html>`;
}

export function BillPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const orderIds = useOrderRefsStore((s) => s.ids);

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  useEffect(() => {
    if (!token || !session) {
      navigate('/', { replace: true });
      return;
    }
    const latest = orderIds[0];
    if (!latest) {
      navigate('/menu', { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const o = await api.getOrder(token, latest);
        if (!cancelled) setOrder(o);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, session, orderIds, navigate]);

  const requestBill = async () => {
    if (!token || !session) return;
    setBusy(true);
    setError(null);
    try {
      await api.requestBill(token, session.tableId);
      setRequested(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const callWaiter = async () => {
    if (!token || !session) return;
    setBusy(true);
    setError(null);
    try {
      await api.callWaiter(token, session.tableId);
      navigate('/waiter');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async () => {
    if (!token || !order || feedbackRating < 1) return;
    setFeedbackBusy(true);
    setError(null);
    try {
      const trimmed = feedbackComment.trim();
      await api.submitFeedback(token, order.id, {
        rating: feedbackRating,
        ...(trimmed ? { comment: trimmed } : {}),
      });
      setFeedbackSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setFeedbackBusy(false);
    }
  };

  const tableShort = session?.tableLabel ?? '—';
  const orderShort = order?.id.slice(0, 8).toUpperCase() ?? '';
  const restaurantName = restaurant?.name ?? t('app.name');

  const printReceipt = () => {
    if (!order) return;
    const html = buildBillHtml({
      order,
      restaurantName,
      tableLabel: tableShort,
      lang,
    });
    const w = window.open('', '_blank', 'width=480,height=720');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };

  return (
    <div className="tf-bill">
      <div className="tf-bill__head">
        <button type="button" className="tf-back" onClick={() => navigate(-1)}>
          <IconChevronLeft size={14} />
          {t('cart.back')}
        </button>
        <div className="tf-tracking__id tf-mono">
          {t('bill.title')} · #{orderShort}
        </div>
        <h1 className="tf-bill__title">
          {restaurantName}
          {' · '}
          <em>
            {t('bill.subtitle', { label: tableShort })}
          </em>
        </h1>
      </div>

      <div className="tf-bill__body">
        {!order ? (
          <div style={{ padding: 16 }}>
            <div className="skeleton" style={{ height: 240, borderRadius: 14 }} />
          </div>
        ) : (
          <div className="tf-receipt-wrap">
            <div className="tf-receipt">
              <div className="tf-receipt__head">
                <span>{t('bill.guestCopy')}</span>
                <span>{new Date(order.createdAt).toLocaleString(lang)}</span>
              </div>
              {order.items.map((it) => {
                const lineTotal =
                  (it.unitPriceMillimes +
                    it.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0)) *
                  it.quantity;
                return (
                  <div className="tf-receipt__row" key={it.id}>
                    <span>
                      <span className="qty">{it.quantity}× </span>
                      {pickLang(it.nameSnapshot, lang)}
                    </span>
                    <span className="price">{formatMillimes(lineTotal)}</span>
                  </div>
                );
              })}
              <div className="tf-receipt__totals">
                <div className="row">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatMillimes(order.subtotalMillimes)}</span>
                </div>
                {order.taxMillimes > 0 ? (
                  <div className="row muted">
                    <span>{t('cart.tax', { percent: '' })}</span>
                    <span>{formatMillimes(order.taxMillimes)}</span>
                  </div>
                ) : null}
                {order.serviceMillimes > 0 ? (
                  <div className="row muted">
                    <span>{t('cart.service', { percent: '' })}</span>
                    <span>{formatMillimes(order.serviceMillimes)}</span>
                  </div>
                ) : null}
                <div className="divider" aria-hidden="true" />
                <div className="tf-receipt__grand">
                  <span className="tf-receipt__grand-label">
                    {t('bill.totalLabel')}
                  </span>
                  <span className="tf-receipt__grand-value">
                    {formatMillimes(order.totalMillimes)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        {requested && !feedbackDismissed ? (
          <div className="tf-feedback-card" role="region" aria-label={t('feedback.title')}>
            {feedbackSent ? (
              <div className="tf-feedback-card__sent" aria-live="polite">
                <div className="tf-feedback-card__sent-icon">
                  <IconCheck size={16} color="#fff" />
                </div>
                <div className="tf-feedback-card__sent-text">{t('feedback.thanks')}</div>
              </div>
            ) : (
              <>
                <div className="tf-feedback-card__head">
                  <div className="tf-feedback-card__title">{t('feedback.title')}</div>
                  <button
                    type="button"
                    className="tf-feedback-card__skip"
                    onClick={() => setFeedbackDismissed(true)}
                    aria-label={t('feedback.skip')}
                  >
                    {t('feedback.skip')}
                  </button>
                </div>
                <div className="tf-feedback-card__sub">{t('feedback.sub')}</div>
                <div
                  className="tf-feedback-card__stars"
                  role="radiogroup"
                  aria-label={t('feedback.rating')}
                  onMouseLeave={() => setFeedbackHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (feedbackHover || feedbackRating) >= n;
                    return (
                      <button
                        type="button"
                        key={n}
                        role="radio"
                        aria-checked={feedbackRating === n}
                        aria-label={`${n}`}
                        onMouseEnter={() => setFeedbackHover(n)}
                        onFocus={() => setFeedbackHover(n)}
                        onClick={() => setFeedbackRating(n)}
                        className={`tf-feedback-card__star${filled ? ' is-on' : ''}`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <textarea
                  className="tf-feedback-card__comment"
                  placeholder={t('feedback.commentPlaceholder')}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={2}
                />
                <button
                  type="button"
                  className="tf-feedback-card__submit"
                  disabled={feedbackBusy || feedbackRating < 1}
                  onClick={submitFeedback}
                >
                  {feedbackBusy ? t('actions.calling') : t('feedback.submit')}
                </button>
              </>
            )}
          </div>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <div style={{ height: 100 }} />
      </div>

      <div className="tf-bill__bar">
        {!requested ? (
          <button
            type="button"
            className="tf-bill__request"
            disabled={busy || !order}
            onClick={requestBill}
          >
            <span>{busy ? t('actions.calling') : t('bill.request')}</span>
            {order ? (
              <span className="tf-bill__request-amount">
                {formatMillimes(order.totalMillimes)} TND
              </span>
            ) : null}
          </button>
        ) : (
          <div className="tf-bill__sent" role="status" aria-live="polite">
            <div className="tf-bill__sent-icon">
              <IconCheck size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="tf-bill__sent-title">{t('bill.sentTitle')}</div>
              <div className="tf-bill__sent-sub">{t('bill.sentSub')}</div>
            </div>
            <button
              type="button"
              className="tf-bill__again"
              onClick={requestBill}
              disabled={busy}
            >
              {t('bill.requestAgain')}
            </button>
          </div>
        )}
        <div className="tf-bill__row">
          <button
            type="button"
            className="tf-bill__secondary"
            disabled={busy}
            onClick={callWaiter}
          >
            {t('bill.callWaiter')}
          </button>
          <button
            type="button"
            className="tf-bill__secondary"
            disabled={!order}
            onClick={printReceipt}
          >
            {t('bill.download')}
          </button>
        </div>
        <button
          type="button"
          className="tf-bill__back-menu"
          onClick={() => navigate('/menu')}
        >
          {t('order.back')}
        </button>
      </div>
    </div>
  );
}
