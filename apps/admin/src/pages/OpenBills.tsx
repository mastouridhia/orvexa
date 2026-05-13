import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Order, TableWithDerived } from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatDateTime, formatMillimes, parseMillimes } from '../utils/format.js';

const REFRESH_MS = 8000;

export function OpenBills() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as 'ar' | 'fr' | 'en') ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const me = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableWithDerived[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tipById, setTipById] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const canCollect = me?.role === 'admin' || me?.role === 'manager' || me?.role === 'cashier';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bills, tbls] = await Promise.all([
          authedFetch((tk) => api.listOpenBills(tk)),
          authedFetch((tk) => api.listTables(tk)),
        ]);
        if (!cancelled) {
          setOrders(bills);
          setTables(tbls);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, reloadKey]);

  useEffect(() => {
    const id = window.setInterval(() => setReloadKey((k) => k + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const tableLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tables) map.set(t.id, t.label);
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [tables]);

  const grouped = useMemo(() => {
    const byTable = new Map<string, Order[]>();
    for (const o of orders) {
      const list = byTable.get(o.tableId) ?? [];
      list.push(o);
      byTable.set(o.tableId, list);
    }
    return [...byTable.entries()]
      .map(([tableId, os]) => ({
        tableId,
        orders: os.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        totalMillimes: os.reduce((sum, o) => sum + o.totalMillimes, 0),
      }))
      .sort((a, b) => tableLabel(a.tableId).localeCompare(tableLabel(b.tableId)));
  }, [orders, tableLabel]);

  const collect = async (orderId: string) => {
    setBusyId(orderId);
    setError(null);
    try {
      const tip = parseMillimes(tipById[orderId] ?? '') ?? 0;
      await authedFetch((tk) => api.recordPayment(tk, orderId, { method: 'cash', tipMillimes: tip }));
      setTipById((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h1 className="page-title">
        {t('openBills.title', { defaultValue: 'Open bills' })}
      </h1>
      <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
        {t('openBills.subtitle', {
          defaultValue:
            'Cross-table list of orders that have not been fully paid. Collect cash and clear the table.',
        })}
      </p>
      {error ? <div className="error-banner">{error}</div> : null}
      {grouped.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">
            {t('openBills.empty', { defaultValue: 'No open bills right now.' })}
          </p>
        </div>
      ) : (
        <div className="open-bills">
          {grouped.map((group) => (
            <section
              key={group.tableId}
              className="card"
              style={{ marginBottom: '1rem', padding: '1rem' }}
            >
              <header
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <h2 style={{ margin: 0 }}>
                  {t('openBills.tableHeading', {
                    defaultValue: 'Table {{label}}',
                    label: tableLabel(group.tableId),
                  })}
                </h2>
                <span className="tf-mono">
                  {t('openBills.tableTotal', {
                    defaultValue: 'Total: {{amount}}',
                    amount: formatMillimes(group.totalMillimes),
                  })}
                </span>
              </header>
              <table className="dt">
                <thead>
                  <tr>
                    <th>{t('openBills.placedAt', { defaultValue: 'Placed' })}</th>
                    <th>{t('openBills.status', { defaultValue: 'Status' })}</th>
                    <th>{t('openBills.payment', { defaultValue: 'Payment' })}</th>
                    <th className="right">
                      {t('openBills.amount', { defaultValue: 'Amount' })}
                    </th>
                    {canCollect ? (
                      <>
                        <th>{t('openBills.tip', { defaultValue: 'Tip (TND)' })}</th>
                        <th />
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {group.orders.map((o) => (
                    <tr key={o.id}>
                      <td>{formatDateTime(o.createdAt, lang)}</td>
                      <td>{o.status}</td>
                      <td>{o.paymentStatus}</td>
                      <td className="right tf-mono">{formatMillimes(o.totalMillimes)}</td>
                      {canCollect ? (
                        <>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.000"
                              value={tipById[o.id] ?? ''}
                              onChange={(e) =>
                                setTipById((prev) => ({ ...prev, [o.id]: e.target.value }))
                              }
                              style={{ width: '6rem' }}
                              disabled={busyId === o.id || o.status === 'cancelled'}
                            />
                          </td>
                          <td className="right">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={busyId === o.id || o.paymentStatus === 'paid'}
                              onClick={() => collect(o.id)}
                            >
                              {busyId === o.id
                                ? t('openBills.collecting', { defaultValue: 'Collecting…' })
                                : t('openBills.collectCash', { defaultValue: 'Collect cash' })}
                            </button>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
