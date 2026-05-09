import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Dish, LanguageCode } from '@orvexa/shared';
import { Toast } from '@orvexa/ui';
import { api, type MenuTreeCategory } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import { useCartStore, cartLineCount, cartSubtotal } from '../store/cart.js';
import { connectCustomerSocket } from '../socket/client.js';
import { CartDrawer } from '../components/CartDrawer.js';
import { ExtrasSheet } from '../components/ExtrasSheet.js';
import { ItemDetailModal } from '../components/ItemDetailModal.js';
import { IconArrowRight, IconSearch } from '../components/tf-icons.js';
import { formatMillimes, pickLang } from '../utils/format.js';

const ALL_CAT = '__all__';

export function Menu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';

  const [tree, setTree] = useState<MenuTreeCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(ALL_CAT);
  const [search, setSearch] = useState('');
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [openCart, setOpenCart] = useState(false);
  const [openExtras, setOpenExtras] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const lines = useCartStore((s) => s.lines);
  const prevCountRef = useRef(0);

  // redirect if no session
  useEffect(() => {
    if (!token || !session) {
      navigate('/', { replace: true });
    }
  }, [token, session, navigate]);

  // load menu (initial + on reloadKey bump)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.getMenu(token);
        if (cancelled) return;
        setTree(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : (err as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  // socket: bump reloadKey on menu:updated
  useEffect(() => {
    if (!token) return;
    const socket = connectCustomerSocket(token);
    const handler = () => setReloadKey((k) => k + 1);
    socket.on('menu:updated', handler);
    return () => {
      socket.off('menu:updated', handler);
    };
  }, [token]);

  // keep openDish in sync when menu tree reloads (e.g. admin updated variants)
  useEffect(() => {
    if (!openDish || !tree) return;
    const fresh = tree.flatMap((c) => c.dishes).find((d) => d.id === openDish.id);
    if (fresh) queueMicrotask(() => setOpenDish(fresh));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  const lineCount = cartLineCount(lines);
  const subtotal = cartSubtotal(lines);

  // Pulse FAB + toast on cart additions
  useEffect(() => {
    if (lineCount > prevCountRef.current) {
      setAddedToast(t('cart.added'));
      setPulse(true);
      const id = window.setTimeout(() => setPulse(false), 600);
      prevCountRef.current = lineCount;
      return () => window.clearTimeout(id);
    }
    prevCountRef.current = lineCount;
    return undefined;
  }, [lineCount, t]);

  const visibleCategories = useMemo(
    () => (tree ?? []).filter((c) => c.dishes.length > 0),
    [tree],
  );

  const lower = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!tree) return [] as Dish[];
    const all = tree.flatMap((c) => c.dishes.map((d) => ({ ...d, _cat: c.id })));
    return all.filter((d) => {
      const matchCat = activeCat === ALL_CAT || d._cat === activeCat;
      if (!matchCat) return false;
      if (!lower) return true;
      return (
        pickLang(d.name, lang).toLowerCase().includes(lower) ||
        (d.description && pickLang(d.description, lang).toLowerCase().includes(lower))
      );
    });
  }, [tree, activeCat, lower, lang]);

  const isLoading = tree === null && error === null;
  const showGrouped = activeCat === ALL_CAT && !lower;

  // Restaurant name → split first word + remainder for the display-italic feel
  const headline = (() => {
    const name = restaurant?.name?.trim() ?? 'Orvexa';
    const idx = name.indexOf(' ');
    if (idx === -1) return { first: name, rest: '' };
    return { first: name.slice(0, idx), rest: name.slice(idx + 1) };
  })();

  return (
    <div className="tf-menu">
      {/* Hero */}
      <div className="tf-menu__hero">
        <h1 className="tf-menu__title">
          {headline.first}
          {headline.rest ? (
            <>
              {' '}
              <span className="tf-display">{headline.rest}</span>
            </>
          ) : null}
        </h1>
        <p className="tf-menu__sub">{t('menu.serviceHours')}</p>
        <div className="tf-menu__search">
          <div className="tf-search">
            <IconSearch />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('menu.searchPlaceholder', { defaultValue: 'Search the menu' })}
              aria-label={t('menu.searchPlaceholder', { defaultValue: 'Search the menu' })}
            />
          </div>
        </div>
        <button
          type="button"
          className="tf-menu__extras"
          onClick={() => setOpenExtras(true)}
        >
          {t('extras.openCta')}
        </button>
      </div>

      {/* Category strip */}
      {tree !== null && visibleCategories.length > 0 ? (
        <nav className="tf-cat-strip" aria-label={t('menu.categories', { defaultValue: 'Categories' })}>
          <div className="tf-cat-strip__inner">
            <button
              type="button"
              className="tf-cat-pill"
              aria-pressed={activeCat === ALL_CAT}
              onClick={() => setActiveCat(ALL_CAT)}
            >
              {t('menu.all', { defaultValue: 'All' })}
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="tf-cat-pill"
                aria-pressed={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              >
                {pickLang(c.name, lang)}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {/* List */}
      <div className="tf-menu__list">
        {error ? <div className="error-banner">{error}</div> : null}

        {isLoading ? (
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 14,
                  background: 'var(--bg-elev)',
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                }}
                aria-hidden="true"
              >
                <div className="skeleton" style={{ width: 84, height: 84 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 16, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '90%' }} />
                  <div className="skeleton" style={{ height: 14, width: 56 }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && visibleCategories.length === 0 && tree !== null ? (
          <div className="empty-state">{t('menu.empty')}</div>
        ) : null}

        {!isLoading && showGrouped
          ? visibleCategories.map((c) => (
              <section key={c.id} className="tf-menu__section">
                <div className="tf-menu__section-head">
                  <h2 className="tf-menu__section-title">{pickLang(c.name, lang)}</h2>
                </div>
                <div>
                  {c.dishes.map((d) => (
                    <DishRow
                      key={d.id}
                      dish={d}
                      lang={lang}
                      unavailableLabel={t('menu.unavailable')}
                      onOpen={() => d.available && setOpenDish(d)}
                    />
                  ))}
                </div>
              </section>
            ))
          : null}

        {!isLoading && !showGrouped ? (
          filtered.length === 0 ? (
            <div className="tf-empty-search">
              <div className="tf-empty-search__title">
                {t('menu.searchEmpty', {
                  defaultValue: 'Nothing matches “{{q}}”.',
                  q: search,
                })}
              </div>
              <div className="tf-empty-search__sub">
                {t('menu.searchEmptySub', {
                  defaultValue: 'Try a category or ask your waiter.',
                })}
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: 8 }}>
              {filtered.map((d) => (
                <DishRow
                  key={d.id}
                  dish={d}
                  lang={lang}
                  unavailableLabel={t('menu.unavailable')}
                  onOpen={() => d.available && setOpenDish(d)}
                />
              ))}
            </div>
          )
        ) : null}
      </div>

      {openDish ? (
        <ItemDetailModal dish={openDish} lang={lang} onClose={() => setOpenDish(null)} />
      ) : null}
      {openCart ? <CartDrawer lang={lang} onClose={() => setOpenCart(false)} /> : null}
      {openExtras ? <ExtrasSheet onClose={() => setOpenExtras(false)} /> : null}

      {!openCart && !openDish ? (
        <button
          type="button"
          className={`tf-cart-fab${pulse ? ' is-pulsing' : ''}`}
          onClick={() => setOpenCart(true)}
          aria-label={t('cart.view')}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span className="tf-cart-fab__count">{lineCount}</span>
            <span className="tf-cart-fab__label">{t('cart.review')}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span className="tf-cart-fab__total">{formatMillimes(subtotal)}</span>
            <IconArrowRight size={16} style={{ marginInlineStart: 8, opacity: 0.7 }} />
          </span>
        </button>
      ) : null}

      {addedToast ? <Toast message={addedToast} onDone={() => setAddedToast(null)} /> : null}
    </div>
  );
}

function DishRow({
  dish,
  lang,
  onOpen,
  unavailableLabel,
}: {
  dish: Dish;
  lang: LanguageCode;
  onOpen: () => void;
  unavailableLabel: string;
}) {
  return (
    <button
      type="button"
      className={`tf-row${dish.available ? '' : ' is-unavailable'}`}
      onClick={onOpen}
      aria-label={pickLang(dish.name, lang)}
    >
      <div className="tf-row__body">
        <div className="tf-row__title">
          <h3 className="tf-row__name">{pickLang(dish.name, lang)}</h3>
          {!dish.available ? <span className="tf-row__badge">{unavailableLabel}</span> : null}
        </div>
        {dish.description ? (
          <p className="tf-row__desc">{pickLang(dish.description, lang)}</p>
        ) : null}
        <div className="tf-row__meta">
          <span className="tf-row__price">{formatMillimes(dish.priceMillimes)}</span>
        </div>
      </div>
      {(() => {
        const heroSrc = dish.imageUrl ?? dish.imageUrls?.[0] ?? null;
        return (
          <div
            className={`tf-row__hero${heroSrc ? '' : ' tf-row__hero--ph'}`}
            style={heroSrc ? { backgroundImage: `url(${heroSrc})` } : undefined}
            aria-hidden="true"
          />
        );
      })()}
    </button>
  );
}
