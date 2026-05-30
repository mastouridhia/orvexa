import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Order, TableWithDerived, TableZone, WaiterCall } from '@orvexa/shared';
import {
  autoPosition,
  callAgeSeconds,
  callUrgency,
  indexCallsByTable,
  pickActiveOrder,
  pickActiveOrders,
  secondaryVisualState,
  visualStateOf,
  type WaiterVisualState,
} from '../utils/waiter.js';
import { IconBellRing, IconHash } from './tf-icons.js';

// ── Types ──────────────────────────────────────────────────────────────────
const STATE_ORDER: WaiterVisualState[] = [
  'call',
  'needs_code',
  'ready',
  'cooking',
  'ordered',
  'eating',
  'seated',
  'paying',
  'clean',
  'open',
];

const ALL_ZONE_KEY = '__all__';
const UNASSIGNED_KEY = '__unassigned__';
const DECOR_STORAGE_KEY = 'tf:floor-decor-v1';

type DecorType =
  | 'wall-h'
  | 'wall-v'
  | 'divider-h'
  | 'divider-v'
  | 'garden'
  | 'pillar'
  | 'stairs'
  | 'bar';

interface DecorItem {
  id: string;
  type: DecorType;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function loadDecor(): DecorItem[] {
  try {
    const raw = localStorage.getItem(DECOR_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DecorItem[]) : [];
  } catch {
    return [];
  }
}

function shortLabel(label: string): string {
  const digits = label.match(/\d+/);
  return digits ? digits[0] : label.slice(0, 2);
}

// ── Component ──────────────────────────────────────────────────────────────
export function FloorView({
  tables,
  zones,
  orders,
  calls,
  now,
  meEmail,
  onOpen,
}: {
  tables: TableWithDerived[];
  zones: TableZone[];
  orders: Order[];
  calls: WaiterCall[];
  now: number;
  meEmail: string | null;
  onOpen: (tableId: string) => void;
}) {
  const { t } = useTranslation();
  const callsByTable = useMemo(() => indexCallsByTable(calls), [calls]);

  // Decor from localStorage (shared with admin when same origin)
  const [decor] = useState<DecorItem[]>(loadDecor);

  // Zone tabs — each zone with at least one table, plus All when there are multiple
  const zonesWithTables = useMemo(
    () => zones.filter((z) => tables.some((tb) => tb.zoneId === z.id)),
    [zones, tables],
  );
  const hasUnassigned = tables.some((tb) => tb.zoneId === null);

  const zoneTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string }> = [];
    for (const z of zonesWithTables) tabs.push({ key: z.id, label: z.name });
    if (hasUnassigned) tabs.push({ key: UNASSIGNED_KEY, label: t('floor.zones.unassigned') });
    if (tabs.length > 1) tabs.unshift({ key: ALL_ZONE_KEY, label: t('floor.zones.all') });
    return tabs;
  }, [zonesWithTables, hasUnassigned, t]);

  const [activeZone, setActiveZone] = useState<string>(
    () => zonesWithTables[0]?.id ?? (hasUnassigned ? UNASSIGNED_KEY : ALL_ZONE_KEY),
  );

  useEffect(() => {
    if (activeZone === ALL_ZONE_KEY) return;
    if (activeZone === UNASSIGNED_KEY && hasUnassigned) return;
    if (zonesWithTables.some((z) => z.id === activeZone)) return;
    queueMicrotask(() =>
      setActiveZone(zonesWithTables[0]?.id ?? (hasUnassigned ? UNASSIGNED_KEY : ALL_ZONE_KEY)),
    );
  }, [activeZone, zonesWithTables, hasUnassigned]);

  // Build ALL table items in one flat list (unified canvas)
  const allPlaced = useMemo(() => {
    const fallbacks = tables.filter((tb) => tb.x === null || tb.y === null);
    const fallbackIndex = new Map<string, number>();
    fallbacks.forEach((tb, i) => fallbackIndex.set(tb.id, i));
    const fallbackTotal = fallbacks.length;

    return tables.map((tb) => {
      const orderForTable = pickActiveOrder(orders, tb.id);
      const activeOrdersForTable = pickActiveOrders(orders, tb.id);
      const call = callsByTable.get(tb.id) ?? null;
      const state = visualStateOf(tb, activeOrdersForTable, call);
      const secondary = call ? null : secondaryVisualState(state, activeOrdersForTable);
      const pos =
        tb.x !== null && tb.y !== null
          ? { x: tb.x, y: tb.y }
          : autoPosition(fallbackIndex.get(tb.id) ?? 0, Math.max(1, fallbackTotal));
      const minsInOrder = orderForTable
        ? Math.max(0, Math.floor((now - new Date(orderForTable.createdAt).getTime()) / 60000))
        : 0;
      const callAge = call ? callAgeSeconds(call, now) : 0;
      return { table: tb, state, secondary, pos, minsInOrder, call, callAge };
    });
  }, [tables, orders, callsByTable, now]);

  // Stats always across all zones (or the filtered zone)
  const filteredItems = useMemo(() => {
    if (activeZone === ALL_ZONE_KEY) return allPlaced;
    if (activeZone === UNASSIGNED_KEY) return allPlaced.filter((v) => v.table.zoneId === null);
    return allPlaced.filter((v) => v.table.zoneId === activeZone);
  }, [allPlaced, activeZone]);

  const callQueue = filteredItems.filter((v) => v.state === 'call' || v.state === 'needs_code');
  const readyCount = filteredItems.filter((v) => v.state === 'ready').length;
  const tablesOnYou = filteredItems.filter((v) => v.state !== 'open').length;

  const meName = meEmail ? meEmail.split('@')[0] : t('floor.meDefault');

  // A table is dimmed when a zone filter is active and the table doesn't belong to it
  function isDimmed(zoneId: string | null): boolean {
    if (activeZone === ALL_ZONE_KEY) return false;
    if (activeZone === UNASSIGNED_KEY) return zoneId !== null;
    return zoneId !== activeZone;
  }

  return (
    <div className="tf-w-floor">
      {/* Header */}
      <header className="tf-w-floor__head">
        <div className="tf-caption">{t('floor.caption')}</div>
        <div className="tf-w-floor__head-row">
          <h1 className="tf-w-floor__title">
            {t('floor.greeting')} <span className="tf-display">{meName}</span>.
          </h1>
        </div>
        <div className="tf-w-floor__stats">
          <span>
            <b>{tablesOnYou}</b> {t('floor.tablesOnYou')}
          </span>
          <span className="tf-w-floor__sep">·</span>
          <span>
            <b className={callQueue.length > 0 ? 'is-late' : ''}>{callQueue.length}</b>{' '}
            {t('floor.calls')}
          </span>
          <span className="tf-w-floor__sep">·</span>
          <span>
            <b>{readyCount}</b> {t('floor.readyToPass')}
          </span>
        </div>

        {/* Zone filter tabs */}
        {zoneTabs.length > 1 && (
          <div className="tf-w-floor__zones" role="tablist">
            {zoneTabs.map((zt) => (
              <button
                key={zt.key}
                type="button"
                role="tab"
                aria-selected={activeZone === zt.key}
                className={`tf-w-floor__zone${activeZone === zt.key ? ' is-active' : ''}`}
                onClick={() => setActiveZone(zt.key)}
              >
                {zt.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Unified map — one canvas for the whole restaurant */}
      <div className="tf-w-floor__map-wrap">
        {allPlaced.length === 0 ? (
          <div className="tf-w-floor__map-empty">{t('floor.zones.noTables')}</div>
        ) : (
          <div className="tf-w-floor__map">
            {/* Decor layer (walls, garden, etc. set up in admin) */}
            {decor.map((item) => (
              <div
                key={item.id}
                className={`tf-w-floor__decor tf-w-floor__decor--${item.type}`}
                style={{
                  left: `${item.x * 100}%`,
                  top: `${item.y * 100}%`,
                  width: `${item.w * 100}%`,
                  height: `${item.h * 100}%`,
                }}
              >
                {item.type === 'garden' && <span className="tf-w-floor__decor-icon">🌿</span>}
                {item.type === 'stairs' && <span className="tf-w-floor__decor-icon">🪜</span>}
                {item.type === 'bar' && <span className="tf-w-floor__decor-text">BAR</span>}
              </div>
            ))}

            {/* Table dots */}
            {allPlaced.map(({ table, state, secondary, pos, minsInOrder, callAge }) => {
              const calling = state === 'call';
              const needsCode = state === 'needs_code';
              const ready = state === 'ready';
              const overdue = calling && callUrgency(callAge) === 'overdue';
              const dim = isDimmed(table.zoneId);
              const size =
                table.seats >= 6 ? 56 : table.seats >= 4 ? 48 : table.seats >= 2 ? 40 : 32;
              const showMins = ['ordered', 'cooking', 'paying'].includes(state) && minsInOrder > 0;
              const radius = table.seats === 1 ? size / 2 : 10;
              return (
                <button
                  key={table.id}
                  type="button"
                  className={[
                    'tf-w-floor__dot',
                    `tf-w-floor__dot--${state}`,
                    calling ? 'is-calling' : '',
                    ready ? 'is-ready' : '',
                    overdue ? 'is-overdue' : '',
                    secondary ? 'is-reorder' : '',
                    dim ? 'is-dim' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => !dim && onOpen(table.id)}
                  style={{
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    width: size,
                    height: size,
                    borderRadius: radius,
                  }}
                  aria-label={t('floor.openTableLabel', {
                    label: table.label,
                    state: t(`state.${state}`),
                  })}
                >
                  {secondary && (
                    <span
                      className={`tf-w-floor__dot-split tf-w-floor__dot-split--${secondary}`}
                      style={{ borderRadius: radius }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="tf-w-floor__dot-num">{shortLabel(table.label)}</span>
                  {showMins && <span className="tf-mono tf-w-floor__dot-mins">{minsInOrder}m</span>}
                  {calling && (
                    <span className="tf-w-floor__dot-bell">
                      <IconBellRing />
                    </span>
                  )}
                  {needsCode && (
                    <span className="tf-w-floor__dot-bell">
                      <IconHash />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* State legend */}
      <div className="tf-w-floor__legend">
        {STATE_ORDER.map((s) => (
          <span className={`tf-w-floor__legend-chip tf-w-floor__legend-chip--${s}`} key={s}>
            <span className="tf-w-floor__legend-dot" />
            {t(`state.${s}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
