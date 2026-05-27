import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TableWithDerived } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { apiBaseUrl } from '../api/client.js';
import { useAuthStore } from '../store/auth.js';
import { Modal } from '@orvexa/ui';

type Tab = 'list' | 'floorPlan';

export function TablesManager() {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [tables, setTables] = useState<TableWithDerived[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TableWithDerived | 'new' | null>(null);
  const [printing, setPrinting] = useState(false);
  const [tab, setTab] = useState<Tab>('list');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await authedFetch((tk) => api.listTables(tk));
        if (!cancelled) setTables(list);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, reloadKey]);

  if (printing)
    return <PrintSheet tables={tables} token={accessToken} onDone={() => setPrinting(false)} />;

  return (
    <>
      <h1 className="page-title">{t('tables.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div className="tf-a-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'list'}
            className={tab === 'list' ? 'is-active' : ''}
            onClick={() => setTab('list')}
          >
            {t('tables.tabList')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'floorPlan'}
            className={tab === 'floorPlan' ? 'is-active' : ''}
            onClick={() => setTab('floorPlan')}
          >
            {t('tables.tabFloorPlan')}
          </button>
        </div>
        {tab === 'list' ? (
          <div className="row-gap">
            <button type="button" className="btn" onClick={() => setPrinting(true)}>
              {t('tables.printSheet')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              + {t('tables.new')}
            </button>
          </div>
        ) : null}
      </div>

      {tab === 'floorPlan' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted, #888)',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{t('tables.floorPlanWip')}</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('tables.floorPlanWipSub')}</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="muted">{t('tables.title')}…</div>
      ) : (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('tables.label')}</th>
              <th className="right">{t('tables.seats')}</th>
              <th>{t('tables.derivedStatus')}</th>
              <th>{t('tables.merged')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tables.map((tb) => {
              const mergedCount = tb.mergedTableIds?.length ?? 0;
              const isLeader = mergedCount > 0;
              const isMember = tb.mergedIntoTableId !== null;
              const leaderLabel = isMember
                ? tables.find((x) => x.id === tb.mergedIntoTableId)?.label
                : null;
              return (
                <tr key={tb.id}>
                  <td>
                    <strong>{tb.label}</strong>
                  </td>
                  <td className="right">{tb.seats}</td>
                  <td>{tb.derivedStatus}</td>
                  <td>
                    {isLeader ? (
                      <span className="faint">
                        {t('tables.mergedLeader', { count: mergedCount })}
                      </span>
                    ) : isMember ? (
                      <span className="faint">
                        {t('tables.mergedMember', { label: leaderLabel ?? '' })}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="right">
                    {isMember ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={async () => {
                          try {
                            await authedFetch((tk) => api.unmergeTable(tk, tb.id));
                            await reload();
                          } catch (err) {
                            setError(getErrorMessage(err));
                          }
                        }}
                      >
                        {t('tables.unmerge')}
                      </button>
                    ) : (
                      <select
                        defaultValue=""
                        onChange={async (e) => {
                          const memberId = e.target.value;
                          if (!memberId) return;
                          try {
                            await authedFetch((tk) => api.mergeTables(tk, tb.id, [memberId]));
                            await reload();
                          } catch (err) {
                            setError(getErrorMessage(err));
                          }
                          e.target.value = '';
                        }}
                        style={{
                          width: 'auto',
                          display: 'inline-block',
                          marginInlineEnd: '0.35rem',
                        }}
                      >
                        <option value="">{t('tables.merge')}…</option>
                        {tables
                          .filter(
                            (other) =>
                              other.id !== tb.id &&
                              other.mergedIntoTableId === null &&
                              (other.mergedTableIds?.length ?? 0) === 0,
                          )
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              + {other.label}
                            </option>
                          ))}
                      </select>
                    )}{' '}
                    <button type="button" className="btn btn-sm" onClick={() => setEditing(tb)}>
                      {t('tables.save')}
                    </button>{' '}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={async () => {
                        if (!window.confirm(t('tables.deleteConfirm'))) return;
                        try {
                          await authedFetch((tk) => api.deleteTable(tk, tb.id));
                          await reload();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      {t('tables.delete')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing ? (
        <TableEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
          onError={setError}
        />
      ) : null}
    </>
  );
}

function TableEditor({
  initial,
  onClose,
  onSaved,
  onError,
}: {
  initial: TableWithDerived | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [seats, setSeats] = useState(initial?.seats ?? 2);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (initial) {
        await authedFetch((tk) => api.updateTable(tk, initial.id, { label, seats }));
      } else {
        await authedFetch((tk) => api.createTable(tk, { label, seats }));
      }
      await onSaved();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? initial.label : t('tables.new')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('tables.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {t('tables.save')}
          </button>
        </>
      }
    >
      <label>
        {t('tables.label')}
        <input type="text" required value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <label>
        {t('tables.seats')}
        <input
          type="number"
          min={1}
          value={seats}
          onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
        />
      </label>
    </Modal>
  );
}

function PrintSheet({
  tables,
  token,
  onDone,
}: {
  tables: TableWithDerived[];
  token: string | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  // Each QR is fetched as a blob (auth required) and rendered as object URL.
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetched: Record<string, string> = {};
    (async () => {
      try {
        for (const tb of tables) {
          const res = await fetch(`${apiBaseUrl}/tables/${tb.id}/qr?format=png`, {
            headers: { authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`QR fetch failed for ${tb.label}`);
          const blob = await res.blob();
          fetched[tb.id] = URL.createObjectURL(blob);
          if (cancelled) break;
        }
        if (!cancelled) setUrls(fetched);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      for (const url of Object.values(fetched)) URL.revokeObjectURL(url);
    };
  }, [tables, token]);

  return (
    <div>
      <div
        className="row-gap no-print"
        style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}
      >
        <button type="button" className="btn" onClick={onDone}>
          {t('tables.cancel')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          {t('tables.printAction')}
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="print-sheet">
        {tables.map((tb) => (
          <figure key={tb.id}>
            {urls[tb.id] ? (
              <img src={urls[tb.id]} alt={`QR for ${tb.label}`} />
            ) : (
              <div
                style={{
                  height: '200px',
                  background: 'var(--bg-soft)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            )}
            <figcaption>{tb.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
