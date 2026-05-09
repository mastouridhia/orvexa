import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Order, TableWithDerived, TableZone, WaiterCall } from '@orvexa/shared';
import {
  indexCallsByTable,
  pickActiveOrder,
  visualStateOf,
  type WaiterVisualState,
} from '../utils/waiter.js';
import { IconChevronRight } from './tf-icons.js';

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
    for (const z of zones) {
      const list = byZoneId.get(z.id);
      if (list && list.length > 0) buckets.push([z.name, list]);
    }
    const unassigned = byZoneId.get('__unassigned__');
    if (unassigned && unassigned.length > 0) {
      buckets.push([t('tables.zones.unassigned'), unassigned]);
    }
    return buckets;
  }, [tables, zones, t]);

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
      {grouped.map(([zone, list]) => (
        <section className="tf-w-tables__zone" key={zone}>
          <div className="tf-caption tf-w-tables__zone-label">{zone}</div>
          <div className="tf-w-tables__zone-card">
            {list.map((table, idx) => {
              const order = pickActiveOrder(orders, table.id);
              const call = callsByTable.get(table.id) ?? null;
              const state: WaiterVisualState = visualStateOf(
                table,
                order ? [order] : [],
                call,
              );
              const minsInOrder = order
                ? Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000))
                : 0;
              const showMins = ['ordered', 'cooking', 'paying'].includes(state) && minsInOrder > 0;
              const alertClass =
                state === 'call'
                  ? 'is-alert is-alert--call'
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
