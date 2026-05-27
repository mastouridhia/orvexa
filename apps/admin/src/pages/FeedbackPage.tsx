import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Feedback, FeedbackSummary } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';

const PAGE_SIZE = 20;

export function FeedbackPage() {
  const { t, i18n } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [rows, setRows] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, sum] = await Promise.all([
          authedFetch((tk) => api.listFeedback(tk, { page, pageSize: PAGE_SIZE })),
          authedFetch((tk) => api.getFeedbackSummary(tk)),
        ]);
        if (cancelled) return;
        setRows(list.rows);
        setTotal(list.total);
        setSummary(sum);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="page-title">{t('feedback.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}

      {summary ? (
        <div className="tf-a-feedback__kpis">
          <div className="tf-a-feedback__kpi">
            <div className="tf-a-feedback__kpi-label">{t('feedback.totalCount')}</div>
            <div className="tf-a-feedback__kpi-value">{summary.count}</div>
          </div>
          <div className="tf-a-feedback__kpi">
            <div className="tf-a-feedback__kpi-label">{t('feedback.averageRating')}</div>
            <div className="tf-a-feedback__kpi-value">
              {summary.averageRating != null ? `${summary.averageRating.toFixed(1)} / 5` : '—'}
            </div>
          </div>
          <div className="tf-a-feedback__breakdown">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const c = summary.ratingsBreakdown[star];
              const pct = summary.count === 0 ? 0 : Math.round((c / summary.count) * 100);
              return (
                <div className="tf-a-feedback__breakdown-row" key={star}>
                  <span className="tf-a-feedback__breakdown-label">{star}★</span>
                  <span className="tf-a-feedback__breakdown-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="tf-a-feedback__breakdown-count tf-mono">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>{t('feedback.empty')}</p>
        </div>
      ) : (
        <table className="tf-a-feedback__table">
          <thead>
            <tr>
              <th>{t('feedback.col.when')}</th>
              <th>{t('feedback.col.rating')}</th>
              <th>{t('feedback.col.comment')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="tf-mono">
                  {new Date(r.createdAt).toLocaleString(i18n.resolvedLanguage)}
                </td>
                <td>
                  <span className="tf-a-feedback__stars" aria-label={`${r.rating}/5`}>
                    {'★'.repeat(r.rating)}
                    <span className="muted">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                </td>
                <td>{r.comment ?? <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pageCount > 1 ? (
        <div className="tf-a-feedback__pager">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ←
          </button>
          <span className="tf-mono">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            →
          </button>
        </div>
      ) : null}
    </>
  );
}
