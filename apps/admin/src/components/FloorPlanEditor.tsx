import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TableLayoutEntry, TableWithDerived, TableZone } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';

type Props = {
  tables: TableWithDerived[];
  zones: TableZone[];
  onZonesChanged: () => void | Promise<void>;
  onTablesChanged: () => void | Promise<void>;
  onError: (msg: string) => void;
};

type Draft = TableLayoutEntry;

const SNAP_STEP = 0.025;

function snap(v: number) {
  return Math.max(0, Math.min(1, Math.round(v / SNAP_STEP) * SNAP_STEP));
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function shortLabel(label: string) {
  const digits = label.match(/\d+/);
  return digits ? digits[0] : label.slice(0, 2);
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Zone colour palette ────────────────────────────────────────────────────
const ZONE_PALETTE = [
  { token: '#4a9eff', border: 'rgba(74,158,255,0.55)' },
  { token: '#ff7b4a', border: 'rgba(255,123,74,0.55)' },
  { token: '#3ecf6e', border: 'rgba(62,207,110,0.55)' },
  { token: '#c47fff', border: 'rgba(196,127,255,0.55)' },
  { token: '#f5c84a', border: 'rgba(245,200,74,0.55)' },
  { token: '#ff4a7b', border: 'rgba(255,74,123,0.55)' },
];

function zoneColor(idx: number) {
  return ZONE_PALETTE[idx % ZONE_PALETTE.length]!;
}

// ── Decor system ───────────────────────────────────────────────────────────
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

const DECOR_DEFAULTS: Record<DecorType, { w: number; h: number }> = {
  'wall-h': { w: 0.15, h: 0.025 },
  'wall-v': { w: 0.025, h: 0.15 },
  'divider-h': { w: 0.8, h: 0.012 },
  'divider-v': { w: 0.012, h: 0.7 },
  garden: { w: 0.13, h: 0.11 },
  pillar: { w: 0.04, h: 0.04 },
  stairs: { w: 0.09, h: 0.07 },
  bar: { w: 0.2, h: 0.055 },
};

const DECOR_LABELS: Record<DecorType, string> = {
  'wall-h': 'Wall (H)',
  'wall-v': 'Wall (V)',
  'divider-h': 'Divider (H)',
  'divider-v': 'Divider (V)',
  garden: 'Garden',
  pillar: 'Pillar',
  stairs: 'Stairs',
  bar: 'Bar counter',
};

const DECOR_TOOLS: { type: DecorType; icon: string }[] = [
  { type: 'wall-h', icon: '▬' },
  { type: 'wall-v', icon: '▮' },
  { type: 'divider-h', icon: '⋯' },
  { type: 'divider-v', icon: '⋮' },
  { type: 'garden', icon: '🌿' },
  { type: 'pillar', icon: '⬤' },
  { type: 'stairs', icon: '🪜' },
  { type: 'bar', icon: '🍹' },
];

const STORAGE_KEY = 'tf:floor-decor-v1';

function loadDecor(): DecorItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DecorItem[]) : [];
  } catch {
    return [];
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export function FloorPlanEditor({
  tables,
  zones,
  onZonesChanged,
  onTablesChanged,
  onError,
}: Props) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [highlightZoneId, setHighlightZoneId] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(zones[0]?.id ?? null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [busy, setBusy] = useState(false);

  // Decor
  const [decor, setDecor] = useState<DecorItem[]>(loadDecor);
  const [activeTool, setActiveTool] = useState<DecorType | 'select'>('select');
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decor));
  }, [decor]);

  // Draft table layout
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      tables.map((tb) => [tb.id, { id: tb.id, zoneId: tb.zoneId, x: tb.x, y: tb.y }]),
    ),
  );

  useEffect(() => {
    queueMicrotask(() =>
      setDrafts(
        Object.fromEntries(
          tables.map((tb) => [tb.id, { id: tb.id, zoneId: tb.zoneId, x: tb.x, y: tb.y }]),
        ),
      ),
    );
  }, [tables]);

  // Keep activeZoneId in sync when zones change
  useEffect(() => {
    if (activeZoneId && !zones.find((z) => z.id === activeZoneId)) {
      queueMicrotask(() => setActiveZoneId(zones[0]?.id ?? null));
    }
  }, [zones, activeZoneId]);

  const dirtyIds = useMemo(() => {
    return tables
      .filter((tb) => {
        const d = drafts[tb.id];
        return d && (d.zoneId !== tb.zoneId || d.x !== tb.x || d.y !== tb.y);
      })
      .map((tb) => tb.id);
  }, [drafts, tables]);

  const placedTables = useMemo(
    () => tables.filter((tb) => drafts[tb.id]?.zoneId !== null),
    [tables, drafts],
  );
  const unplacedTables = useMemo(
    () => tables.filter((tb) => drafts[tb.id]?.zoneId === null),
    [tables, drafts],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedDecorId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDecorId) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          setDecor((prev) => prev.filter((d) => d.id !== selectedDecorId));
          setSelectedDecorId(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDecorId]);

  // ── Table drag ─────────────────────────────────────────────────────────
  const tableDragRef = useRef<{ id: string; pointerId: number; keepZone: string | null } | null>(
    null,
  );

  const moveTableTo = useCallback(
    (tableId: string, clientX: number, clientY: number, forceZone?: string | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let x = clamp01((clientX - rect.left) / rect.width);
      let y = clamp01((clientY - rect.top) / rect.height);
      if (snapToGrid) {
        x = snap(x);
        y = snap(y);
      }
      setDrafts((prev) => {
        const zoneId = forceZone !== undefined ? forceZone : (prev[tableId]?.zoneId ?? null);
        return { ...prev, [tableId]: { id: tableId, zoneId, x, y } };
      });
    },
    [snapToGrid],
  );

  const startTableDrag = useCallback(
    (tableId: string, e: React.PointerEvent) => {
      if (activeTool !== 'select') return;
      e.preventDefault();
      e.stopPropagation();
      tableDragRef.current = { id: tableId, pointerId: e.pointerId, keepZone: null };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [activeTool],
  );

  const placeFromTray = (tableId: string, e: React.PointerEvent) => {
    const zoneId = activeZoneId ?? zones[0]?.id ?? null;
    if (!zoneId) return;
    tableDragRef.current = { id: tableId, pointerId: e.pointerId, keepZone: zoneId };
    moveTableTo(tableId, e.clientX, e.clientY, zoneId);
  };

  const removeFromZone = (tableId: string) => {
    setDrafts((prev) => ({
      ...prev,
      [tableId]: { id: tableId, zoneId: null, x: null, y: null },
    }));
  };

  // ── Decor drag & resize ────────────────────────────────────────────────
  const decorDragRef = useRef<{
    id: string;
    pointerId: number;
    ox: number;
    oy: number;
  } | null>(null);

  const decorResizeRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const startDecorDrag = (item: DecorItem, e: React.PointerEvent) => {
    if (activeTool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedDecorId(item.id);
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ox = (e.clientX - rect.left) / rect.width - item.x;
    const oy = (e.clientY - rect.top) / rect.height - item.y;
    decorDragRef.current = { id: item.id, pointerId: e.pointerId, ox, oy };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const startDecorResize = (item: DecorItem, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    decorResizeRef.current = {
      id: item.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origW: item.w,
      origH: item.h,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  // ── Unified pointer move / up ──────────────────────────────────────────
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    const td = tableDragRef.current;
    if (td?.pointerId === e.pointerId) {
      moveTableTo(td.id, e.clientX, e.clientY, td.keepZone ?? undefined);
    }

    const dd = decorDragRef.current;
    if (dd?.pointerId === e.pointerId) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      let x = clamp01((e.clientX - rect.left) / rect.width - dd.ox);
      let y = clamp01((e.clientY - rect.top) / rect.height - dd.oy);
      if (snapToGrid) {
        x = snap(x);
        y = snap(y);
      }
      setDecor((prev) => prev.map((d) => (d.id === dd.id ? { ...d, x, y } : d)));
    }

    const dr = decorResizeRef.current;
    if (dr?.pointerId === e.pointerId) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const dx = (e.clientX - dr.startX) / rect.width;
      const dy = (e.clientY - dr.startY) / rect.height;
      let w = Math.max(SNAP_STEP, dr.origW + dx);
      let h = Math.max(SNAP_STEP, dr.origH + dy);
      if (snapToGrid) {
        w = Math.max(SNAP_STEP, Math.round(w / SNAP_STEP) * SNAP_STEP);
        h = Math.max(SNAP_STEP, Math.round(h / SNAP_STEP) * SNAP_STEP);
      }
      setDecor((prev) => prev.map((d) => (d.id === dr.id ? { ...d, w, h } : d)));
    }
  };

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    if (tableDragRef.current?.pointerId === e.pointerId) tableDragRef.current = null;
    if (decorDragRef.current?.pointerId === e.pointerId) decorDragRef.current = null;
    if (decorResizeRef.current?.pointerId === e.pointerId) decorResizeRef.current = null;
  };

  // Canvas click — place decor when a tool is active
  const onCanvasClick = (e: React.MouseEvent) => {
    if (activeTool === 'select') {
      if (e.target === canvasRef.current) setSelectedDecorId(null);
      return;
    }
    if ((e.target as Element).closest('.tf-a-floor__token')) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const def = DECOR_DEFAULTS[activeTool];
    let x = clamp01((e.clientX - rect.left) / rect.width - def.w / 2);
    let y = clamp01((e.clientY - rect.top) / rect.height - def.h / 2);
    if (snapToGrid) {
      x = snap(x);
      y = snap(y);
    }
    const item: DecorItem = { id: uid(), type: activeTool, x, y, ...def };
    setDecor((prev) => [...prev, item]);
    setActiveTool('select');
    setSelectedDecorId(item.id);
  };

  // ── Save / discard ─────────────────────────────────────────────────────
  const save = async () => {
    if (dirtyIds.length === 0) return;
    setBusy(true);
    try {
      const payload = dirtyIds.map((id) => drafts[id]!);
      await authedFetch((tk) => api.bulkUpdateTableLayout(tk, { tables: payload }));
      await onTablesChanged();
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1400);
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const discard = () => {
    setDrafts(
      Object.fromEntries(
        tables.map((tb) => [tb.id, { id: tb.id, zoneId: tb.zoneId, x: tb.x, y: tb.y }]),
      ),
    );
  };

  // ── Zone CRUD ──────────────────────────────────────────────────────────
  const addZone = async () => {
    const baseName = t('tables.floorPlan.newZoneName');
    let name = baseName;
    let i = 2;
    while (zones.some((z) => z.name === name)) {
      name = `${baseName} ${i}`;
      i += 1;
    }
    try {
      const created = await authedFetch((tk) => api.createTableZone(tk, { name }));
      await onZonesChanged();
      setActiveZoneId(created.id);
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  const renameZone = async (zone: TableZone) => {
    const next = window.prompt(t('tables.floorPlan.renameZone'), zone.name);
    if (!next || next.trim() === zone.name) return;
    try {
      await authedFetch((tk) => api.updateTableZone(tk, zone.id, { name: next.trim() }));
      await onZonesChanged();
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  const deleteZone = async (zone: TableZone) => {
    if (!window.confirm(t('tables.floorPlan.deleteZoneConfirm'))) return;
    try {
      await authedFetch((tk) => api.deleteTableZone(tk, zone.id));
      await onZonesChanged();
      await onTablesChanged();
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="tf-a-floor">
      {/* Rail */}
      <aside className="tf-a-floor__rail">
        {/* Zones */}
        <div className="tf-a-floor__rail-section">
          <div className="tf-a-floor__rail-head">
            <h2>{t('tables.floorPlan.zonesTitle')}</h2>
            <button type="button" className="btn btn-sm" onClick={addZone}>
              {t('tables.floorPlan.addZone')}
            </button>
          </div>
          {zones.length === 0 ? (
            <p className="muted tf-a-floor__rail-empty">{t('tables.floorPlan.noZones')}</p>
          ) : (
            <ul className="tf-a-floor__rail-list">
              {zones.map((z, i) => {
                const color = zoneColor(i);
                const count = tables.filter((tb) => drafts[tb.id]?.zoneId === z.id).length;
                const isActive = z.id === activeZoneId;
                const isHighlit = z.id === highlightZoneId;
                return (
                  <li key={z.id} className={`tf-a-floor__rail-item${isActive ? ' is-active' : ''}`}>
                    <span className="tf-a-floor__zone-dot" style={{ background: color.token }} />
                    <button
                      type="button"
                      className="tf-a-floor__rail-pick"
                      onClick={() => {
                        setActiveZoneId(z.id);
                        setHighlightZoneId(isHighlit ? null : z.id);
                      }}
                    >
                      <span className="tf-a-floor__rail-name">{z.name}</span>
                      <span className="tf-a-floor__rail-count">{count}</span>
                    </button>
                    <div className="tf-a-floor__rail-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => renameZone(z)}
                        aria-label={t('tables.floorPlan.renameZone')}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-danger"
                        onClick={() => deleteZone(z)}
                        aria-label={t('tables.floorPlan.deleteZone')}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {highlightZoneId && (
            <button
              type="button"
              className="btn btn-sm btn-ghost tf-a-floor__show-all"
              onClick={() => setHighlightZoneId(null)}
            >
              Show all zones
            </button>
          )}
        </div>

        {/* Decor palette */}
        <div className="tf-a-floor__rail-section">
          <div className="tf-a-floor__rail-head">
            <h2>Elements</h2>
            {selectedDecorId && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  setDecor((prev) => prev.filter((d) => d.id !== selectedDecorId));
                  setSelectedDecorId(null);
                }}
              >
                Remove
              </button>
            )}
          </div>
          <div className="tf-a-floor__palette">
            {DECOR_TOOLS.map((tool) => (
              <button
                key={tool.type}
                type="button"
                className={`tf-a-floor__palette-btn${activeTool === tool.type ? ' is-active' : ''}`}
                onClick={() => setActiveTool(activeTool === tool.type ? 'select' : tool.type)}
                title={DECOR_LABELS[tool.type]}
              >
                <span className="tf-a-floor__palette-icon">{tool.icon}</span>
                <span className="tf-a-floor__palette-label">{DECOR_LABELS[tool.type]}</span>
              </button>
            ))}
          </div>
          <p className="tf-a-floor__palette-hint">
            Click to place · drag to move · drag corner to resize · double-click to delete
          </p>
        </div>

        {/* Unplaced tray */}
        <div className="tf-a-floor__tray">
          <div className="tf-a-floor__tray-head">
            <h3>{t('tables.floorPlan.unplaced')}</h3>
            <span className="tf-a-floor__tray-count">{unplacedTables.length}</span>
          </div>
          {zones.length > 0 && activeZoneId && (
            <p className="tf-a-floor__tray-target">
              Placing into: <strong>{zones.find((z) => z.id === activeZoneId)?.name}</strong>
            </p>
          )}
          {unplacedTables.length === 0 ? (
            <p className="muted">{t('tables.floorPlan.unplacedHint')}</p>
          ) : (
            <div className="tf-a-floor__tray-chips">
              {unplacedTables.map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  className="tf-a-floor__chip"
                  disabled={!activeZoneId}
                  onPointerDown={(e) => placeFromTray(tb.id, e)}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerCancel={onCanvasPointerUp}
                  title={tb.label}
                >
                  {shortLabel(tb.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Canvas area */}
      <div className="tf-a-floor__main">
        <div className="tf-a-floor__toolbar">
          {activeTool !== 'select' ? (
            <span className="tf-a-floor__tool-hint">
              Click canvas to place <strong>{DECOR_LABELS[activeTool]}</strong>
              {' — '}
              <button
                type="button"
                className="tf-a-floor__tool-cancel"
                onClick={() => setActiveTool('select')}
              >
                cancel (Esc)
              </button>
            </span>
          ) : (
            <label className="tf-a-floor__toggle">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
              />
              {t('tables.floorPlan.snapToGrid')}
            </label>
          )}
          <span className="tf-a-floor__spacer" />
          {dirtyIds.length > 0 ? (
            <span className="tf-a-floor__dirty">
              {t('tables.floorPlan.dirtyHint', { count: dirtyIds.length })}
            </span>
          ) : savedFlash ? (
            <span className="tf-a-floor__saved">{t('tables.floorPlan.saved')}</span>
          ) : null}
          <button
            type="button"
            className="btn btn-sm"
            onClick={discard}
            disabled={dirtyIds.length === 0 || busy}
          >
            {t('tables.floorPlan.discard')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={save}
            disabled={dirtyIds.length === 0 || busy}
          >
            {t('tables.floorPlan.save')}
          </button>
        </div>

        <div
          ref={canvasRef}
          className={[
            'tf-a-floor__canvas',
            snapToGrid ? 'is-grid' : '',
            activeTool !== 'select' ? 'is-placing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={onCanvasClick}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        >
          {placedTables.length === 0 && decor.length === 0 && (
            <p className="tf-a-floor__canvas-empty">
              {zones.length === 0
                ? t('tables.floorPlan.noZones')
                : t('tables.floorPlan.noTablesInZone')}
            </p>
          )}

          {/* Decor layer — rendered below tables */}
          {decor.map((item) => {
            const isSelected = item.id === selectedDecorId;
            return (
              <div
                key={item.id}
                className={[
                  'tf-a-floor__decor',
                  `tf-a-floor__decor--${item.type}`,
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${item.x * 100}%`,
                  top: `${item.y * 100}%`,
                  width: `${item.w * 100}%`,
                  height: `${item.h * 100}%`,
                }}
                onPointerDown={(e) => startDecorDrag(item, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setDecor((prev) => prev.filter((d) => d.id !== item.id));
                  setSelectedDecorId(null);
                }}
              >
                {item.type === 'garden' && <span className="tf-a-floor__decor-icon">🌿</span>}
                {item.type === 'stairs' && <span className="tf-a-floor__decor-icon">🪜</span>}
                {item.type === 'bar' && <span className="tf-a-floor__decor-text">BAR</span>}
                {isSelected && (
                  <div
                    className="tf-a-floor__resize-handle"
                    onPointerDown={(e) => startDecorResize(item, e)}
                  />
                )}
              </div>
            );
          })}

          {/* Table tokens */}
          {placedTables.map((tb) => {
            const d = drafts[tb.id]!;
            const x = d.x ?? 0.5;
            const y = d.y ?? 0.5;
            const size = tb.seats >= 6 ? 56 : tb.seats >= 4 ? 48 : tb.seats >= 2 ? 40 : 32;
            const zoneIdx = zones.findIndex((z) => z.id === d.zoneId);
            const color = zoneIdx >= 0 ? zoneColor(zoneIdx) : null;
            const isDim = highlightZoneId !== null && d.zoneId !== highlightZoneId;
            return (
              <button
                key={tb.id}
                type="button"
                className={['tf-a-floor__token', isDim ? 'is-dim' : ''].filter(Boolean).join(' ')}
                style={
                  {
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: size,
                    height: size,
                    borderRadius: tb.seats === 1 ? size / 2 : 10,
                    borderColor: color?.border ?? undefined,
                    color: color?.token ?? undefined,
                  } as React.CSSProperties
                }
                onPointerDown={(e) => startTableDrag(tb.id, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  removeFromZone(tb.id);
                }}
                aria-label={tb.label}
                title={`${tb.label} — double-click to unplace`}
              >
                <span className="tf-a-floor__token-label">{shortLabel(tb.label)}</span>
              </button>
            );
          })}

          {/* Zone legend — bottom-left corner */}
          {zones.length > 0 && (
            <div className="tf-a-floor__legend">
              {zones.map((z, i) => (
                <button
                  key={z.id}
                  type="button"
                  className={`tf-a-floor__legend-item${highlightZoneId === z.id ? ' is-active' : ''}`}
                  style={{ '--legend-color': zoneColor(i).token } as React.CSSProperties}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveZoneId(z.id);
                    setHighlightZoneId(highlightZoneId === z.id ? null : z.id);
                  }}
                >
                  <span className="tf-a-floor__legend-dot" />
                  {z.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
