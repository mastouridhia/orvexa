import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Dish, LanguageCode, OrderStatus, PaymentStatus } from '@orvexa/shared';
import { Toast } from '@orvexa/ui';
import { api, type MenuTreeCategory } from '../api/queries.js';
import { handleApiError } from '../api/errorMessage.js';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { useCartStore, cartLineCount, cartSubtotal } from '../store/cart.js';
import { connectCustomerSocket } from '../socket/client.js';
import { useSharedCart } from '../hooks/useSharedCart.js';
import { CartDrawer } from '../components/CartDrawer.js';
import { ExtrasSheet } from '../components/ExtrasSheet.js';
import { ItemDetailModal } from '../components/ItemDetailModal.js';
import { IconArrowRight, IconSearch } from '../components/tf-icons.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import { isPlan1 } from '../utils/plan.js';

export function Menu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';

  const [tree, setTree] = useState<MenuTreeCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [openCart, setOpenCart] = useState(false);
  const [openExtras, setOpenExtras] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const lines = useCartStore((s) => s.lines);
  const prevCountRef = useRef(0);

  useSharedCart();

  const orderIds = useOrderRefsStore((s) => s.ids);
  type OrderRef = {
    id: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    totalMillimes: number;
  };
  const [sessionOrders, setSessionOrders] = useState<OrderRef[]>([]);

  // Fetch every remembered order on this device — the customer needs to see
  // every round on their table, not just the latest. Cancelled orders are
  // dropped; everything else (received → served) stays on the list. Live
  // status pushes keep it fresh.
  useEffect(() => {
    if (!token || orderIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionOrders([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const fetched: OrderRef[] = [];
      for (const id of orderIds) {
        try {
          const o = await api.getOrder(token, id);
          if (o.status === 'cancelled') continue;
          fetched.push({
            id: o.id,
            status: o.status,
            paymentStatus: o.paymentStatus,
            totalMillimes: o.totalMillimes,
          });
        } catch {
          // skip — order may have been purged or no longer accessible
        }
      }
      if (!cancelled) setSessionOrders(fetched);
    })();
    const socket = connectCustomerSocket(token);
    const onStatus = (payload: { orderId: string; status: OrderStatus }) => {
      setSessionOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === payload.orderId);
        if (idx < 0) return prev;
        if (payload.status === 'cancelled') {
          return prev.filter((_, i) => i !== idx);
        }
        const next = prev.slice();
        next[idx] = { ...next[idx], status: payload.status };
        return next;
      });
    };
    socket.on('order:status', onStatus);
    return () => {
      cancelled = true;
      socket.off('order:status', onStatus);
    };
  }, [token, orderIds]);

  // Keep served (but unpaid) rounds in the banner so the customer still has
  // an entry point to the order tracker / bill / call-waiter actions.
  const activeOrders = useMemo(
    () => sessionOrders.filter((o) => o.paymentStatus !== 'paid'),
    [sessionOrders],
  );

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
          setError(handleApiError(err, t));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, t]);

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

  const PLAT_DU_JOUR_ID = 'plat-du-jour';

  const visibleCategories = useMemo(() => (tree ?? []).filter((c) => c.dishes.length > 0), [tree]);
  const platDuJourDishes = useMemo(
    () => (tree ?? []).flatMap((c) => c.dishes).filter((d) => d.isPlatDuJour && d.available),
    [tree],
  );

  // Default to first category once tree loads (Plat du Jour takes priority)
  useEffect(() => {
    if (activeCat === null && (platDuJourDishes.length > 0 || visibleCategories.length > 0)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveCat(platDuJourDishes.length > 0 ? PLAT_DU_JOUR_ID : visibleCategories[0].id);
    }
  }, [activeCat, visibleCategories, platDuJourDishes]);

  const lower = search.trim().toLowerCase();
  const isSearching = lower.length > 0;
  const filtered = useMemo(() => {
    if (!tree) return [] as Dish[];
    if (!isSearching && activeCat === PLAT_DU_JOUR_ID) return platDuJourDishes;
    const all = tree.flatMap((c) => c.dishes.map((d) => ({ ...d, _cat: c.id })));
    return all.filter((d) => {
      // When searching, span all categories; otherwise restrict to active pill
      if (!isSearching && activeCat && d._cat !== activeCat) return false;
      if (!isSearching) return true;
      return (
        pickLang(d.name, lang).toLowerCase().includes(lower) ||
        (d.description && pickLang(d.description, lang).toLowerCase().includes(lower))
      );
    });
  }, [tree, activeCat, lower, isSearching, lang, platDuJourDishes]);

  const isLoading = tree === null && error === null;

  // Restaurant name → split first word + remainder for the display-italic feel
  const headline = (() => {
    const name = restaurant?.name?.trim() ?? 'Orvexa';
    const idx = name.indexOf(' ');
    if (idx === -1) return { first: name, rest: '' };
    return { first: name.slice(0, idx), rest: name.slice(idx + 1) };
  })();

  return (
    <div className="tf-menu">
      {!isPlan1 && activeOrders.length > 0 ? (
        <div className="tf-active-order-stack">
          {activeOrders.length > 1 ? (
            <div className="tf-active-order-stack__head">
              {t('menu.activeOrdersHead', {
                count: activeOrders.length,
                defaultValue: '{{count}} active orders',
              })}
            </div>
          ) : null}
          {activeOrders.map((o, idx) => (
            <button
              type="button"
              key={o.id}
              className="tf-active-order-banner"
              onClick={() => navigate(`/orders/${o.id}`)}
            >
              <span>
                {activeOrders.length > 1
                  ? `${t('menu.round', { defaultValue: 'Round' })} ${activeOrders.length - idx} · `
                  : ''}
                {t('menu.activeOrderTitle', {
                  id: o.id.slice(0, 8).toUpperCase(),
                  status: t(`order.status.${o.status}`),
                })}
              </span>
              <span className="tf-active-order-banner__cta">
                {t('menu.activeOrderCta')} <IconArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
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
        {!isPlan1 && <p className="tf-menu__sub">{t('menu.serviceHours')}</p>}
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
        {!isPlan1 && (
          <button type="button" className="tf-menu__extras" onClick={() => setOpenExtras(true)}>
            {t('extras.openCta')}
          </button>
        )}
      </div>

      {/* Category strip */}
      {tree !== null && (platDuJourDishes.length > 0 || visibleCategories.length > 0) ? (
        <nav
          className="tf-cat-strip"
          aria-label={t('menu.categories', { defaultValue: 'Categories' })}
        >
          <div className="tf-cat-strip__inner">
            {platDuJourDishes.length > 0 && (
              <button
                key={PLAT_DU_JOUR_ID}
                type="button"
                className="tf-cat-pill"
                aria-pressed={activeCat === PLAT_DU_JOUR_ID}
                onClick={() => setActiveCat(PLAT_DU_JOUR_ID)}
              >
                ⭐ {t('menu.platDuJour', { defaultValue: 'Plat du Jour' })}
              </button>
            )}
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
        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
              {t('errors.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : null}

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

        {!isLoading && tree !== null ? (
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
                  onOpen={isPlan1 ? null : () => d.available && setOpenDish(d)}
                />
              ))}
            </div>
          )
        ) : null}
      </div>

      {!isPlan1 && openDish ? (
        <ItemDetailModal dish={openDish} lang={lang} onClose={() => setOpenDish(null)} />
      ) : null}
      {!isPlan1 && openCart ? <CartDrawer lang={lang} onClose={() => setOpenCart(false)} /> : null}
      {!isPlan1 && openExtras ? <ExtrasSheet onClose={() => setOpenExtras(false)} /> : null}

      {!isPlan1 && !openCart && !openDish ? (
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

      {!isPlan1 && addedToast ? <Toast message={addedToast} onDone={() => setAddedToast(null)} /> : null}
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
  onOpen: (() => void) | null;
  unavailableLabel: string;
}) {
  const inner = (
    <>
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
    </>
  );

  if (!onOpen) {
    return (
      <div className={`tf-row${dish.available ? '' : ' is-unavailable'}`}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`tf-row${dish.available ? '' : ' is-unavailable'}`}
      onClick={onOpen}
      aria-label={pickLang(dish.name, lang)}
    >
      {inner}
    </button>
  );
}
