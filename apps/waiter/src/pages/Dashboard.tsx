import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  LanguageCode,
  Order,
  OrderStatus,
  TableStatus,
  TableWithDerived,
  TableZone,
  WaiterCall,
} from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { connectStaffSocket } from '../socket/client.js';
import { setDocumentLocale } from '@orvexa/ui';
import { FloorView } from '../components/FloorView.js';
import { CallsView, WaiterEmptyCalls } from '../components/CallsView.js';
import { TablesList } from '../components/TablesList.js';
import { TableDetail } from '../components/TableDetail.js';
import { TabBar, type WaiterTab } from '../components/TabBar.js';
import { IconLogout, IconSettings } from '../components/tf-icons.js';
import { indexCallsByTable, pickActiveOrder } from '../utils/waiter.js';

const ACTIVE_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready'];

/**
 * Shift-start gate is in-memory only — shown once per page load. Persisting it
 * to localStorage would feel sticky in dev; the design intent is "once per
 * shift," so we'll wire to a real `GET /staff/me/shift` later when that exists.
 */
export function Dashboard() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [tables, setTables] = useState<TableWithDerived[]>([]);
  const [zones, setZones] = useState<TableZone[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [busyCallId, setBusyCallId] = useState<string | null>(null);
  const [tab, setTab] = useState<WaiterTab>('floor');
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 1-second tick — keeps call ages + table-mins counters live.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // initial load
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const [tbls, zns, ords, cls] = await Promise.all([
          authedFetch((tk) => api.listTables(tk)),
          authedFetch((tk) => api.listTableZones(tk)),
          authedFetch((tk) => api.listActiveOrders(tk)),
          authedFetch((tk) => api.listOpenWaiterCalls(tk)),
        ]);
        if (cancelled) return;
        setTables(tbls);
        setZones(zns);
        setActiveOrders(ords);
        setCalls(cls);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authedFetch]);

  // sockets
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectStaffSocket(accessToken);

    const onOrderCreated = (payload: { order: Order }) => {
      setActiveOrders((prev) => {
        if (prev.some((o) => o.id === payload.order.id)) return prev;
        return [payload.order, ...prev];
      });
    };
    const onOrderStatus = (payload: { orderId: string; status: OrderStatus }) => {
      setActiveOrders((prev) =>
        prev
          .map((o) => (o.id === payload.orderId ? { ...o, status: payload.status } : o))
          .filter((o) => ACTIVE_STATUSES.includes(o.status)),
      );
    };
    const onTableStatus = (payload: { tableId: string; status: TableStatus }) => {
      setTables((prev) =>
        prev.map((tbl) => (tbl.id === payload.tableId ? { ...tbl, derivedStatus: payload.status } : tbl)),
      );
    };
    const onWaiterCalled = () => {
      void authedFetch((tk) => api.listOpenWaiterCalls(tk))
        .then((list) => setCalls(list))
        .catch(() => undefined);
    };

    socket.on('order:created', onOrderCreated);
    socket.on('order:status', onOrderStatus);
    socket.on('table:status', onTableStatus);
    socket.on('waiter:called', onWaiterCalled);
    socket.on('bill:requested', onWaiterCalled);
    return () => {
      socket.off('order:created', onOrderCreated);
      socket.off('order:status', onOrderStatus);
      socket.off('table:status', onTableStatus);
      socket.off('waiter:called', onWaiterCalled);
      socket.off('bill:requested', onWaiterCalled);
    };
  }, [accessToken, authedFetch]);

  const ackCall = useCallback(
    async (id: string) => {
      setBusyCallId(id);
      try {
        await authedFetch((tk) => api.clearWaiterCall(tk, id));
        setCalls((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        setBusyCallId(null);
      }
    },
    [authedFetch],
  );

  const onCallCleared = useCallback((id: string) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const onOrderChange = useCallback((next: Order | null) => {
    if (!next) return;
    setActiveOrders((prev) => {
      const without = prev.filter((o) => o.id !== next.id);
      if (ACTIVE_STATUSES.includes(next.status)) return [next, ...without];
      return without;
    });
  }, []);

  const callsByTable = useMemo(() => indexCallsByTable(calls), [calls]);

  const openTable = useMemo(
    () => (openTableId ? tables.find((tt) => tt.id === openTableId) ?? null : null),
    [openTableId, tables],
  );
  const openTableOrder = useMemo(
    () => (openTableId ? pickActiveOrder(activeOrders, openTableId) : null),
    [openTableId, activeOrders],
  );
  const openTableCall = useMemo(
    () => (openTableId ? callsByTable.get(openTableId) ?? null : null),
    [openTableId, callsByTable],
  );

  return (
    <div className="app-shell">
      <header className="tf-w-topbar">
        <div className="tf-w-topbar__brand">
          <span className="tf-w-topbar__brand-name">Orvexa</span>
          <span className="tf-w-topbar__brand-sub">{t('topbar.sub')}</span>
        </div>
        <button
          type="button"
          className="tf-w-topbar__logout"
          onClick={() => setSettingsOpen(true)}
          title={t('header.settings')}
          aria-label={t('header.settings')}
        >
          <IconSettings />
        </button>
      </header>

      {settingsOpen && (
        <>
          <div
            className="tf-w-settings-backdrop"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="tf-w-settings" role="dialog" aria-label={t('settings.title')}>
            <div className="tf-w-settings__handle" />
            <div className="tf-w-settings__head">
              <h2 className="tf-w-settings__title">{t('settings.title')}</h2>
              <button
                type="button"
                className="tf-w-settings__close"
                onClick={() => setSettingsOpen(false)}
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>

            <div className="tf-w-settings__section">
              <span className="tf-caption">{t('settings.language')}</span>
              <p className="tf-w-settings__hint">{t('settings.languageHint')}</p>
              <div className="tf-w-settings__langs">
                {([
                  { code: 'fr' as LanguageCode, flag: '🇫🇷', label: 'Français',  sub: 'French'  },
                  { code: 'ar' as LanguageCode, flag: '🇸🇦', label: 'العربية',   sub: 'Arabic'  },
                  { code: 'en' as LanguageCode, flag: '🇬🇧', label: 'English',   sub: 'English' },
                ]).map(({ code, flag, label, sub }) => {
                  const active = lang === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      dir={code === 'ar' ? 'rtl' : 'ltr'}
                      className={`tf-w-settings__lang${active ? ' is-active' : ''}`}
                      onClick={() => {
                        void i18n.changeLanguage(code);
                        setDocumentLocale(code);
                      }}
                    >
                      <span className="tf-w-settings__lang-flag">{flag}</span>
                      <span className="tf-w-settings__lang-name">{label}</span>
                      <span className="tf-w-settings__lang-sub">{sub}</span>
                      {active && <span className="tf-w-settings__lang-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tf-w-settings__footer">
              <span className="tf-w-settings__email">{user?.email}</span>
              <button
                type="button"
                className="tf-w-settings__logout"
                onClick={logout}
              >
                <IconLogout />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {error ? (
        <div style={{ padding: '0 1rem' }}>
          <div className="error-banner">{error}</div>
        </div>
      ) : null}

      <div className="tf-w-body">
        {tab === 'floor' && (
          <FloorView
            tables={tables}
            zones={zones}
            orders={activeOrders}
            calls={calls}
            now={now}
            meEmail={user?.email ?? null}
            onOpen={(id) => setOpenTableId(id)}
          />
        )}
        {tab === 'calls' &&
          (loading ? (
            <WaiterEmptyCalls />
          ) : (
            <CallsView
              calls={calls}
              tables={tables}
              now={now}
              busyCallId={busyCallId}
              onAck={ackCall}
              onOpenTable={(id) => setOpenTableId(id)}
            />
          ))}
        {tab === 'tables' && (
          <TablesList
            tables={tables}
            zones={zones}
            orders={activeOrders}
            calls={calls}
            now={now}
            onOpen={(id) => setOpenTableId(id)}
          />
        )}
      </div>

      <TabBar tab={tab} setTab={setTab} callCount={calls.length} />

      {openTable ? (
        <TableDetail
          table={openTable}
          order={openTableOrder}
          call={openTableCall}
          lang={lang}
          now={now}
          onClose={() => setOpenTableId(null)}
          onOrderChange={onOrderChange}
          onCallCleared={onCallCleared}
        />
      ) : null}
    </div>
  );
}
