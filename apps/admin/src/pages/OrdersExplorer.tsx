import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { ReceiptModal } from '../components/ReceiptModal.js';
import { useAuthStore } from '../store/auth.js';
import { formatDateTime, formatMillimes, pickLang } from '../utils/format.js';

type StatusFilter = 'all' | OrderStatus;

export function OrdersExplorer() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [rows, setRows] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch((tk) =>
          api.listOrders(tk, {
            status: status === 'all' ? undefined : status,
            page,
            pageSize,
          }),
        );
        if (cancelled) return;
        setRows(data.orders);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, page, pageSize, authedFetch]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = useMemo(
    () => () => {
      const head = ['id', 'createdAt', 'status', 'paymentStatus', 'tableId', 'totalMillimes'];
      const body = rows.map((o) =>
        [o.id, o.createdAt, o.status, o.paymentStatus, o.tableId, o.totalMillimes].join(','),
      );
      const csv = [head.join(','), ...body].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [rows],
  );

  return (
    <>
      <h1 className="page-title">{t('orders.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="row-gap row-wrap" style={{ marginBottom: '1rem' }}>
        <label>
          {t('orders.status')}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
          >
            {(['all', 'received', 'preparing', 'ready', 'served', 'cancelled'] as const).map(
              (s) => (
                <option key={s} value={s}>
                  {t(`orders.filter.${s}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={exportCsv} disabled={rows.length === 0}>
          {t('orders.export')}
        </button>
      </div>

      {loading ? (
        <div className="muted">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="muted">{t('orders.empty')}</div>
      ) : (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('orders.created')}</th>
              <th>{t('orders.table')}</th>
              <th>{t('orders.status')}</th>
              <th>{t('orders.payment')}</th>
              <th className="right">{t('orders.total')}</th>
              <th>Items</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>{formatDateTime(o.createdAt, lang)}</td>
                <td>{o.tableId.slice(0, 8)}</td>
                <td>{o.status}</td>
                <td>
                  {o.paymentStatus}
                  {o.paymentMethod ? ` (${o.paymentMethod})` : ''}
                </td>
                <td className="right">{formatMillimes(o.totalMillimes)}</td>
                <td className="muted" style={{ fontSize: '0.82rem' }}>
                  {o.items
                    .map((it) => `${it.quantity}× ${pickLang(it.nameSnapshot, lang)}`)
                    .join(' · ')}
                </td>
                <td className="right">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setReceiptOrderId(o.id)}
                  >
                    {t('orders.viewReceipt')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {receiptOrderId ? (
        <ReceiptModal
          orderId={receiptOrderId}
          lang={lang}
          onClose={() => setReceiptOrderId(null)}
        />
      ) : null}

      <div className="row-gap" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button
          type="button"
          className="btn btn-sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t('orders.prev')}
        </button>
        <span className="muted">{t('orders.page', { page, pages })}</span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t('orders.next')}
        </button>
      </div>
    </>
  );
}
