import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, OrderStatus, TableWithDerived, WaiterCall } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { ReceiptModal } from '../components/ReceiptModal.js';
import { useAuthStore } from '../store/auth.js';
import { connectAdminSocket } from '../socket/client.js';
import { formatDateTime, formatMillimes, pickLang } from '../utils/format.js';

type StatusFilter = 'all' | OrderStatus;

const ACTIVE_SECTIONS: { status: OrderStatus; next: OrderStatus; tone: string }[] = [
  { status: 'received', next: 'preparing', tone: 'new' },
  { status: 'preparing', next: 'ready', tone: 'prep' },
  { status: 'ready', next: 'served', tone: 'ready' },
];

/** Short "x min ago" label without pulling in a date lib. */
function useTimeAgo() {
  const { t } = useTranslation();
  return useCallback(
    (iso: string, now: number) => {
      const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
      if (mins < 1) return t('orders.board.justNow');
      if (mins < 60) return t('orders.board.minAgo', { m: mins });
      return t('orders.board.hrAgo', { h: Math.floor(mins / 60) });
    },
    [t],
  );
}

// One shared AudioContext, reused across beeps. Browsers start it 'suspended'
// until a user gesture, so we resume it on the first interaction (see unlockAudio).
let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedCtx = new Ctx();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Resume the audio context — call from a user gesture so later beeps can play. */
function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

/** Two short rising beeps so a new order is noticeable across the room. */
function beep() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const tones = [880, 1175];
    tones.forEach((freq, i) => {
      const t0 = ctx.currentTime + i * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
  } catch {
    /* audio blocked — silently ignore */
  }
}

/** Fire an OS/browser notification (best-effort; no-op without permission). */
function notify(title: string, body: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, { body, tag: 'orvexa-orders', renotify: true } as NotificationOptions);
    setTimeout(() => n.close(), 8000);
  } catch {
    /* notifications unsupported / blocked — ignore */
  }
}

function OrderCard({
  order,
  tableLabel,
  next,
  tone,
  lang,
  busy,
  timeAgo,
  now,
  onAdvance,
  onReceipt,
  t,
}: {
  order: Order;
  tableLabel: string;
  next: OrderStatus;
  tone: string;
  lang: LanguageCode;
  busy: boolean;
  timeAgo: (iso: string, now: number) => string;
  now: number;
  onAdvance: (id: string, to: OrderStatus) => void;
  onReceipt: (id: string) => void;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const cancellable = order.status === 'received' || order.status === 'preparing';
  return (
    <div className={`ord-card ord-card--${tone}`}>
      <div className="ord-card__top">
        <span className="ord-card__table">
          {t('orders.board.table')} {tableLabel}
          {order.round > 1 ? <span className="ord-card__round"> · {t('orders.board.round', { n: order.round })}</span> : null}
        </span>
        <span className="ord-card__time">{timeAgo(order.createdAt, now)}</span>
      </div>
      <ul className="ord-card__items">
        {order.items.map((it) => (
          <li key={it.id}>
            <span className="ord-card__qty">{it.quantity}×</span> {pickLang(it.nameSnapshot, lang)}
            {it.notes ? <span className="ord-card__note"> — {it.notes}</span> : null}
          </li>
        ))}
      </ul>
      <div className="ord-card__bottom">
        <span className="ord-card__total">{formatMillimes(order.totalMillimes)}</span>
        <div className="ord-card__actions">
          <button type="button" className="btn btn-sm ord-card__receipt" onClick={() => onReceipt(order.id)}>
            {t('orders.viewReceipt')}
          </button>
          {cancellable ? (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={busy}
              onClick={() => onAdvance(order.id, 'cancelled')}
            >
              {t('orders.advance.cancelled')}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary ord-card__advance"
            disabled={busy}
            onClick={() => onAdvance(order.id, next)}
          >
            {t(`orders.advance.${next}`)} →
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrdersExplorer() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const accessToken = useAuthStore((s) => s.accessToken);
  const timeAgo = useTimeAgo();

  const [active, setActive] = useState<Order[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [busyCallId, setBusyCallId] = useState<string | null>(null);
  const [tables, setTables] = useState<TableWithDerived[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('orders.sound') !== 'off');
  const knownIds = useRef<Set<string>>(new Set());
  const tablesRef = useRef<TableWithDerived[]>([]);

  // History (collapsed) — paginated, filterable.
  const [histStatus, setHistStatus] = useState<StatusFilter>('all');
  const [histPage, setHistPage] = useState(1);
  const histPageSize = 20;
  const [histRows, setHistRows] = useState<Order[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histOpen, setHistOpen] = useState(false);

  const loadActive = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const list = await authedFetch((tk) => api.listActiveOrders(tk));
        // Detect genuinely new orders (not on first load) to alert.
        const incoming = list.filter((o) => o.status === 'received' && !knownIds.current.has(o.id));
        if (!opts?.silent && knownIds.current.size > 0 && incoming.length > 0 && soundOn) {
          beep();
          const where =
            tablesRef.current.find((tb) => tb.id === incoming[0].tableId)?.label ?? '';
          notify(
            t('orders.notify.title'),
            incoming.length === 1
              ? where
                ? t('orders.notify.newOrderAt', { table: where })
                : t('orders.notify.newOrder')
              : t('orders.notify.newOrders', { count: incoming.length }),
          );
        }
        knownIds.current = new Set(list.map((o) => o.id));
        setActive(list);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [authedFetch, soundOn, t],
  );

  const loadTables = useCallback(async () => {
    try {
      const list = await authedFetch((tk) => api.listTables(tk));
      setTables(list);
      tablesRef.current = list;
    } catch {
      /* table list is non-fatal — labels/occupancy just stay as-is */
    }
  }, [authedFetch]);

  const loadCalls = useCallback(async () => {
    try {
      const list = await authedFetch((tk) => api.listWaiterCalls(tk));
      setCalls(list);
    } catch {
      /* non-fatal — calls strip just stays as-is */
    }
  }, [authedFetch]);

  const clearCall = useCallback(
    async (id: string) => {
      setBusyCallId(id);
      try {
        await authedFetch((tk) => api.clearWaiterCall(tk, id));
        setCalls((cs) => cs.filter((c) => c.id !== id));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setBusyCallId(null);
      }
    },
    [authedFetch],
  );

  // Initial: tables (labels + occupancy) + first active load (silent so it doesn't beep).
  useEffect(() => {
    void loadTables();
    void loadActive({ silent: true });
    void loadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch]);

  // Live updates.
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectAdminSocket(accessToken);
    const refreshOrders = () => {
      void loadActive();
      void loadTables();
    };
    // Resolve a table's label from the freshest list (ref avoids a stale closure).
    const labelOf = (tableId: string) =>
      tablesRef.current.find((tb) => tb.id === tableId)?.label ?? tableId.slice(0, 4);
    const alert = (body: string) => {
      if (!soundOn) return;
      beep();
      notify(t('orders.notify.title'), body);
    };
    const onWaiterCall = (payload?: { tableId?: string }) => {
      const where = payload?.tableId ? labelOf(payload.tableId) : '';
      alert(where ? t('orders.notify.callAt', { table: where }) : t('orders.notify.call'));
      void loadCalls();
    };
    const onBillRequest = (payload?: { tableId?: string }) => {
      const where = payload?.tableId ? labelOf(payload.tableId) : '';
      alert(where ? t('orders.notify.billAt', { table: where }) : t('orders.notify.bill'));
      void loadCalls();
    };
    const onTableStatus = () => void loadTables();
    socket.on('order:created', refreshOrders);
    socket.on('order:status', refreshOrders);
    socket.on('table:status', onTableStatus);
    socket.on('waiter:called', onWaiterCall);
    socket.on('bill:requested', onBillRequest);
    return () => {
      socket.off('order:created', refreshOrders);
      socket.off('order:status', refreshOrders);
      socket.off('table:status', onTableStatus);
      socket.off('waiter:called', onWaiterCall);
      socket.off('bill:requested', onBillRequest);
    };
  }, [accessToken, loadActive, loadTables, loadCalls, soundOn, t]);

  // Tick the clock so "x min ago" stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Browsers block audio until a user gesture: unlock on the first interaction
  // so alerts play even if the operator never touches the sound toggle. Also
  // (re)request notification permission when alerts are already enabled.
  useEffect(() => {
    if (soundOn && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    const onGesture = () => unlockAudio();
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [soundOn]);

  // History loader (only when opened / changed).
  const loadHistory = useCallback(async () => {
    try {
      const data = await authedFetch((tk) =>
        api.listOrders(tk, {
          status: histStatus === 'all' ? undefined : histStatus,
          page: histPage,
          pageSize: histPageSize,
        }),
      );
      setHistRows(data.orders);
      setHistTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [authedFetch, histStatus, histPage]);

  useEffect(() => {
    if (histOpen) void loadHistory();
  }, [histOpen, loadHistory]);

  const advance = useCallback(
    async (orderId: string, to: OrderStatus) => {
      setPendingId(orderId);
      try {
        await authedFetch((tk) => api.updateOrderStatus(tk, orderId, to));
        await loadActive({ silent: true });
        if (histOpen) await loadHistory();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [authedFetch, loadActive, loadHistory, histOpen],
  );

  // Plus has no waiter app: the admin frees a table straight from the inbox when
  // a guest orders and leaves. Cancels every still-active order on that table,
  // then clears the table (ends the guest session, wipes cart + ordering code).
  const freeTable = useCallback(
    async (tableId: string) => {
      if (!window.confirm(t('orders.freeTableConfirm'))) return;
      setPendingId(tableId);
      try {
        const stillActive = active.filter(
          (o) =>
            o.tableId === tableId &&
            (o.status === 'received' || o.status === 'preparing' || o.status === 'ready'),
        );
        for (const o of stillActive) {
          await authedFetch((tk) => api.updateOrderStatus(tk, o.id, 'cancelled'));
        }
        await authedFetch((tk) => api.markTableClean(tk, tableId));
        await Promise.all([loadActive({ silent: true }), loadTables()]);
        if (histOpen) await loadHistory();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [active, authedFetch, loadActive, loadTables, loadHistory, histOpen, t],
  );

  const toggleSound = () => {
    setSoundOn((s) => {
      const next = !s;
      localStorage.setItem('orders.sound', next ? 'on' : 'off');
      // Turning alerts on is a user gesture — unlock audio now and ask for
      // notification permission so the very next order both beeps and pops.
      if (next) {
        unlockAudio();
        if ('Notification' in window && Notification.permission === 'default') {
          void Notification.requestPermission();
        }
      }
      return next;
    });
  };

  const labelFor = (id: string) => tables.find((tb) => tb.id === id)?.label ?? id.slice(0, 4);
  const histPages = Math.max(1, Math.ceil(histTotal / histPageSize));

  const grouped = useMemo(
    () =>
      ACTIVE_SECTIONS.map((sec) => ({
        ...sec,
        orders: active.filter((o) => o.status === sec.status),
      })),
    [active],
  );

  // Tables currently occupied — a guest scanned/used them and they haven't been
  // freed. Sticks across the whole order lifecycle (incl. served) so the operator
  // always has a "Free table" affordance, even after the order leaves the board.
  const occupied = useMemo(
    () =>
      tables
        .filter((tb) => tb.inUse || tb.derivedStatus !== 'free')
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tables],
  );

  return (
    <>
      <div className="ord-head">
        <h1 className="page-title">{t('orders.title')}</h1>
        <div className="ord-head__right">
          {active.length > 0 ? (
            <span className="ord-live">
              <span className="ord-live__dot" />
              {t('orders.board.live', { count: active.length })}
            </span>
          ) : null}
          <button type="button" className="btn btn-sm" onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? `🔔 ${t('orders.board.soundOn')}` : `🔕 ${t('orders.board.soundOff')}`}
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {calls.length > 0 ? (
        <div className="ord-calls">
          <div className="ord-calls__head">
            🛎 {t('orders.calls.heading')} <span className="ord-calls__count">{calls.length}</span>
          </div>
          <div className="ord-calls__list">
            {[...calls]
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              .map((c) => (
                <div key={c.id} className="ord-call">
                  <div className="ord-call__info">
                    <span className="ord-call__table">
                      {t('orders.board.table')} {labelFor(c.tableId)}
                    </span>
                    <span className="ord-call__kind">{t(`orders.calls.kind.${c.kind}`)}</span>
                    <span className="ord-call__age">{timeAgo(c.createdAt, now)}</span>
                    {c.note ? <span className="ord-call__note">— {c.note}</span> : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={busyCallId === c.id}
                    onClick={() => clearCall(c.id)}
                  >
                    ✓ {t('orders.calls.done')}
                  </button>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {occupied.length > 0 ? (
        <div className="ord-tables">
          <div className="ord-tables__head">
            🍽 {t('orders.tablesInUse')} <span className="ord-tables__count">{occupied.length}</span>
          </div>
          <div className="ord-tables__list">
            {occupied.map((tb) => (
              <div key={tb.id} className="ord-table">
                <div className="ord-table__info">
                  <span className="ord-table__label">
                    {t('orders.board.table')} {tb.label}
                  </span>
                  {tb.seatedAt ? (
                    <span className="ord-table__age">{timeAgo(tb.seatedAt, now)}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn btn-sm ord-table__free"
                  disabled={pendingId === tb.id}
                  onClick={() => freeTable(tb.id)}
                  title={t('orders.freeTableHint')}
                >
                  {pendingId === tb.id ? t('common.loading') : t('orders.freeTable')}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="muted">{t('common.loading')}</div>
      ) : active.length === 0 ? (
        <div className="ord-empty">
          <p className="ord-empty__title">{t('orders.board.empty')}</p>
          <p className="muted">{t('orders.board.emptyHint')}</p>
        </div>
      ) : (
        <div className="ord-board">
          {grouped.map((sec) =>
            sec.orders.length === 0 ? null : (
              <section key={sec.status} className="ord-col">
                <h2 className={`ord-col__head ord-col__head--${sec.tone}`}>
                  {t(`orders.board.${sec.status === 'received' ? 'new' : sec.status}`)}
                  <span className="ord-col__count">{sec.orders.length}</span>
                </h2>
                <div className="ord-col__cards">
                  {sec.orders.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      tableLabel={labelFor(o.tableId)}
                      next={sec.next}
                      tone={sec.tone}
                      lang={lang}
                      busy={pendingId === o.id}
                      timeAgo={timeAgo}
                      now={now}
                      onAdvance={advance}
                      onReceipt={setReceiptOrderId}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}

      {/* History — collapsed by default so live orders aren't buried. */}
      <details className="ord-history" open={histOpen} onToggle={(e) => setHistOpen(e.currentTarget.open)}>
        <summary className="ord-history__summary">{t('orders.board.history')}</summary>
        <div className="row-gap row-wrap" style={{ margin: '1rem 0' }}>
          <label>
            {t('orders.status')}
            <select
              value={histStatus}
              onChange={(e) => {
                setHistStatus(e.target.value as StatusFilter);
                setHistPage(1);
              }}
            >
              {(['all', 'received', 'preparing', 'ready', 'served', 'cancelled'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`orders.filter.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {histRows.length === 0 ? (
          <div className="muted">{t('orders.empty')}</div>
        ) : (
          <table className="dt">
            <thead>
              <tr>
                <th>{t('orders.created')}</th>
                <th>{t('orders.table')}</th>
                <th>{t('orders.status')}</th>
                <th className="right">{t('orders.total')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {histRows.map((o) => (
                <tr key={o.id}>
                  <td>{formatDateTime(o.createdAt, lang)}</td>
                  <td>{labelFor(o.tableId)}</td>
                  <td>{t(`orders.filter.${o.status}`)}</td>
                  <td className="right">{formatMillimes(o.totalMillimes)}</td>
                  <td className="right">
                    <button type="button" className="btn btn-sm" onClick={() => setReceiptOrderId(o.id)}>
                      {t('orders.viewReceipt')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="row-gap" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-sm"
            disabled={histPage <= 1}
            onClick={() => setHistPage((p) => Math.max(1, p - 1))}
          >
            {t('orders.prev')}
          </button>
          <span className="muted">{t('orders.page', { page: histPage, pages: histPages })}</span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={histPage >= histPages}
            onClick={() => setHistPage((p) => p + 1)}
          >
            {t('orders.next')}
          </button>
        </div>
      </details>

      {receiptOrderId ? (
        <ReceiptModal orderId={receiptOrderId} lang={lang} onClose={() => setReceiptOrderId(null)} />
      ) : null}
    </>
  );
}
