import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@orvexa/ui';
import type { LanguageCode, Receipt } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatDateTime, formatMillimes, pickLang } from '../utils/format.js';

export function ReceiptModal({
  orderId,
  lang,
  onClose,
}: {
  orderId: string;
  lang: LanguageCode;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch((tk) => api.getReceipt(tk, orderId));
        if (!cancelled) setReceipt(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, authedFetch]);

  const print = () => {
    if (!receipt) return;
    const html = buildPrintHtml(receipt, lang);
    const w = window.open('', '_blank', 'width=480,height=720');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 200);
  };

  return (
    <Modal
      title={t('orders.receipt.title')}
      onClose={onClose}
      footer={
        <div className="row-gap" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.close')}
          </button>
          <button type="button" className="btn btn-primary" onClick={print} disabled={!receipt}>
            {t('orders.receipt.print')}
          </button>
        </div>
      }
    >
      {error ? <div className="error-banner">{error}</div> : null}
      {!receipt ? (
        <div className="muted">{t('common.loading')}</div>
      ) : (
        <div className="tf-a-receipt">
          <header className="tf-a-receipt__head">
            <h3 className="tf-a-receipt__brand">{receipt.restaurant.name}</h3>
            <div className="tf-a-receipt__meta">
              <span>
                {t('orders.receipt.order')} #{receipt.order.id.slice(0, 8).toUpperCase()}
              </span>
              <span>{formatDateTime(receipt.order.createdAt, lang)}</span>
            </div>
            <div className="tf-a-receipt__meta">
              <span>
                {t('orders.receipt.table')}: {receipt.order.tableId.slice(0, 8)}
              </span>
              <span>
                {t('orders.receipt.payment')}: {receipt.order.paymentStatus}
              </span>
            </div>
          </header>

          <table className="tf-a-receipt__items">
            <thead>
              <tr>
                <th>{t('orders.receipt.qty')}</th>
                <th>{t('orders.receipt.item')}</th>
                <th className="right">{t('orders.receipt.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {receipt.order.items.map((it) => {
                const variantDelta = it.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0);
                const lineTotal = (it.unitPriceMillimes + variantDelta) * it.quantity;
                return (
                  <tr key={it.id}>
                    <td>{it.quantity}×</td>
                    <td>
                      <div>{pickLang(it.nameSnapshot, lang)}</div>
                      {it.variants.length ? (
                        <div className="muted" style={{ fontSize: '0.78rem' }}>
                          {it.variants.map((v) => pickLang(v.nameSnapshot, lang)).join(' · ')}
                        </div>
                      ) : null}
                      {it.notes ? (
                        <div className="muted" style={{ fontSize: '0.78rem', fontStyle: 'italic' }}>
                          {it.notes}
                        </div>
                      ) : null}
                    </td>
                    <td className="right">{formatMillimes(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="tf-a-receipt__totals">
            <Row
              k={t('orders.receipt.subtotal')}
              v={formatMillimes(receipt.order.subtotalMillimes)}
            />
            <Row
              k={t('orders.receipt.tax', { percent: receipt.restaurant.taxPercent })}
              v={formatMillimes(receipt.order.taxMillimes)}
            />
            <Row
              k={t('orders.receipt.service', { percent: receipt.restaurant.servicePercent })}
              v={formatMillimes(receipt.order.serviceMillimes)}
            />
            <Row
              k={t('orders.receipt.total')}
              v={formatMillimes(receipt.order.totalMillimes)}
              grand
            />
            <Row k={t('orders.receipt.paid')} v={formatMillimes(receipt.amountPaidMillimes)} />
            {receipt.tipTotalMillimes ? (
              <Row k={t('orders.receipt.tip')} v={formatMillimes(receipt.tipTotalMillimes)} />
            ) : null}
            <Row k={t('orders.receipt.due')} v={formatMillimes(receipt.amountDueMillimes)} grand />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v, grand }: { k: string; v: string; grand?: boolean }) {
  return (
    <div className={`tf-a-receipt__row${grand ? ' is-grand' : ''}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function buildPrintHtml(receipt: Receipt, lang: LanguageCode): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (m: number) => formatMillimes(m);
  const items = receipt.order.items
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
  const date = formatDateTime(receipt.order.createdAt, lang);
  return `<!doctype html><html><head><meta charset="utf-8" /><title>Receipt ${escape(
    receipt.order.id.slice(0, 8),
  )}</title>
<style>
  body { font-family: ui-monospace, Menlo, Consolas, monospace; max-width: 420px; margin: 1rem auto; padding: 0 1rem; color: #111; }
  h1 { font-size: 1.1rem; text-align: center; margin: 0 0 .25rem; }
  .meta { text-align: center; color: #555; font-size: .85rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .25rem .15rem; vertical-align: top; font-size: .9rem; }
  th { border-bottom: 1px dashed #aaa; text-align: left; }
  td.r, th.r { text-align: right; }
  .var { color: #555; font-size: .78rem; padding-left: .5rem; }
  .note { color: #555; font-style: italic; font-size: .78rem; padding-left: .5rem; }
  .totals { margin-top: .75rem; border-top: 1px dashed #aaa; padding-top: .5rem; }
  .totals .row { display: flex; justify-content: space-between; padding: .1rem 0; }
  .totals .grand { font-weight: 700; border-top: 1px solid #111; margin-top: .25rem; padding-top: .25rem; }
  .footer { margin-top: 1rem; text-align: center; color: #555; font-size: .8rem; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${escape(receipt.restaurant.name)}</h1>
  <div class="meta">#${escape(receipt.order.id.slice(0, 8).toUpperCase())} · ${escape(date)}</div>
  <table><thead><tr><th>Qt</th><th>Item</th><th class="r">Total</th></tr></thead><tbody>${items}</tbody></table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(receipt.order.subtotalMillimes)}</span></div>
    <div class="row"><span>Tax (${receipt.restaurant.taxPercent}%)</span><span>${fmt(receipt.order.taxMillimes)}</span></div>
    <div class="row"><span>Service (${receipt.restaurant.servicePercent}%)</span><span>${fmt(receipt.order.serviceMillimes)}</span></div>
    <div class="row grand"><span>Total</span><span>${fmt(receipt.order.totalMillimes)}</span></div>
    <div class="row"><span>Paid</span><span>${fmt(receipt.amountPaidMillimes)}</span></div>
    <div class="row grand"><span>Due</span><span>${fmt(receipt.amountDueMillimes)}</span></div>
  </div>
  <div class="footer">Merci de votre visite</div>
</body></html>`;
}
