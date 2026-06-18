import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, Dish, KitchenSection, LanguageCode, LocalizedString, VariantGroup } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { Modal } from '@orvexa/ui';
import { TriLangInput } from '../components/TriLangInput.js';
import { formatMillimes, parseMillimes, pickLang } from '../utils/format.js';
import { useCan } from '../utils/plan.js';

type Tab = 'categories' | 'dishes';

const EMPTY_L10N: LocalizedString = { ar: '', fr: '', en: '' };

export function MenuEditor() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [tab, setTab] = useState<Tab>('dishes');
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [newDishOpen, setNewDishOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | 'new' | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, ds] = await Promise.all([
          authedFetch((tk) => api.listCategories(tk)),
          authedFetch((tk) => api.listDishes(tk)),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setDishes(ds);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, reloadKey]);

  return (
    <>
      <h1 className="page-title">{t('menu.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="tabs" role="tablist">
        <button
          type="button"
          aria-pressed={tab === 'categories'}
          onClick={() => setTab('categories')}
        >
          {t('menu.tabs.categories')}
        </button>
        <button type="button" aria-pressed={tab === 'dishes'} onClick={() => setTab('dishes')}>
          {t('menu.tabs.dishes')}
        </button>
      </div>

      {tab === 'categories' ? (
        <CategoriesPanel
          lang={lang}
          categories={categories}
          onEdit={(c) => setEditingCategory(c)}
          onNew={() => setEditingCategory('new')}
          onDelete={async (c) => {
            if (!window.confirm(t('menu.deleteConfirm'))) return;
            try {
              await authedFetch((tk) => api.deleteCategory(tk, c.id));
              await reload();
            } catch (err) {
              setError(getErrorMessage(err));
            }
          }}
        />
      ) : (
        <DishesPanel
          lang={lang}
          dishes={dishes}
          categories={categories}
          onNew={() => setNewDishOpen(true)}
          onEdit={(d) => setEditingDish(d)}
          onDelete={async (d) => {
            if (!window.confirm(t('menu.deleteConfirm'))) return;
            try {
              await authedFetch((tk) => api.deleteDish(tk, d.id));
              await reload();
            } catch (err) {
              setError(getErrorMessage(err));
            }
          }}
        />
      )}

      {editingCategory ? (
        <CategoryEditor
          initial={editingCategory === 'new' ? null : editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={async () => {
            setEditingCategory(null);
            await reload();
          }}
          onError={setError}
        />
      ) : null}
      {newDishOpen ? (
        <DishEditor
          initial={null}
          categories={categories}
          lang={lang}
          onClose={() => setNewDishOpen(false)}
          onSaved={async () => {
            setNewDishOpen(false);
            await reload();
          }}
          onError={setError}
        />
      ) : null}
      {editingDish ? (
        <DishEditor
          initial={editingDish}
          categories={categories}
          lang={lang}
          onClose={() => setEditingDish(null)}
          onSaved={async () => {
            setEditingDish(null);
            await reload();
          }}
          onError={setError}
        />
      ) : null}
    </>
  );
}

// ───────── Categories ─────────

function CategoriesPanel({
  lang,
  categories,
  onEdit,
  onNew,
  onDelete,
}: {
  lang: LanguageCode;
  categories: Category[];
  onEdit: (c: Category) => void;
  onNew: () => void;
  onDelete: (c: Category) => void;
}) {
  const showKitchenSection = useCan()('kitchen.kds');
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [ordered, setOrdered] = useState<Category[]>(categories);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragSrc = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setOrdered(categories);
  }, [categories]);

  const onDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (src === null || src === targetIdx) return;
    setOrdered((prev) => {
      const next = [...prev];
      const [item] = next.splice(src, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    dragSrc.current = targetIdx;
  };

  const onDrop = async () => {
    dragSrc.current = null;
    setSavingOrder(true);
    try {
      await Promise.all(
        ordered.map((c, i) =>
          authedFetch((tk) => api.updateCategory(tk, c.id, { sortOrder: i + 1 })),
        ),
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const pinToTop = async (c: Category) => {
    const idx = ordered.findIndex((x) => x.id === c.id);
    if (idx === 0) return;
    const next = [c, ...ordered.filter((x) => x.id !== c.id)];
    setOrdered(next);
    setSavingOrder(true);
    try {
      await Promise.all(
        next.map((cat, i) =>
          authedFetch((tk) => api.updateCategory(tk, cat.id, { sortOrder: i + 1 })),
        ),
      );
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="stack">
      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          + {t('menu.newCategory')}
        </button>
      </div>
      {ordered.length === 0 ? (
        <div className="muted">{t('menu.noCategories')}</div>
      ) : (
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 24 }} />
              <th>{t('menu.tabs.categories')}</th>
              <th>{t('menu.active')}</th>
              {showKitchenSection && <th>{t('menu.section')}</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {ordered.map((c, idx) => (
              <tr
                key={c.id}
                draggable
                onDragStart={() => {
                  dragSrc.current = idx;
                }}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={onDrop}
              >
                <td
                  style={{
                    cursor: 'grab',
                    color: 'var(--fg-soft)',
                    userSelect: 'none',
                    textAlign: 'center',
                  }}
                >
                  ⠿
                </td>
                <td>{pickLang(c.name, lang)}</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={c.isActive}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      setOrdered((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, isActive: next } : x)),
                      );
                      try {
                        await authedFetch((tk) =>
                          api.updateCategory(tk, c.id, { isActive: next }),
                        );
                      } catch {
                        setOrdered((prev) =>
                          prev.map((x) => (x.id === c.id ? { ...x, isActive: !next } : x)),
                        );
                      }
                    }}
                  />
                </td>
                {showKitchenSection && (
                  <td>
                    <span className={`section-badge section-badge--${c.kitchenSection}`}>
                      {t(
                        `menu.section${c.kitchenSection.charAt(0).toUpperCase()}${c.kitchenSection.slice(1)}`,
                        { defaultValue: c.kitchenSection },
                      )}
                    </span>
                  </td>
                )}
                <td className="right">
                  {idx !== 0 && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      title={t('menu.pinToTop', { defaultValue: 'Mettre en premier' })}
                      onClick={() => void pinToTop(c)}
                      style={{ marginInlineEnd: '0.25rem' }}
                    >
                      ⬆
                    </button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => onEdit(c)}>
                    {t('menu.edit')}
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(c)}
                  >
                    {t('menu.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {savingOrder ? (
        <div className="muted" style={{ fontSize: '0.8rem', textAlign: 'right' }}>
          Saving…
        </div>
      ) : null}
    </div>
  );
}

function CategoryEditor({
  initial,
  onClose,
  onSaved,
  onError,
}: {
  initial: Category | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const showKitchenSection = useCan()('kitchen.kds');
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [name, setName] = useState<LocalizedString>(initial?.name ?? { ...EMPTY_L10N });
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [kitchenSection, setKitchenSection] = useState<KitchenSection>(
    initial?.kitchenSection ?? 'kitchen',
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (initial) {
        await authedFetch((tk) =>
          api.updateCategory(tk, initial.id, { name, isActive, kitchenSection }),
        );
      } else {
        await authedFetch((tk) => api.createCategory(tk, { name, isActive, kitchenSection }));
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
      title={initial ? initial.name.fr : t('menu.newCategory')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('menu.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {t('menu.save')}
          </button>
        </>
      }
    >
      <TriLangInput value={name} onChange={setName} label={t('menu.namePerLang', { lang: '' })} />
      <label>
        {t('menu.active')}
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          style={{ width: 'auto' }}
        />
      </label>
      {showKitchenSection && (
        <label>
          {t('menu.section')}
          <select
            value={kitchenSection}
            onChange={(e) => setKitchenSection(e.target.value as KitchenSection)}
          >
            <option value="kitchen">{t('menu.sectionKitchen')}</option>
            <option value="bar">{t('menu.sectionBar')}</option>
            <option value="restaurant">{t('menu.sectionRestaurant')}</option>
            <option value="cafe">{t('menu.sectionCafe')}</option>
            <option value="pizzeria">{t('menu.sectionPizzeria')}</option>
          </select>
        </label>
      )}
    </Modal>
  );
}

// ───────── Dishes ─────────

function DishesPanel({
  lang,
  dishes,
  categories,
  onNew,
  onEdit,
  onDelete,
}: {
  lang: LanguageCode;
  dishes: Dish[];
  categories: Category[];
  onNew: () => void;
  onEdit: (d: Dish) => void;
  onDelete: (d: Dish) => void;
}) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map = new Map<string | null, Dish[]>();
    for (const cat of categories) map.set(cat.id, []);
    map.set(null, []);
    for (const d of dishes) {
      const key = d.categoryId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [dishes, categories]);

  const platDuJourDishes = useMemo(() => dishes.filter((d) => d.isPlatDuJour), [dishes]);

  return (
    <div className="stack">
      {/* ── Plat du Jour ── */}
      <div
        style={{
          border: '2px solid var(--saffron, #D97A2C)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'rgba(217,122,44,0.10)',
            padding: '0.4rem 0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(217,122,44,0.25)',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--saffron, #D97A2C)',
            }}
          >
            ⭐ Plat du Jour
          </span>
          <span style={{ fontSize: '0.72rem', opacity: 0.55 }}>
            Affiché en premier — activez via Modifier un plat
          </span>
        </div>
        {platDuJourDishes.length === 0 ? (
          <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', opacity: 0.5 }}>
            Aucun plat sélectionné. Modifiez un plat et cochez "⭐ Plat du Jour".
          </div>
        ) : (
          <table className="dt" style={{ margin: 0 }}>
            <tbody>
              {platDuJourDishes.map((d) => (
                <tr key={d.id}>
                  <td style={{ width: 24, textAlign: 'center', color: 'var(--saffron, #D97A2C)' }}>⭐</td>
                  <td style={{ fontWeight: 500 }}>{pickLang(d.name, lang)}</td>
                  <td className="right">{formatMillimes(d.priceMillimes)}</td>
                  <td className="right">
                    <button type="button" className="btn btn-sm" onClick={() => onEdit(d)}>
                      {t('menu.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          + {t('menu.newDish')}
        </button>
      </div>
      {dishes.length === 0 ? (
        <div className="muted">{t('menu.noDishes')}</div>
      ) : (
        <>
          {categories.map((cat) => {
            const catDishes = grouped.get(cat.id) ?? [];
            if (catDishes.length === 0) return null;
            return (
              <CategoryDishGroup
                key={cat.id}
                label={pickLang(cat.name, lang)}
                dishes={catDishes}
                lang={lang}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
          {(grouped.get(null)?.length ?? 0) > 0 && (
            <CategoryDishGroup
              key="__none__"
              label={t('menu.noCategory')}
              dishes={grouped.get(null)!}
              lang={lang}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </>
      )}
    </div>
  );
}

function CategoryDishGroup({
  label,
  dishes,
  lang,
  onEdit,
  onDelete,
}: {
  label: string;
  dishes: Dish[];
  lang: LanguageCode;
  onEdit: (d: Dish) => void;
  onDelete: (d: Dish) => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [ordered, setOrdered] = useState<Dish[]>(dishes);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragSrc = useRef<number | null>(null);

  // Same pattern as CategoriesPanel — resync drag-order buffer when server dishes change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setOrdered(dishes);
  }, [dishes]);

  const onDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (src === null || src === targetIdx) return;
    setOrdered((prev) => {
      const next = [...prev];
      const [item] = next.splice(src, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    dragSrc.current = targetIdx;
  };

  const onDrop = async () => {
    dragSrc.current = null;
    setSavingOrder(true);
    try {
      await Promise.all(
        ordered.map((d, i) => authedFetch((tk) => api.updateDish(tk, d.id, { sortOrder: i + 1 }))),
      );
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.45rem 0.75rem',
          background: 'var(--bg-soft, var(--surface-2))',
          fontWeight: 600,
          fontSize: '0.88rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span>{label}</span>
        {savingOrder && (
          <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
            Saving…
          </span>
        )}
      </div>
      <table className="dt" style={{ margin: 0 }}>
        <tbody>
          {ordered.map((d, idx) => (
            <tr
              key={d.id}
              draggable
              onDragStart={() => {
                dragSrc.current = idx;
              }}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={onDrop}
              onClick={() => onEdit(d)}
              style={{ cursor: 'pointer' }}
            >
              <td
                style={{
                  width: 24,
                  cursor: 'grab',
                  color: 'var(--fg-soft)',
                  userSelect: 'none',
                  textAlign: 'center',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                ⠿
              </td>
              <td>
                {pickLang(d.name, lang)}
                {d.isPlatDuJour ? <span style={{ marginInlineStart: 6, fontSize: '0.78rem', color: 'var(--saffron, #D97A2C)' }}>⭐ PDJ</span> : null}
              </td>
              <td className="right">{formatMillimes(d.priceMillimes)}</td>
              <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={d.available}
                  style={{ width: 'auto' }}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    setOrdered((prev) =>
                      prev.map((x) => (x.id === d.id ? { ...x, available: next } : x)),
                    );
                    try {
                      await authedFetch((tk) => api.updateDish(tk, d.id, { available: next }));
                    } catch {
                      setOrdered((prev) =>
                        prev.map((x) => (x.id === d.id ? { ...x, available: !next } : x)),
                      );
                    }
                  }}
                />
              </td>
              <td className="right">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(d);
                  }}
                >
                  {t('menu.edit')}
                </button>{' '}
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(d);
                  }}
                >
                  {t('menu.delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DishEditor({
  initial,
  categories,
  lang,
  onClose,
  onSaved,
  onError,
}: {
  initial: Dish | null;
  categories: Category[];
  lang: LanguageCode;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [name, setName] = useState<LocalizedString>(initial?.name ?? { ...EMPTY_L10N });
  const [description, setDescription] = useState<LocalizedString>(
    initial?.description ?? { ...EMPTY_L10N },
  );
  const [priceInput, setPriceInput] = useState<string>(
    initial ? (initial.priceMillimes / 1000).toFixed(3) : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [isPlatDuJour, setIsPlatDuJour] = useState(initial?.isPlatDuJour ?? false);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const priceMillimes = parseMillimes(priceInput) ?? 0;
      let dish: Dish;
      if (initial) {
        dish = await authedFetch((tk) =>
          api.updateDish(tk, initial.id, {
            name,
            description,
            priceMillimes,
            available,
            categoryId,
            isPlatDuJour,
          }),
        );
      } else {
        dish = await authedFetch((tk) =>
          api.createDish(tk, {
            name,
            description,
            priceMillimes,
            available,
            categoryId: categoryId ?? undefined,
            isPlatDuJour,
          }),
        );
      }
      if (imageFiles.length > 0) {
        for (const f of imageFiles) {
          // Append; endpoint now supports multiple photos per item.
          await authedFetch((tk) => api.uploadDishImage(tk, dish.id, f));
        }
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
      title={initial ? initial.name.fr : t('menu.newDish')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('menu.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {t('menu.save')}
          </button>
        </>
      }
    >
      <TriLangInput value={name} onChange={setName} label={t('menu.namePerLang', { lang: '' })} />
      <TriLangInput
        value={description}
        onChange={setDescription}
        label={t('menu.descriptionPerLang', { lang: '' })}
        multiline
      />
      <label>
        {t('menu.price')}
        <input
          type="text"
          inputMode="decimal"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="0.000"
        />
      </label>
      <label>
        {t('menu.category')}
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{t('menu.noCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.fr}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
          style={{ width: 'auto', marginInlineEnd: '0.5rem' }}
        />
        {t('menu.available')}
      </label>
      <label>
        <input
          type="checkbox"
          checked={isPlatDuJour}
          onChange={(e) => setIsPlatDuJour(e.target.checked)}
          style={{ width: 'auto', marginInlineEnd: '0.5rem' }}
        />
        ⭐ Plat du Jour <span style={{ fontSize: '0.78rem', opacity: 0.55, fontWeight: 400 }}>(affiché en premier dans le menu client)</span>
      </label>
      <label>
        {t('menu.image')}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      {(initial?.imageUrls?.length ?? 0) > 0 ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(initial?.imageUrls ?? []).map((url, idx) => (
            <div key={url} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <img
                src={url}
                alt=""
                style={{
                  width: 96,
                  height: 72,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  try {
                    if (!initial) return;
                    await authedFetch((tk) => api.deleteDishImageAt(tk, initial.id, idx));
                    await onSaved();
                  } catch (err) {
                    onError(getErrorMessage(err));
                  }
                }}
              >
                {t('menu.delete')}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <hr
        style={{ margin: '1rem 0 0.5rem', border: 'none', borderTop: '1px solid var(--border)' }}
      />
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{t('menu.options')}</div>
      {initial ? (
        <VariantGroupsPanel
          dish={initial}
          lang={lang}
          embedded
          onChanged={() => Promise.resolve()}
          onError={onError}
        />
      ) : (
        <div className="muted">{t('menu.saveDishFirst')}</div>
      )}
    </Modal>
  );
}

// ───────── Variant groups ─────────

function VariantGroupsPanel({
  dish,
  lang,
  onChanged,
  onError,
  embedded = false,
}: {
  dish: Dish | null;
  lang: LanguageCode;
  onChanged: () => Promise<void> | void;
  onError: (msg: string) => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [groups, setGroups] = useState<VariantGroup[]>([]);
  const [editing, setEditing] = useState<VariantGroup | 'new' | null>(null);

  useEffect(() => {
    if (!dish) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const list = await authedFetch((tk) => api.listVariantGroups(tk, dish.id));
        if (!cancelled) setGroups(list);
      } catch (err) {
        if (!cancelled) onError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dish, authedFetch, onError]);

  if (!dish) {
    return (
      <div className="card">
        <div className="muted">{t('menu.selectDish')}</div>
      </div>
    );
  }

  const Wrapper = embedded ? 'div' : 'div';
  const wrapperClass = embedded ? '' : 'card';

  return (
    <Wrapper className={wrapperClass}>
      {embedded ? (
        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setEditing('new')}
          >
            + {t('menu.newVariantGroup')}
          </button>
        </div>
      ) : (
        <div className="row-gap" style={{ justifyContent: 'space-between' }}>
          <strong>{pickLang(dish.name, lang)}</strong>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setEditing('new')}
          >
            + {t('menu.newVariantGroup')}
          </button>
        </div>
      )}
      <p className="faint" style={{ margin: '0.4rem 0 0' }}>
        {t('menu.variantGroupHelp')}
      </p>
      {groups.length === 0 ? (
        <div
          className="muted"
          style={{
            padding: '1rem',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginTop: '0.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>{t('menu.variantGroupEmpty')}</div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setEditing('new')}
          >
            + {t('menu.newVariantGroup')}
          </button>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: '0.75rem' }}>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.75rem',
              }}
            >
              <div className="row-gap" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{pickLang(g.name, lang)}</strong>{' '}
                  <span className="faint">
                    {g.selectionType} · {g.required ? t('menu.required') : 'optional'} · [{g.min}–
                    {g.max}]
                  </span>
                </div>
                <div className="row-gap">
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(g)}>
                    {t('menu.edit')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={async () => {
                      if (!window.confirm(t('menu.deleteConfirm'))) return;
                      try {
                        await authedFetch((tk) => api.deleteVariantGroup(tk, g.id));
                        await onChanged();
                      } catch (err) {
                        onError(getErrorMessage(err));
                      }
                    }}
                  >
                    {t('menu.delete')}
                  </button>
                </div>
              </div>
              {g.variants && g.variants.length > 0 ? (
                <ul
                  style={{
                    margin: '0.35rem 0 0',
                    paddingInlineStart: '1.25rem',
                    fontSize: '0.88rem',
                    color: 'var(--fg-soft)',
                  }}
                >
                  {g.variants.map((v) => (
                    <li key={v.id}>
                      {pickLang(v.name, lang)}{' '}
                      {v.priceDeltaMillimes !== 0 ? (
                        <span className="faint">
                          ({v.priceDeltaMillimes > 0 ? '+' : ''}
                          {formatMillimes(v.priceDeltaMillimes)})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {editing ? (
        <VariantGroupEditor
          dishId={dish.id}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            // Re-fetch groups + root dishes (so main list reflects edits)
            const list = await authedFetch((tk) => api.listVariantGroups(tk, dish.id));
            setGroups(list);
            await onChanged();
          }}
          onError={onError}
        />
      ) : null}
    </Wrapper>
  );
}

function VariantGroupEditor({
  dishId,
  initial,
  onClose,
  onSaved,
  onError,
}: {
  dishId: string;
  initial: VariantGroup | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [name, setName] = useState<LocalizedString>(initial?.name ?? { ...EMPTY_L10N });
  const [selectionType, setSelectionType] = useState<'single' | 'multi'>(
    initial?.selectionType ?? 'single',
  );
  const [required, setRequired] = useState(initial?.required ?? false);
  const [min, setMin] = useState(initial?.min ?? 0);
  const [max, setMax] = useState(initial?.max ?? 1);
  const [variants, setVariants] = useState<
    { id?: string; name: LocalizedString; priceDeltaMillimes: number; isActive: boolean }[]
  >(
    initial?.variants
      ? initial.variants.map((v) => ({
          id: v.id,
          name: v.name,
          priceDeltaMillimes: v.priceDeltaMillimes,
          isActive: v.isActive,
        }))
      : [],
  );
  const [busy, setBusy] = useState(false);

  const setVariant = (idx: number, patch: Partial<(typeof variants)[number]>) =>
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  const save = async () => {
    setBusy(true);
    try {
      if (initial) {
        await authedFetch((tk) =>
          api.updateVariantGroup(tk, initial.id, {
            name,
            selectionType,
            required,
            min,
            max,
            variants: variants.map((v) => ({
              ...(v.id ? { id: v.id } : {}),
              name: v.name,
              priceDeltaMillimes: v.priceDeltaMillimes,
              isActive: v.isActive,
            })),
          }),
        );
      } else {
        await authedFetch((tk) =>
          api.createVariantGroup(tk, dishId, {
            name,
            selectionType,
            required,
            min,
            max,
            variants: variants.map((v) => ({
              name: v.name,
              priceDeltaMillimes: v.priceDeltaMillimes,
              isActive: v.isActive,
            })),
          }),
        );
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
      title={initial ? (initial.name.fr || t('menu.newVariantGroup')) : t('menu.newVariantGroup')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('menu.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {t('menu.save')}
          </button>
        </>
      }
    >
      {/* Group name: FR + AR side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <label>
          Nom (FR)
          <input
            type="text"
            placeholder="ex: Garniture"
            value={name.fr ?? ''}
            onChange={(e) => setName({ ...name, fr: e.target.value })}
          />
        </label>
        <label>
          الاسم (AR)
          <input
            type="text"
            placeholder="مثال: الحشوة"
            dir="rtl"
            value={name.ar ?? ''}
            onChange={(e) => setName({ ...name, ar: e.target.value })}
          />
        </label>
      </div>

      {/* Selection type simplified */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'auto' }}>
          <input
            type="radio"
            name="selType"
            checked={selectionType === 'single'}
            style={{ width: 'auto' }}
            onChange={() => { setSelectionType('single'); setMin(1); setMax(1); setRequired(true); }}
          />
          Un seul choix
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'auto' }}>
          <input
            type="radio"
            name="selType"
            checked={selectionType === 'multi'}
            style={{ width: 'auto' }}
            onChange={() => { setSelectionType('multi'); setMin(0); setMax((m) => Math.max(m, 2)); setRequired(false); }}
          />
          Plusieurs choix
        </label>
        {selectionType === 'multi' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'auto' }}>
            Max :
            <input
              type="number"
              min={1}
              value={max}
              style={{ width: 56 }}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      {/* Variants table */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 32px', gap: '0.4rem 0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span className="faint" style={{ fontSize: '0.78rem' }}>Nom FR</span>
          <span className="faint" style={{ fontSize: '0.78rem' }}>الاسم AR</span>
          <span className="faint" style={{ fontSize: '0.78rem' }}>Prix TND</span>
          <span />
        </div>
        {variants.map((v, idx) => (
          <div
            key={v.id ?? `new-${idx}`}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 32px', gap: '0.4rem 0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}
          >
            <input
              type="text"
              placeholder="Escalope…"
              value={v.name.fr ?? ''}
              onChange={(e) => setVariant(idx, { name: { ...v.name, fr: e.target.value } })}
            />
            <input
              type="text"
              placeholder="اسكالوب…"
              dir="rtl"
              value={v.name.ar ?? ''}
              onChange={(e) => setVariant(idx, { name: { ...v.name, ar: e.target.value } })}
            />
            <input
              type="number"
              step="any"
              placeholder="0.000"
              value={(v.priceDeltaMillimes / 1000) || ''}
              onChange={(e) =>
                setVariant(idx, {
                  priceDeltaMillimes: Math.round(Number(e.target.value) * 1000),
                })
              }
            />
            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{ padding: '0 0.4rem' }}
              onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: '0.4rem' }}
          onClick={() =>
            setVariants((v) => [
              ...v,
              { name: { ...EMPTY_L10N }, priceDeltaMillimes: 0, isActive: true },
            ])
          }
        >
          + {t('menu.addVariant')}
        </button>
      </div>
    </Modal>
  );
}
