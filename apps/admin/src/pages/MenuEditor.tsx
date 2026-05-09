import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Category,
  Dish,
  LanguageCode,
  LocalizedString,
  VariantGroup,
} from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { Modal } from '@orvexa/ui';
import { TriLangInput } from '../components/TriLangInput.js';
import { formatMillimes, parseMillimes, pickLang } from '../utils/format.js';

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
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
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
        <button type="button" aria-pressed={tab === 'categories'} onClick={() => setTab('categories')}>
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
              setError(err instanceof ApiError ? err.message : (err as Error).message);
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
              setError(err instanceof ApiError ? err.message : (err as Error).message);
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
  const { t } = useTranslation();
  return (
    <div className="stack">
      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          + {t('menu.newCategory')}
        </button>
      </div>
      {categories.length === 0 ? (
        <div className="muted">{t('menu.noCategories')}</div>
      ) : (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('menu.tabs.categories')}</th>
              <th>{t('menu.active')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{pickLang(c.name, lang)}</td>
                <td>{c.isActive ? '✓' : '—'}</td>
                <td className="right">
                  <button type="button" className="btn btn-sm" onClick={() => onEdit(c)}>
                    {t('menu.edit')}
                  </button>{' '}
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(c)}>
                    {t('menu.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [name, setName] = useState<LocalizedString>(initial?.name ?? { ...EMPTY_L10N });
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (initial) {
        await authedFetch((tk) =>
          api.updateCategory(tk, initial.id, { name, isActive, sortOrder }),
        );
      } else {
        await authedFetch((tk) => api.createCategory(tk, { name, isActive, sortOrder }));
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : (err as Error).message);
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
      <TriLangInput
        value={name}
        onChange={setName}
        label={t('menu.namePerLang', { lang: '' })}
      />
      <label>
        {t('menu.active')}
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          style={{ width: 'auto' }}
        />
      </label>
      <label>
        Sort order
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </label>
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
  const catName = (id: string | null) =>
    id ? pickLang(categories.find((c) => c.id === id)?.name, lang) : '—';
  return (
    <div className="stack">
      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          + {t('menu.newDish')}
        </button>
      </div>
      {dishes.length === 0 ? (
        <div className="muted">{t('menu.noDishes')}</div>
      ) : (
        <table className="dt">
          <thead>
            <tr>
              <th>{t('menu.tabs.dishes')}</th>
              <th>{t('menu.category')}</th>
              <th className="right">{t('menu.price')}</th>
              <th>{t('menu.available')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dishes.map((d) => (
              <tr
                key={d.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onEdit(d)}
              >
                <td>{pickLang(d.name, lang)}</td>
                <td>{catName(d.categoryId)}</td>
                <td className="right">{formatMillimes(d.priceMillimes)}</td>
                <td>{d.available ? '✓' : '—'}</td>
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
      )}
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
  const [prepTimeInput, setPrepTimeInput] = useState<string>(
    initial?.prepTimeMinutes != null ? String(initial.prepTimeMinutes) : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const priceMillimes = parseMillimes(priceInput) ?? 0;
      const trimmedPrep = prepTimeInput.trim();
      const prepTimeMinutes: number | null = trimmedPrep === '' ? null : Number(trimmedPrep);
      let dish: Dish;
      if (initial) {
        dish = await authedFetch((tk) =>
          api.updateDish(tk, initial.id, {
            name,
            description,
            priceMillimes,
            prepTimeMinutes,
            available,
            sortOrder,
            categoryId,
          }),
        );
      } else {
        dish = await authedFetch((tk) =>
          api.createDish(tk, {
            name,
            description,
            priceMillimes,
            ...(prepTimeMinutes !== null ? { prepTimeMinutes } : {}),
            available,
            sortOrder,
            categoryId: categoryId ?? undefined,
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
      onError(err instanceof ApiError ? err.message : (err as Error).message);
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
      <div className="row-gap row-wrap">
        <label style={{ flex: 1 }}>
          {t('menu.price')}
          <input
            type="text"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="0.000"
          />
        </label>
        <label style={{ flex: 1 }}>
          {t('menu.prepTimeMinutes')}
          <input
            type="number"
            min={1}
            max={120}
            value={prepTimeInput}
            placeholder={t('menu.prepTimeUseDefault')}
            onChange={(e) => setPrepTimeInput(e.target.value)}
          />
        </label>
        <label style={{ flex: 1 }}>
          Sort
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </label>
      </div>
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
                style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
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
                    onError(err instanceof ApiError ? err.message : (err as Error).message);
                  }
                }}
              >
                {t('menu.delete')}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <hr style={{ margin: '1rem 0 0.5rem', border: 'none', borderTop: '1px solid var(--border)' }} />
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
        if (!cancelled) onError(err instanceof ApiError ? err.message : (err as Error).message);
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
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
            + {t('menu.newVariantGroup')}
          </button>
        </div>
      ) : (
        <div className="row-gap" style={{ justifyContent: 'space-between' }}>
          <strong>{pickLang(dish.name, lang)}</strong>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
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
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
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
                    {t('menu.save')}
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
                        onError(err instanceof ApiError ? err.message : (err as Error).message);
                      }
                    }}
                  >
                    {t('menu.delete')}
                  </button>
                </div>
              </div>
              {g.variants && g.variants.length > 0 ? (
                <ul style={{ margin: '0.35rem 0 0', paddingInlineStart: '1.25rem', fontSize: '0.88rem', color: 'var(--fg-soft)' }}>
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
      onError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? initial.name.fr : t('menu.newVariantGroup')}
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
      <div className="row-gap row-wrap">
        <label style={{ flex: 1 }}>
          {t('menu.selectionType')}
          <select
            value={selectionType}
            onChange={(e) => {
              const next = e.target.value as 'single' | 'multi';
              setSelectionType(next);
              if (next === 'single') {
                setMax(1);
                setMin((m) => Math.min(m, 1));
              } else {
                setMax((m) => Math.max(m, 2));
              }
            }}
          >
            <option value="single">{t('menu.single')}</option>
            <option value="multi">{t('menu.multi')}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            style={{ width: 'auto', marginInlineEnd: '0.5rem' }}
          />
          {t('menu.required')}
        </label>
        <label>
          {t('menu.min')}
          <input type="number" min={0} value={min} onChange={(e) => setMin(Number(e.target.value))} />
        </label>
        <label>
          {t('menu.max')}
          <input type="number" min={1} value={max} onChange={(e) => setMax(Number(e.target.value))} />
        </label>
      </div>
      <div>
        <div className="row-gap" style={{ justifyContent: 'space-between' }}>
          <strong>{t('menu.variants')}</strong>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setVariants((v) => [
                ...v,
                { name: { ...EMPTY_L10N }, priceDeltaMillimes: 0, isActive: true },
              ])
            }
          >
            {t('menu.addVariant')}
          </button>
        </div>
        <div className="stack" style={{ marginTop: '0.5rem' }}>
          {variants.map((v, idx) => (
            <div
              key={v.id ?? `new-${idx}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.65rem',
              }}
            >
              <TriLangInput
                value={v.name}
                onChange={(n) => setVariant(idx, { name: n })}
                label={t('menu.variantName')}
              />
              <div className="row-gap row-wrap" style={{ marginTop: '0.4rem' }}>
                <label style={{ flex: 1 }}>
                  {t('menu.priceDelta')}
                  <input
                    type="number"
                    step="any"
                    value={(v.priceDeltaMillimes / 1000).toString()}
                    onChange={(e) =>
                      setVariant(idx, {
                        priceDeltaMillimes: Math.round(Number(e.target.value) * 1000),
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={v.isActive}
                    onChange={(e) => setVariant(idx, { isActive: e.target.checked })}
                    style={{ width: 'auto', marginInlineEnd: '0.5rem' }}
                  />
                  {t('menu.active')}
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                >
                  {t('menu.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
