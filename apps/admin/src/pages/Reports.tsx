import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CategoryRevenueRow,
  LanguageCode,
  ReportGranularity,
  SalesReportRow,
  TopItemRow,
} from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatDate, formatMillimes, pickLang } from '../utils/format.js';

type Tab = 'sales' | 'top' | 'byCategory';

export function Reports() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [tab, setTab] = useState<Tab>('sales');
  const [granularity, setGranularity] = useState<ReportGranularity>('day');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [salesRows, setSalesRows] = useState<SalesReportRow[]>([]);
  const [topRows, setTopRows] = useState<TopItemRow[]>([]);
  const [catRows, setCatRows] = useState<CategoryRevenueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [runKey, setRunKey] = useState(0);
  const run = () => setRunKey((k) => k + 1);

  // auto-run on tab/granularity change + manual run via Apply button
  useEffect(() => {
    let cancelled = false;
    const q = {
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    };
    (async () => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        if (tab === 'sales') {
          const rows = await authedFetch((tk) => api.getSales(tk, { granularity, ...q }));
          if (!cancelled) setSalesRows(rows);
        } else if (tab === 'top') {
          const rows = await authedFetch((tk) => api.getTopItems(tk, { limit: 10, ...q }));
          if (!cancelled) setTopRows(rows);
        } else {
          const rows = await authedFetch((tk) => api.getRevenueByCategory(tk, q));
          if (!cancelled) setCatRows(rows);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, granularity, runKey]);

  return (
    <>
      <h1 className="page-title">{t('reports.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="tabs" role="tablist">
        <button type="button" aria-pressed={tab === 'sales'} onClick={() => setTab('sales')}>
          {t('reports.tabs.sales')}
        </button>
        <button type="button" aria-pressed={tab === 'top'} onClick={() => setTab('top')}>
          {t('reports.tabs.top')}
        </button>
        <button type="button" aria-pressed={tab === 'byCategory'} onClick={() => setTab('byCategory')}>
          {t('reports.tabs.byCategory')}
        </button>
      </div>

      <div className="row-gap row-wrap" style={{ marginBottom: '1rem' }}>
        {tab === 'sales' ? (
          <label>
            {t('reports.granularity')}
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as ReportGranularity)}
            >
              <option value="day">{t('reports.day')}</option>
              <option value="week">{t('reports.week')}</option>
              <option value="month">{t('reports.month')}</option>
            </select>
          </label>
        ) : null}
        <label>
          {t('reports.from')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          {t('reports.to')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={run}>
          {t('reports.apply')}
        </button>
      </div>

      {tab === 'sales' ? (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('reports.bucket')}</th>
              <th className="right">{t('reports.orders')}</th>
              <th className="right">{t('reports.subtotal')}</th>
              <th className="right">{t('reports.tax')}</th>
              <th className="right">{t('reports.service')}</th>
              <th className="right">{t('reports.total')}</th>
            </tr>
          </thead>
          <tbody>
            {salesRows.map((r) => (
              <tr key={r.bucket}>
                <td>{formatDate(r.bucket, lang)}</td>
                <td className="right">{r.orderCount}</td>
                <td className="right">{formatMillimes(r.subtotalMillimes)}</td>
                <td className="right">{formatMillimes(r.taxMillimes)}</td>
                <td className="right">{formatMillimes(r.serviceMillimes)}</td>
                <td className="right">
                  <strong>{formatMillimes(r.totalMillimes)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : tab === 'top' ? (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('reports.dish')}</th>
              <th className="right">{t('reports.quantity')}</th>
              <th className="right">{t('reports.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {topRows.map((r) => (
              <tr key={r.dishId}>
                <td>{pickLang(r.name, lang)}</td>
                <td className="right">{r.quantity}</td>
                <td className="right">{formatMillimes(r.revenueMillimes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('reports.category')}</th>
              <th className="right">{t('reports.quantity')}</th>
              <th className="right">{t('reports.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {catRows.map((r, i) => (
              <tr key={r.categoryId ?? `none-${i}`}>
                <td>{pickLang(r.name, lang) || '—'}</td>
                <td className="right">{r.quantity}</td>
                <td className="right">{formatMillimes(r.revenueMillimes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
