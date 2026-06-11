import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Restaurant, TableWithDerived } from '@orvexa/shared';
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
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);
  const reload = () => setReloadKey((k) => k + 1);

  const bulkAdd100 = async () => {
    const highest = tables.reduce((max, tb) => {
      const m = /^Table (\d+)$/i.exec(tb.label);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    setBulkProgress(0);
    try {
      for (let i = 1; i <= 100; i++) {
        await authedFetch((tk) => api.createTable(tk, { label: `Table ${highest + i}`, seats: 4 }));
        setBulkProgress(i);
      }
      await reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBulkProgress(null);
    }
  };

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
            <button
              type="button"
              className="btn"
              onClick={bulkAdd100}
              disabled={bulkProgress !== null}
            >
              {bulkProgress !== null ? `${bulkProgress}/100…` : '+ 100 tables'}
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

type PrintStyle = 'classic' | 'saffron' | 'editorial' | 'dark';

const PRINT_STYLES: PrintStyle[] = ['classic', 'saffron', 'editorial', 'dark'];

const MARK_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#19140E"/>
  <circle cx="50" cy="50" r="31" fill="#FBEED9"/>
  <circle cx="50" cy="50" r="19" fill="#D97A2C"/>
</svg>`;

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
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [qrSvgs, setQrSvgs] = useState<Record<string, string>>({});
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<PrintStyle>('classic');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await authedFetch((tk) => api.getRestaurant(tk));
        if (!cancelled) setRestaurant(r);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const fetched: Record<string, string> = {};
        for (const tb of tables) {
          const res = await fetch(`${apiBaseUrl}/tables/${tb.id}/qr?format=svg`, {
            headers: { authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`QR fetch failed for ${tb.label}`);
          fetched[tb.id] = await res.text();
          if (cancelled) return;
        }
        if (!cancelled) setQrSvgs(fetched);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tables, token]);

  const sheets = useMemo(() => {
    const out: TableWithDerived[][] = [];
    for (let i = 0; i < tables.length; i += 4) out.push(tables.slice(i, i + 4));
    return out;
  }, [tables]);

  const restaurantName = restaurant?.name ?? '';
  const gateMode = restaurant?.orderGateMode ?? 'off';
  const needsCode = gateMode === 'code' || gateMode === 'wifi_or_code';
  const wifiMissing = wifiSsid.trim() === '' || wifiPassword.trim() === '';

  return (
    <div className="orvexa-pcards" style={{ margin: '-1.5rem -1.75rem', padding: '1.5rem 1.75rem', minHeight: '100%', background: 'var(--bg)', overflowX: 'auto' }}>
      <style>{PRINT_CARDS_CSS}</style>
      <div
        className="row-gap no-print"
        style={{ justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}
      >
        <div className="row-gap" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--fg-soft)', alignSelf: 'center' }}>
            {t('tables.printStyle')}:
          </span>
          {PRINT_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${style === s ? 'btn-primary' : ''}`}
              onClick={() => setStyle(s)}
            >
              {t(`tables.printStyle${s.charAt(0).toUpperCase() + s.slice(1)}`)}
            </button>
          ))}
          <div style={{ width: '1px', height: '24px', background: 'var(--line)', margin: '0 4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--fg-soft)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('tables.printWifiSsid')} <span style={{ color: 'var(--danger, #e53e3e)' }}>*</span>
            </label>
            <input
              type="text"
              className={`tf-input${wifiSsid.trim() === '' ? ' input-error' : ''}`}
              placeholder="WiFi"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              style={{ minWidth: '130px', maxWidth: '160px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--fg-soft)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('tables.printWifiPassword')} <span style={{ color: 'var(--danger, #e53e3e)' }}>*</span>
            </label>
            <input
              type="text"
              className={`tf-input${wifiPassword.trim() === '' ? ' input-error' : ''}`}
              placeholder="••••••••"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              style={{ minWidth: '130px', maxWidth: '160px' }}
            />
          </div>
        </div>
        <div className="row-gap">
          <button type="button" className="btn" onClick={onDone}>
            {t('tables.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={wifiMissing}
            title={wifiMissing ? t('tables.printWifiRequired') : undefined}
          >
            {t('tables.printAction')}
          </button>
        </div>
      </div>
      {wifiMissing && (
        <div className="error-banner no-print" style={{ marginBottom: '1rem' }}>
          {t('tables.printWifiRequired')}
        </div>
      )}
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="orvexa-pcards-doc" data-style={style}>
        {sheets.map((sheetTables, si) => (
          <div className="orvexa-pcards-sheet" key={si}>
            <div className="orvexa-pcards-sheet-lbl">
              Sheet <b>{si + 1}</b> of {sheets.length}
            </div>
            {Array.from({ length: 4 }).map((_, i) => {
              const tb = sheetTables[i];
              if (!tb)
                return <div className="orvexa-pcards-card" key={i} style={{ opacity: 0 }} />;
              return (
                <Card
                  key={tb.id}
                  table={tb}
                  qrSvg={qrSvgs[tb.id]}
                  restaurantName={restaurantName}
                  style={style}
                  wifiSsid={wifiSsid}
                  wifiPassword={wifiPassword}
                  needsCode={needsCode}
                  t={t}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const WIFI_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>`;

function Card({
  table,
  qrSvg,
  restaurantName,
  style,
  wifiSsid,
  wifiPassword,
  needsCode,
  t,
}: {
  table: TableWithDerived;
  qrSvg: string | undefined;
  restaurantName: string;
  style: PrintStyle;
  wifiSsid: string;
  wifiPassword: string;
  needsCode: boolean;
  t: (k: string) => string;
}) {
  const label = table.label;
  const tagLabel = `${t('tables.printTableTag')} · ${label}`;
  const hasWifi = wifiSsid.trim() !== '' || wifiPassword.trim() !== '';

  const scanInstr = (
    <span
      dangerouslySetInnerHTML={{
        __html:
          style === 'editorial' ? t('tables.printScanLong') : t('tables.printScanInstr'),
      }}
    />
  );

  const qrWrap = (
    <div className="card-qr-wrap">
      {qrSvg ? <div dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <div className="qr-ph" />}
      <div className="qr-mark" dangerouslySetInnerHTML={{ __html: MARK_SVG }} />
    </div>
  );

  const brand = (
    <div className="card-brand">
      <span dangerouslySetInnerHTML={{ __html: MARK_SVG }} />
      <span>
        Orvexa<em>.</em>
      </span>
    </div>
  );

  const wifiBlock = hasWifi ? (
    <div className="card-wifi">
      <div className="card-wifi__row">
        <span className="card-wifi__icon" dangerouslySetInnerHTML={{ __html: WIFI_ICON }} />
        <div className="card-wifi__fields">
          {wifiSsid && (
            <div className="card-wifi__field">
              <span className="card-wifi__lbl">{t('tables.printWifiSsidShort')}</span>
              <span className="card-wifi__val">{wifiSsid}</span>
            </div>
          )}
          {wifiPassword && (
            <div className="card-wifi__field">
              <span className="card-wifi__lbl">{t('tables.printWifiPassShort')}</span>
              <span className="card-wifi__val card-wifi__pass">{wifiPassword}</span>
            </div>
          )}
        </div>
      </div>
      {needsCode && (
        <div className="card-wifi__or">{t('tables.printOrAskWaiter')}</div>
      )}
    </div>
  ) : null;

  if (style === 'classic' || style === 'dark') {
    return (
      <div className="orvexa-pcards-card">
        <span className="cut-tr" />
        <span className="cut-bl" />
        <div className="card-top">
          {brand}
          <span className="card-table">{tagLabel}</span>
        </div>
        {qrWrap}
        <div className="card-instr">{scanInstr}</div>
        <div className="card-rule" />
        {wifiBlock}
        <div className="card-foot">
          <span>{style === 'dark' ? <b>{restaurantName}</b> : restaurantName}</span>
          <span>orvexa.tn</span>
        </div>
      </div>
    );
  }

  if (style === 'saffron') {
    return (
      <div className="orvexa-pcards-card">
        <span className="cut-tr" />
        <span className="cut-bl" />
        <div className="card-header">
          <div className="card-header-top">
            {brand}
            <span className="card-header__tag">{restaurantName}</span>
          </div>
          <div className="card-header__table">
            <span className="card-header__table-num">{label}</span>
            <span className="card-header__table-lbl">{t('tables.printYourTable')}</span>
          </div>
        </div>
        <div className="card-body">
          {qrWrap}
          <div className="card-instr">{scanInstr}</div>
          {wifiBlock}
        </div>
        <div className="card-foot">
          <span>{t('tables.printNoAppNoLogin')}</span>
          <span>
            orvexa.tn · <b>{label}</b>
          </span>
        </div>
      </div>
    );
  }

  // editorial
  return (
    <div className="orvexa-pcards-card">
      <span className="cut-tr" />
      <span className="cut-bl" />
      <div className="card-top">
        <div className="card-top-brand">Orvexa.</div>
        <div className="card-top-meta">
          <b>{restaurantName}</b>
          <br />
          orvexa.tn
        </div>
      </div>
      <div className="card-rule" />
      <div className="card-middle">
        <div className="card-table-num">{label}</div>
        <div className="card-instr">{scanInstr}</div>
        {wifiBlock}
      </div>
      <div className="card-bottom">
        {qrWrap}
      </div>
    </div>
  );
}

const PRINT_CARDS_CSS = `
.orvexa-pcards {
  --ink: #19140E;
  --cream: #FBEED9;
  --saffron: #D97A2C;
  --saffron-deep: #A8561A;
  --paper: #FAF8F4;
  --paper-warm: #F5EFE6;
  --font-display: 'Newsreader', 'Times New Roman', serif;
  --font-sans: 'Geist', 'Inter', -apple-system, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
}
.orvexa-pcards-doc {
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  padding: 24px 0 48px;
  overflow-x: auto;
  width: 100%;
}
.orvexa-pcards-sheet {
  width: 210mm; height: 297mm; background: #fff;
  box-shadow: 0 16px 48px rgba(0,0,0,0.25);
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
  position: relative;
  page-break-after: always; break-after: page;
}
.orvexa-pcards-sheet-lbl {
  position: absolute; top: -22px; left: 0;
  font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--fg-soft, #888);
}
.orvexa-pcards-sheet-lbl b { color: var(--saffron); }
.orvexa-pcards-card {
  position: relative; overflow: hidden;
  width: 105mm; height: 148mm;
  background: var(--paper); display: flex; flex-direction: column;
}
.orvexa-pcards-card::before, .orvexa-pcards-card::after,
.orvexa-pcards-card > .cut-tr, .orvexa-pcards-card > .cut-bl {
  content: ''; position: absolute; width: 4mm; height: 4mm;
  pointer-events: none; opacity: 0.35;
}
.orvexa-pcards-card::before { top: 0; left: 0; border-top: 0.3mm solid var(--ink); border-left: 0.3mm solid var(--ink); }
.orvexa-pcards-card::after { bottom: 0; right: 0; border-bottom: 0.3mm solid var(--ink); border-right: 0.3mm solid var(--ink); }
.orvexa-pcards-card > .cut-tr { top: 0; right: 0; border-top: 0.3mm solid var(--ink); border-right: 0.3mm solid var(--ink); }
.orvexa-pcards-card > .cut-bl { bottom: 0; left: 0; border-bottom: 0.3mm solid var(--ink); border-left: 0.3mm solid var(--ink); }
.orvexa-pcards-card .qr-ph { width: 100%; height: 100%; background: rgba(0,0,0,0.04); border-radius: 2mm; }
.orvexa-pcards-card .card-brand { display: flex; align-items: center; gap: 2mm; font-family: var(--font-sans); font-weight: 600; font-size: 12pt; letter-spacing: -0.2pt; }
.orvexa-pcards-card .card-brand > span:first-child { width: 6mm; height: 6mm; display: inline-flex; }
.orvexa-pcards-card .card-brand > span:first-child svg { width: 100%; height: 100%; }
.orvexa-pcards-card .card-brand em { font-family: var(--font-display); font-style: italic; font-weight: 400; color: var(--saffron); }
.orvexa-pcards-card .card-qr-wrap svg { width: 100%; height: 100%; }
.orvexa-pcards-card .card-qr-wrap .qr-mark svg { width: 100%; height: 100%; }
.orvexa-pcards-card .card-instr em { color: var(--saffron); font-style: italic; }

/* Classic */
.orvexa-pcards-doc[data-style="classic"] .orvexa-pcards-card { color: var(--ink); padding: 12mm 10mm 10mm; align-items: center; gap: 4mm; }
.orvexa-pcards-doc[data-style="classic"] .card-top { width: 100%; display: flex; justify-content: space-between; align-items: center; }
.orvexa-pcards-doc[data-style="classic"] .card-table { font-family: var(--font-mono); font-size: 8pt; letter-spacing: 1.2px; text-transform: uppercase; color: var(--saffron-deep); background: rgba(217,122,44,0.12); padding: 1mm 2mm; border-radius: 1mm; }
.orvexa-pcards-doc[data-style="classic"] .card-qr-wrap { position: relative; width: 60mm; height: 60mm; margin-top: 2mm; }
.orvexa-pcards-doc[data-style="classic"] .card-qr-wrap .qr-mark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 13mm; height: 13mm; background: var(--paper); border-radius: 2mm; padding: 1.6mm; box-shadow: 0 0 0 1.4mm var(--paper); }
.orvexa-pcards-doc[data-style="classic"] .card-instr { font-family: var(--font-display); font-style: italic; font-size: 20pt; letter-spacing: -0.4pt; color: var(--ink); margin-top: 2mm; text-align: center; }
.orvexa-pcards-doc[data-style="classic"] .card-rule { width: 12mm; height: 0.3mm; background: var(--saffron); margin: 1mm 0; }
.orvexa-pcards-doc[data-style="classic"] .card-steps { display: flex; flex-direction: column; gap: 1.2mm; align-items: center; }
.orvexa-pcards-doc[data-style="classic"] .card-step { display: flex; align-items: center; gap: 1.5mm; font-family: var(--font-mono); font-size: 7pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(25,20,14,0.55); }
.orvexa-pcards-doc[data-style="classic"] .card-step .n { width: 3mm; height: 3mm; border-radius: 50%; background: var(--saffron); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 6pt; }
.orvexa-pcards-doc[data-style="classic"] .card-foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: center; padding-top: 2mm; border-top: 0.2mm solid rgba(25,20,14,0.1); font-family: var(--font-mono); font-size: 6pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(25,20,14,0.4); }

/* Saffron */
.orvexa-pcards-doc[data-style="saffron"] .orvexa-pcards-card { color: var(--ink); padding: 0; display: grid; grid-template-rows: 38mm 1fr 14mm; }
.orvexa-pcards-doc[data-style="saffron"] .card-header { background: var(--saffron); color: #fff; padding: 6mm 8mm; display: flex; flex-direction: column; justify-content: space-between; }
.orvexa-pcards-doc[data-style="saffron"] .card-header-top { display: flex; justify-content: space-between; align-items: center; }
.orvexa-pcards-doc[data-style="saffron"] .card-header .card-brand { color: #fff; }
.orvexa-pcards-doc[data-style="saffron"] .card-header .card-brand em { color: rgba(255,255,255,0.75); }
.orvexa-pcards-doc[data-style="saffron"] .card-header__tag { font-family: var(--font-mono); font-size: 7pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,0.8); }
.orvexa-pcards-doc[data-style="saffron"] .card-header__table { display: flex; align-items: baseline; gap: 3mm; }
.orvexa-pcards-doc[data-style="saffron"] .card-header__table-num { font-family: var(--font-display); font-style: italic; font-size: 44pt; letter-spacing: -2pt; line-height: 1; color: #fff; }
.orvexa-pcards-doc[data-style="saffron"] .card-header__table-lbl { font-family: var(--font-mono); font-size: 8pt; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(255,255,255,0.8); }
.orvexa-pcards-doc[data-style="saffron"] .card-body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3mm; padding: 4mm; }
.orvexa-pcards-doc[data-style="saffron"] .card-qr-wrap { position: relative; width: 56mm; height: 56mm; }
.orvexa-pcards-doc[data-style="saffron"] .card-qr-wrap .qr-mark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 12mm; height: 12mm; background: var(--paper); border-radius: 2mm; padding: 1.4mm; box-shadow: 0 0 0 1.2mm var(--paper); }
.orvexa-pcards-doc[data-style="saffron"] .card-instr { font-family: var(--font-display); font-style: italic; font-size: 14pt; color: var(--ink); text-align: center; letter-spacing: -0.2pt; }
.orvexa-pcards-doc[data-style="saffron"] .card-foot { background: var(--ink); color: var(--paper-warm); padding: 4mm 8mm; display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 7pt; letter-spacing: 1.4px; text-transform: uppercase; }
.orvexa-pcards-doc[data-style="saffron"] .card-foot b { color: var(--saffron); }

/* Editorial */
.orvexa-pcards-doc[data-style="editorial"] .orvexa-pcards-card { color: var(--ink); padding: 10mm 9mm; display: grid; grid-template-rows: auto 1fr auto; }
.orvexa-pcards-doc[data-style="editorial"] .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.orvexa-pcards-doc[data-style="editorial"] .card-top-brand { font-family: var(--font-display); font-style: italic; font-size: 11pt; color: var(--saffron); letter-spacing: -0.2pt; }
.orvexa-pcards-doc[data-style="editorial"] .card-top-meta { text-align: right; font-family: var(--font-mono); font-size: 6.5pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(25,20,14,0.5); line-height: 1.5; }
.orvexa-pcards-doc[data-style="editorial"] .card-top-meta b { color: var(--ink); font-weight: 500; }
.orvexa-pcards-doc[data-style="editorial"] .card-rule { width: 12mm; height: 0.4mm; background: var(--saffron); margin: 4mm 0 2mm; }
.orvexa-pcards-doc[data-style="editorial"] .card-middle { display: flex; flex-direction: column; justify-content: space-between; flex: 1; }
.orvexa-pcards-doc[data-style="editorial"] .card-table-num { font-family: var(--font-display); font-style: italic; font-size: 96pt; letter-spacing: -5pt; line-height: 0.9; color: var(--ink); margin: 2mm 0; }
.orvexa-pcards-doc[data-style="editorial"] .card-instr { font-family: var(--font-sans); font-weight: 500; font-size: 12pt; letter-spacing: -0.3pt; color: var(--ink); max-width: 50mm; line-height: 1.2; }
.orvexa-pcards-doc[data-style="editorial"] .card-bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 4mm; }
.orvexa-pcards-doc[data-style="editorial"] .card-steps { display: flex; flex-direction: column; gap: 1mm; font-family: var(--font-mono); font-size: 6.5pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(25,20,14,0.5); max-width: 30mm; }
.orvexa-pcards-doc[data-style="editorial"] .card-steps b { color: var(--saffron); font-weight: 600; }
.orvexa-pcards-doc[data-style="editorial"] .card-qr-wrap { position: relative; width: 38mm; height: 38mm; flex-shrink: 0; }
.orvexa-pcards-doc[data-style="editorial"] .card-qr-wrap .qr-mark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 8mm; height: 8mm; background: var(--paper); border-radius: 1.5mm; padding: 1mm; box-shadow: 0 0 0 1mm var(--paper); }

/* Dark */
.orvexa-pcards-doc[data-style="dark"] .orvexa-pcards-card { background: var(--ink); color: var(--paper-warm); padding: 11mm 9mm; align-items: center; gap: 3mm; }
.orvexa-pcards-doc[data-style="dark"] .orvexa-pcards-card::before,
.orvexa-pcards-doc[data-style="dark"] .orvexa-pcards-card::after,
.orvexa-pcards-doc[data-style="dark"] .orvexa-pcards-card > .cut-tr,
.orvexa-pcards-doc[data-style="dark"] .orvexa-pcards-card > .cut-bl { border-color: var(--saffron); opacity: 0.6; }
.orvexa-pcards-doc[data-style="dark"] .card-top { width: 100%; display: flex; justify-content: space-between; align-items: center; }
.orvexa-pcards-doc[data-style="dark"] .card-brand { color: var(--paper-warm); }
.orvexa-pcards-doc[data-style="dark"] .card-table { font-family: var(--font-mono); font-size: 8pt; letter-spacing: 1.4px; text-transform: uppercase; color: var(--saffron); background: rgba(217,122,44,0.16); padding: 1mm 2mm; border-radius: 1mm; }
.orvexa-pcards-doc[data-style="dark"] .card-qr-wrap { position: relative; width: 58mm; height: 58mm; margin-top: 2mm; background: var(--paper); padding: 3mm; border-radius: 2mm; }
.orvexa-pcards-doc[data-style="dark"] .card-qr-wrap .qr-mark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 13mm; height: 13mm; background: var(--paper); border-radius: 2mm; padding: 1.4mm; box-shadow: 0 0 0 1.2mm var(--paper); }
.orvexa-pcards-doc[data-style="dark"] .card-instr { font-family: var(--font-display); font-style: italic; font-size: 18pt; color: var(--paper-warm); letter-spacing: -0.4pt; margin-top: 2mm; text-align: center; }
.orvexa-pcards-doc[data-style="dark"] .card-rule { width: 12mm; height: 0.3mm; background: var(--saffron); margin: 1mm 0; }
.orvexa-pcards-doc[data-style="dark"] .card-sub { font-family: var(--font-mono); font-size: 7pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(245,239,230,0.55); text-align: center; }
.orvexa-pcards-doc[data-style="dark"] .card-foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: center; padding-top: 2mm; border-top: 0.2mm solid rgba(245,239,230,0.12); font-family: var(--font-mono); font-size: 6pt; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(245,239,230,0.45); }
.orvexa-pcards-doc[data-style="dark"] .card-foot b { color: var(--saffron); }

/* WiFi block — prominent access section */
.orvexa-pcards-card .card-wifi {
  width: 100%;
  padding: 2mm 2.5mm;
  border-radius: 1.5mm;
  background: rgba(217,122,44,0.10);
  border-left: 1.2mm solid var(--saffron);
  font-family: var(--font-mono);
  display: flex; flex-direction: column; gap: 1mm;
}
.orvexa-pcards-card .card-wifi__row { display: flex; align-items: flex-start; gap: 2mm; }
.orvexa-pcards-card .card-wifi__icon { display: inline-flex; width: 4mm; height: 4mm; flex-shrink: 0; margin-top: 0.3mm; color: var(--saffron); }
.orvexa-pcards-card .card-wifi__icon svg { width: 100%; height: 100%; }
.orvexa-pcards-card .card-wifi__fields { display: flex; flex-direction: column; gap: 0.8mm; flex: 1; overflow: hidden; }
.orvexa-pcards-card .card-wifi__field { display: flex; align-items: baseline; gap: 1.5mm; }
.orvexa-pcards-card .card-wifi__lbl { font-size: 5.5pt; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(25,20,14,0.45); white-space: nowrap; }
.orvexa-pcards-card .card-wifi__val { font-size: 7.5pt; font-weight: 600; color: var(--ink); letter-spacing: 0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.orvexa-pcards-card .card-wifi__pass { color: var(--saffron-deep); letter-spacing: 1.2px; }
.orvexa-pcards-card .card-wifi__or { font-size: 6pt; letter-spacing: 1px; text-transform: uppercase; color: rgba(25,20,14,0.45); padding-left: 6mm; }
.orvexa-pcards-doc[data-style="dark"] .card-wifi { background: rgba(217,122,44,0.12); border-left-color: var(--saffron); }
.orvexa-pcards-doc[data-style="dark"] .card-wifi__lbl { color: rgba(245,239,230,0.4); }
.orvexa-pcards-doc[data-style="dark"] .card-wifi__val { color: var(--paper-warm); }
.orvexa-pcards-doc[data-style="dark"] .card-wifi__pass { color: var(--saffron); }
.orvexa-pcards-doc[data-style="dark"] .card-wifi__or { color: rgba(245,239,230,0.35); }
.orvexa-pcards-doc[data-style="saffron"] .card-wifi { background: rgba(25,20,14,0.06); border-left-color: var(--ink); }
.orvexa-pcards-doc[data-style="saffron"] .card-wifi__lbl { color: rgba(25,20,14,0.4); }

@media print {
  @page { size: A4 portrait; margin: 0; }
  body { background: #fff; }
  .orvexa-pcards-doc { padding: 0; gap: 0; }
  .orvexa-pcards-sheet { box-shadow: none; margin: 0; page-break-after: always; break-after: page; }
  .orvexa-pcards-sheet:last-child { page-break-after: avoid; break-after: avoid; }
  .orvexa-pcards-sheet-lbl { display: none; }
}
`;
