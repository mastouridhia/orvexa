import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Dish, LanguageCode, VariantGroup } from '@orvexa/shared';
import { Modal } from '@orvexa/ui';
import { ApiError } from '../api/client.js';
import { api, type MenuTreeCategory } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { formatMillimes, pickLang } from '../utils/format.js';

type Selection = Map<string, string[]>; // groupId → variantIds

type Line = {
  dishId: string;
  quantity: number;
  variantIds: string[];
  notes?: string;
};

function defaultSelection(groups: VariantGroup[]): Selection {
  const map: Selection = new Map();
  for (const g of groups) map.set(g.id, []);
  return map;
}

function isGroupValid(group: VariantGroup, selectedIds: string[]): boolean {
  const selectable = (group.variants ?? []).filter((v) => v.isActive).length;
  if (selectable === 0) return true;
  const count = selectedIds.length;
  if (count < group.min) return false;
  if (count > group.max) return false;
  return true;
}

function buildItems(lines: Line[]) {
  return lines.map((l) => ({
    dishId: l.dishId,
    quantity: l.quantity,
    variantIds: l.variantIds,
    ...(l.notes ? { notes: l.notes } : {}),
  }));
}

export function WaiterOrderSheet({
  tableLabel,
  tableId,
  existingOrderId,
  lang,
  onClose,
  onSaved,
}: {
  tableLabel: string;
  tableId: string;
  existingOrderId: string | null;
  lang: LanguageCode;
  onClose: () => void;
  onSaved: (orderId: string) => void;
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authedFetch = useAuthStore((s) => s.authedFetch);

  const [tree, setTree] = useState<MenuTreeCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    let cancelled = false;
    void authedFetch((tk) => api.getMenuPublic(tk))
      .then((data) => {
        if (!cancelled) setTree(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const allDishes = useMemo(() => (tree ?? []).flatMap((c) => c.dishes), [tree]);
  const lower = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!lower) return allDishes;
    return allDishes.filter((d) => {
      const n = pickLang(d.name, lang).toLowerCase();
      const desc = d.description ? pickLang(d.description, lang).toLowerCase() : '';
      return n.includes(lower) || desc.includes(lower);
    });
  }, [allDishes, lower, lang]);

  const subtotal = useMemo(() => {
    const dishById = new Map(allDishes.map((d) => [d.id, d] as const));
    return lines.reduce((sum, l) => {
      const dish = dishById.get(l.dishId);
      if (!dish) return sum;
      // price deltas are not recomputed here (keeps sheet lightweight)
      return sum + dish.priceMillimes * l.quantity;
    }, 0);
  }, [lines, allDishes]);

  const confirm = async () => {
    if (!accessToken) return;
    if (lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const items = buildItems(lines);
      const order = existingOrderId
        ? await authedFetch((tk) => api.addItemsStaff(tk, existingOrderId, { items }))
        : await authedFetch((tk) => api.placeOrderForTable(tk, tableId, { items }));
      onSaved(order.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tf-w-order">
      <div className="tf-w-order__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="tf-w-order__sheet" role="dialog" aria-label={t('tables.title')}>
        <div className="tf-w-order__head">
          <div>
            <div className="tf-caption">{t('detail.titleLead')} {tableLabel}</div>
            <h2 className="tf-w-order__title">{t('menu.title', { defaultValue: 'Menu' })}</h2>
          </div>
          <button type="button" className="tf-w-order__close" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <div className="tf-w-order__search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('menu.searchPlaceholder', { defaultValue: 'Search…' })}
          />
        </div>

        <div className="tf-w-order__body">
          {error ? <div className="error-banner">{error}</div> : null}
          {!tree ? (
            <div className="muted">{t('menu.loading', { defaultValue: 'Loading…' })}</div>
          ) : (
            <div className="tf-w-order__list">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="tf-w-order__row"
                  onClick={() => d.available && setOpenDish(d)}
                  disabled={!d.available}
                >
                  <span className="tf-w-order__row-name">{pickLang(d.name, lang)}</span>
                  <span className="tf-mono tf-w-order__row-price">{formatMillimes(d.priceMillimes)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tf-w-order__bar">
          <div className="tf-w-order__bar-left">
            <span className="tf-caption">{t('cart.items', { count: lines.reduce((s, l) => s + l.quantity, 0) })}</span>
            <span className="tf-mono">{formatMillimes(subtotal)}</span>
          </div>
          <button type="button" className="btn btn-primary" disabled={busy || lines.length === 0} onClick={confirm}>
            {busy ? t('detail.saving') : t('cart.confirmOrder', { defaultValue: 'Confirm' })}
          </button>
        </div>

        {openDish ? (
          <DishAddModal
            dish={openDish}
            lang={lang}
            onClose={() => setOpenDish(null)}
            onAdd={(line) => setLines((prev) => [...prev, line])}
          />
        ) : null}
      </div>
    </div>
  );
}

function DishAddModal({
  dish,
  lang,
  onClose,
  onAdd,
}: {
  dish: Dish;
  lang: LanguageCode;
  onClose: () => void;
  onAdd: (line: Line) => void;
}) {
  const { t } = useTranslation();
  const groups = useMemo(() => dish.variantGroups ?? [], [dish.variantGroups]);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(groups));
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const toggle = (group: VariantGroup, variantId: string) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const current = next.get(group.id) ?? [];
      if (group.selectionType === 'single') {
        next.set(group.id, current[0] === variantId ? [] : [variantId]);
      } else {
        const has = current.includes(variantId);
        if (has) {
          next.set(group.id, current.filter((id) => id !== variantId));
        } else if (current.length < group.max) {
          next.set(group.id, [...current, variantId]);
        }
      }
      return next;
    });
  };

  const allValid = groups.every((g) => isGroupValid(g, selection.get(g.id) ?? []));

  return (
    <Modal
      title={pickLang(dish.name, lang)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('detail.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allValid}
            onClick={() => {
              const ids = Array.from(selection.values()).flat();
              onAdd({
                dishId: dish.id,
                quantity,
                variantIds: ids,
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              });
              onClose();
            }}
          >
            + {t('dish.addToCart', { defaultValue: 'Add' })}
          </button>
        </>
      }
    >
      {dish.description ? <p style={{ marginTop: 0 }}>{pickLang(dish.description, lang)}</p> : null}

      {groups.length > 0 ? (
        <div className="stack">
          {groups.map((g) => {
            const selectedIds = selection.get(g.id) ?? [];
            return (
              <div key={g.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{pickLang(g.name, lang)}</strong>
                  <span className="tf-caption">
                    {g.selectionType === 'single'
                      ? t('dish.selectOne')
                      : g.min > 0
                        ? t('dish.selectMin', { min: g.min })
                        : t('dish.selectUpTo', { max: g.max })}
                  </span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(g.variants ?? []).filter((v) => v.isActive).map((v) => {
                    const checked = selectedIds.includes(v.id);
                    return (
                      <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type={g.selectionType === 'single' ? 'radio' : 'checkbox'}
                          name={g.id}
                          checked={checked}
                          onChange={() => toggle(g, v.id)}
                        />
                        <span style={{ flex: 1 }}>{pickLang(v.name, lang)}</span>
                        {v.priceDeltaMillimes !== 0 ? (
                          <span className="tf-mono" style={{ color: 'var(--fg-soft)' }}>
                            {v.priceDeltaMillimes > 0 ? '+' : ''}
                            {formatMillimes(v.priceDeltaMillimes)}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <div className="tf-caption">{t('dish.quantity')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="tf-mono">{quantity}</span>
          <button type="button" className="btn btn-ghost" onClick={() => setQuantity((q) => Math.min(99, q + 1))}>
            +
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="tf-caption">{t('dish.notes')}</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: '100%', marginTop: 6 }}
          maxLength={500}
        />
      </div>
    </Modal>
  );
}

