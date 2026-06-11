import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Dish, LanguageCode, Variant, VariantGroup } from '@orvexa/shared';
import { useEscapeKey, useFocusTrap } from '@orvexa/ui';
import { useCartStore, makeLine } from '../store/cart.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import { IconChevronDown, IconMinus, IconPlus } from './tf-icons.js';

type Selection = Map<string, string[]>; // groupId → variantIds

function defaultSelection(groups: VariantGroup[]): Selection {
  const map: Selection = new Map();
  for (const g of groups) map.set(g.id, []);
  return map;
}

function isGroupValid(group: VariantGroup, selectedIds: string[]): boolean {
  const selectable = (group.variants ?? []).filter((v) => v.isActive).length;
  if (selectable === 0) return true; // nothing to pick, don't block
  const count = selectedIds.length;
  if (count < group.min) return false;
  if (count > group.max) return false;
  return true;
}

export function ItemDetailModal({
  dish,
  lang,
  onClose,
}: {
  dish: Dish;
  lang: LanguageCode;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const groups = useMemo(() => dish.variantGroups ?? [], [dish.variantGroups]);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(groups));
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const images = useMemo<string[]>(() => {
    const list: string[] = [];
    if (dish.imageUrl) list.push(dish.imageUrl);
    for (const u of dish.imageUrls ?? []) if (u && !list.includes(u)) list.push(u);
    return list;
  }, [dish.imageUrl, dish.imageUrls]);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeImage = images[activeIdx] ?? null;
  const touchStartX = useRef<number | null>(null);
  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null || images.length < 2) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < 40) return;
    setActiveIdx((i) => {
      if (delta < 0) return Math.min(images.length - 1, i + 1);
      return Math.max(0, i - 1);
    });
  };
  const onTouchCancel = () => {
    touchStartX.current = null;
  };

  const variantById = useMemo(() => {
    const map = new Map<string, Variant>();
    for (const g of groups) for (const v of g.variants ?? []) map.set(v.id, v);
    return map;
  }, [groups]);

  const toggle = (group: VariantGroup, variantId: string) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const current = next.get(group.id) ?? [];
      if (group.selectionType === 'single') {
        next.set(group.id, current[0] === variantId ? [] : [variantId]);
      } else {
        const has = current.includes(variantId);
        if (has) {
          next.set(
            group.id,
            current.filter((id) => id !== variantId),
          );
        } else if (current.length < group.max) {
          next.set(group.id, [...current, variantId]);
        }
      }
      return next;
    });
  };

  const allValid = groups.every((g) => isGroupValid(g, selection.get(g.id) ?? []));
  const variantDelta = Array.from(selection.values())
    .flat()
    .reduce((sum, id) => sum + (variantById.get(id)?.priceDeltaMillimes ?? 0), 0);
  const lineTotal = (dish.priceMillimes + variantDelta) * quantity;

  const add = () => {
    if (!allValid) return;
    const selectedVariants: { group: VariantGroup; variant: Variant }[] = [];
    for (const g of groups) {
      const ids = selection.get(g.id) ?? [];
      for (const id of ids) {
        const v = variantById.get(id);
        if (v) selectedVariants.push({ group: g, variant: v });
      }
    }
    const line = makeLine(dish, selectedVariants, quantity, notes.trim() || undefined);
    useCartStore.getState().add(line);
    onClose();
  };

  return (
    <div
      ref={sheetRef}
      className="tf-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-title"
    >
      <div
        className="tf-sheet__scroll"
        onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
      >
        <div className="tf-sheet__hero" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}>
          <div
            className="tf-sheet__hero-img"
            style={{
              backgroundImage: activeImage ? `url(${activeImage})` : undefined,
              transform: `translateY(${scrollY * 0.4}px) scale(${1 + scrollY * 0.0008})`,
            }}
            aria-hidden="true"
          />
          <button
            type="button"
            className="tf-sheet__close"
            onClick={onClose}
            aria-label={t('cart.back')}
          >
            <IconChevronDown size={18} />
          </button>
          {images.length > 1 ? (
            <div className="tf-sheet__dots" aria-hidden="true">
              {images.map((u, i) => (
                <span key={u} className={`tf-sheet__dot${i === activeIdx ? ' is-active' : ''}`} />
              ))}
            </div>
          ) : null}
          <div className="tf-sheet__hero-fade" />
        </div>

        <div className="tf-sheet__body">
          {images.length > 1 ? (
            <div
              className="tf-sheet__thumbs"
              aria-label={t('menu.photos', { defaultValue: 'Photos' })}
            >
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  className={`tf-sheet__thumb${i === activeIdx ? ' is-active' : ''}`}
                  onClick={() => setActiveIdx(i)}
                  aria-label={t('menu.photo', { defaultValue: 'Photo' })}
                >
                  <span
                    className="tf-sheet__thumb-img"
                    style={{ backgroundImage: `url(${url})` }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          ) : null}
          <div className="tf-sheet__head">
            <h1 id="dish-title" className="tf-sheet__title">
              {pickLang(dish.name, lang)}
            </h1>
            <div className="tf-sheet__price tf-tabular">{formatMillimes(dish.priceMillimes)}</div>
          </div>
          {dish.description ? (
            <p className="tf-sheet__desc">{pickLang(dish.description, lang)}</p>
          ) : null}

          {groups.length > 0 ? (
            <>
              {groups.map((g) => {
                const selectedIds = selection.get(g.id) ?? [];
                const help =
                  g.selectionType === 'single'
                    ? t('dish.selectOne')
                    : g.min > 0
                      ? t('dish.selectMin', { min: g.min })
                      : t('dish.selectUpTo', { max: g.max });
                return (
                  <div className="tf-vgroup" key={g.id}>
                    <div className="tf-vgroup__head">
                      <h4 className="tf-vgroup__name">
                        {pickLang(g.name, lang)}
                        {g.required ? <span style={{ color: 'var(--tf-accent)' }}> *</span> : null}
                      </h4>
                      <span className="tf-vgroup__hint">{help}</span>
                    </div>
                    <div className="tf-vgroup__list">
                      {(g.variants ?? [])
                        .filter((v) => v.isActive)
                        .map((v) => {
                          const selected = selectedIds.includes(v.id);
                          return (
                            <label
                              key={v.id}
                              className={`tf-vgroup__opt${selected ? ' is-selected' : ''}`}
                            >
                              <input
                                type={g.selectionType === 'single' ? 'radio' : 'checkbox'}
                                name={g.id}
                                checked={selected}
                                onChange={() => toggle(g, v.id)}
                              />
                              <span className="tf-vgroup__opt-name">{pickLang(v.name, lang)}</span>
                              {v.priceDeltaMillimes !== 0 ? (
                                <span className="tf-vgroup__opt-delta">
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
            </>
          ) : null}

          <div className="tf-notes">
            <div className="tf-vgroup__hint" style={{ marginBottom: 8 }}>
              {t('dish.notes')}
            </div>
            <textarea
              className="tf-notes__field"
              maxLength={500}
              placeholder={t('dish.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tf-sheet__bar">
        <div className="tf-stepper" aria-label={t('dish.quantity')}>
          <button
            type="button"
            className="tf-stepper__btn"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="-"
          >
            <IconMinus size={18} />
          </button>
          <span className="tf-stepper__val" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="tf-stepper__btn"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            aria-label="+"
          >
            <IconPlus size={18} />
          </button>
        </div>
        <button type="button" className="tf-add-cta" disabled={!allValid} onClick={add}>
          <span>{t('dish.addToCart')}</span>
          <span className="tf-tabular">{formatMillimes(lineTotal)}</span>
        </button>
      </div>
    </div>
  );
}
