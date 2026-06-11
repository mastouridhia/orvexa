import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Order, TableWithDerived, TableZone, WaiterCall } from '@orvexa/shared';
import {
  indexCallsByTable,
  pickActiveOrder,
  pickActiveOrders,
  visualStateOf,
  type WaiterVisualState,
} from '../utils/waiter.js';

import { IconChevronRight } from './tf-icons.js';

const STATE_PRIORITY: Record<WaiterVisualState, number> = {
  call: 0,
  needs_code: 1,
  ready: 2,
  paying: 3,
  cooking: 4,
  ordered: 5,
  eating: 6,
  seated: 7,
  clean: 8,
  open: 9,
};

export function TablesList({
  tables,
  zones,
  orders,
  calls,
  now,
  onOpen,
}: {
  tables: TableWithDerived[];
  zones: TableZone[];
  orders: Order[];
  calls: WaiterCall[];
  now: number;
  onOpen: (tableId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const callsByTable = useMemo(() => indexCallsByTable(calls), [calls]);

  // Group strictly by `zoneId`. Tables without a zone fall under "Unassigned"
  // so they're never invisible. Zone display order follows the zones[] sort,
  // which the API already returns sorted by sort_order then name.
  const grouped = useMemo(() => {
    const buckets: Array<[string, TableWithDerived[]]> = [];
    const byZoneId = new Map<string, TableWithDerived[]>();
    for (const tbl of tables) {
      const key = tbl.zoneId ?? '__unassigned__';
      const list = byZoneId.get(key) ?? [];
      list.push(tbl);
      byZoneId.set(key, list);
    }

    const sortByUrgency = (list: TableWithDerived[]) =>
      [...list].sort((a, b) => {
        const sa = visualStateOf(a, pickActiveOrders(orders, a.id), callsByTable.get(a.id) ?? null);
        const sb = visualStateOf(b, pickActiveOrders(orders, b.id), callsByTable.get(b.id) ?? null);
        return STATE_PRIORITY[sa] - STATE_PRIORITY[sb];
      });

    for (const z of zones) {
      const list = byZoneId.get(z.id);
      if (list && list.length > 0) buckets.push([z.name, sortByUrgency(list)]);
    }
    const unassigned = byZoneId.get('__unassigned__');
    if (unassigned && unassigned.length > 0) {
      buckets.push([t('tables.zones.unassigned'), sortByUrgency(unassigned)]);
    }
    return buckets;
  }, [tables, zones, orders, callsByTable, t]);

  const totalLabel = t('tables.totalCount', { count: tables.length });
  const dateNow = new Date(now).toLocaleTimeString(i18n.resolvedLanguage ?? 'fr', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="tf-w-tables">
      <header className="tf-w-tables__head">
        <div className="tf-caption">{totalLabel}</div>
        <div className="tf-w-tables__head-row">
          <h1 className="tf-w-tables__title">{t('tables.title')}</h1>
          <span className="tf-mono tf-w-tables__clock">{dateNow}</span>
        </div>
      </header>
      {tables.length === 0 ? (
        <div className="tf-w-tables__empty">
          <p>{t('tables.empty', { defaultValue: 'No tables configured yet. Add tables from the admin panel.' })}</p>
        </div>
      ) : null}
      {grouped.map(([zone, list]) => (
        <section className="tf-w-tables__zone" key={zone}>
          <div className="tf-caption tf-w-tables__zone-label">{zone}</div>
          <div className="tf-w-tables__zone-card">
            {list.map((table, idx) => {
              const order = pickActiveOrder(orders, table.id);
              const call = callsByTable.get(table.id) ?? null;
              const state: WaiterVisualState = visualStateOf(table, order ? [order] : [], call);
              const minsInOrder = order
                ? Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000))
                : 0;
              const showMins = ['ordered', 'cooking', 'paying'].includes(state) && minsInOrder > 0;
              const alertClass =
                state === 'call'
                  ? 'is-alert is-alert--call'
                  : state === 'needs_code'
                    ? 'is-alert is-alert--needs_code'
                    : state === 'ready'
                      ? 'is-alert is-alert--ready'
                      : state === 'paying'
                        ? 'is-alert is-alert--paying'
                        : '';
              return (
                <button
                  key={table.id}
                  type="button"
                  className={[
                    'tf-w-tables__row',
                    idx === list.length - 1 ? 'is-last' : '',
                    alertClass,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onOpen(table.id)}
                >
                  <span className={`tf-w-tables__chip tf-w-floor__dot--${state}`}>
                    {shortLabel(table.label)}
                  </span>
                  <span className="tf-w-tables__row-body">
                    <span className="tf-w-tables__row-name">
                      {t('tables.row.name', { label: table.label })}{' '}
                      <span className="tf-w-tables__row-pax">
                        · {t('tables.row.pax', { count: table.seats })}
                      </span>
                    </span>
                    <span className="tf-mono tf-w-tables__row-meta">
                      {t(`state.${state}`)}
                      {showMins ? ` · ${minsInOrder}m` : ''}
                    </span>
                  </span>
                  <IconChevronRight />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function shortLabel(label: string): string {
  const digits = label.match(/\d+/);
  if (digits) return digits[0];
  return label.slice(0, 2);
}
