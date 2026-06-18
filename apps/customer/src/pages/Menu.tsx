import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Dish, LanguageCode, OrderStatus, PaymentStatus } from '@orvexa/shared';
import { Toast } from '@orvexa/ui';
import { api, type MenuTreeCategory } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { handleApiError } from '../api/errorMessage.js';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { useCartStore, cartLineCount, cartSubtotal, makeLine } from '../store/cart.js';
import { connectCustomerSocket } from '../socket/client.js';
import { useSharedCart } from '../hooks/useSharedCart.js';
import { CartDrawer } from '../components/CartDrawer.js';
import { ItemDetailModal } from '../components/ItemDetailModal.js';
import { IconArrowRight, IconBag, IconMinus, IconPlus, IconSearch } from '../components/tf-icons.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import { serviceStatus } from '../utils/serviceStatus.js';
import { useMenuOnly } from '../utils/plan.js';

export function Menu() {
  const menuOnly = useMenuOnly();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const previewSlug = useSessionStore((s) => s.previewSlug);
  const restaurant = useSessionStore((s) => s.restaurant);
  const setRestaurant = useSessionStore((s) => s.setRestaurant);
  const lang = (i18n.resolvedLanguage as LanguageCode) ?? 'fr';

  const [tree, setTree] = useState<MenuTreeCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [openCart, setOpenCart] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.add);
  const setLineQuantity = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.remove);
  const prevCountRef = useRef(0);

  useSharedCart();

  const orderIds = useOrderRefsStore((s) => s.ids);
  const forgetOrderRef = useOrderRefsStore((s) => s.forget);
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
        } catch (err) {
          // An orphaned ref (left over from a previous session) returns 403/404 —
          // drop it so it stops being refetched on every menu load.
          if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
            forgetOrderRef(id);
          }
          // otherwise skip — order may be temporarily inaccessible (network, etc.)
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
  }, [token, orderIds, forgetOrderRef]);

  // Keep served (but unpaid) rounds in the banner so the customer still has
  // an entry point to the order tracker / bill / call-waiter actions.
  const activeOrders = useMemo(
    () => sessionOrders.filter((o) => o.paymentStatus !== 'paid'),
    [sessionOrders],
  );

  // redirect if no session (preview mode has no session but is allowed)
  useEffect(() => {
    if (!previewSlug && (!token || !session)) {
      navigate('/', { replace: true });
    }
  }, [token, session, previewSlug, navigate]);

  // load menu (initial + on reloadKey bump). Preview mode pulls the public,
  // table-less menu by slug; the normal flow uses the session token.
  useEffect(() => {
    if (!token && !previewSlug) return;
    let cancelled = false;
    void (async () => {
      try {
        if (previewSlug) {
          const { restaurant: info, menu } = await api.getPublicMenu(previewSlug);
          if (cancelled) return;
          setRestaurant(info);
          setTree(menu);
        } else {
          const data = await api.getMenu(token!);
          if (cancelled) return;
          setTree(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(handleApiError(err, t));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, previewSlug, reloadKey, t, setRestaurant]);

  // Refresh the restaurant (plan + info) on every menu open. The persisted copy
  // can be stale — e.g. the owner upgraded the plan after this device's last scan —
  // and the plan drives ordering capability gating (menuOnly). Refetching here keeps
  // an already-open session in sync without forcing a rescan.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const info = await api.getRestaurant(token);
        if (!cancelled) setRestaurant(info);
      } catch {
        // keep the persisted restaurant on failure — never block the menu
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, setRestaurant]);

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

  // A dish opens the detail modal when it has at least one selectable variant;
  // otherwise it can be added straight from the card with an inline stepper.
  const dishNeedsModal = (dish: Dish) =>
    (dish.variantGroups ?? []).some((g) => (g.variants ?? []).some((v) => v.isActive));
  // Simple dishes have exactly one cart line (no variants, no notes).
  const simpleLineFor = (dishId: string) =>
    lines.find((l) => l.dishId === dishId && l.variants.length === 0 && !l.notes);

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
    if (!tree) return [] as (Dish & { _cat?: string; _catActive: boolean })[];
    if (!isSearching && activeCat === PLAT_DU_JOUR_ID)
      return platDuJourDishes.map((d) => ({ ...d, _catActive: true }));
    const all = tree.flatMap((c) =>
      c.dishes.map((d) => ({ ...d, _cat: c.id, _catActive: c.isActive })),
    );
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

  // Live service line, derived from the owner's opening hours (admin Settings).
  // null = today's hours unspecified → the subtitle is hidden entirely.
  const service = useMemo(() => serviceStatus(restaurant?.openingHours), [restaurant?.openingHours]);

  // Restaurant name → split first word + remainder for the display-italic feel
  const headline = (() => {
    const name = restaurant?.name?.trim() ?? 'Orvexa';
    const idx = name.indexOf(' ');
    if (idx === -1) return { first: name, rest: '' };
    return { first: name.slice(0, idx), rest: name.slice(idx + 1) };
  })();

  return (
    <div className="tf-menu">
      {!menuOnly && activeOrders.length > 0 ? (
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
        {!menuOnly && service ? (
          <p className="tf-menu__sub">
            {service.kind === 'closedToday'
              ? t('menu.closedToday')
              : t(service.kind === 'openUntil' ? 'menu.openUntil' : 'menu.opensAt', {
                  time: service.time,
                })}
          </p>
        ) : null}
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
            <>
              <div className="tf-menu__section-head">
                <h2 className="tf-menu__section-title">
                  {isSearching
                    ? t('menu.searchResults', { defaultValue: 'Résultats' })
                    : activeCat === PLAT_DU_JOUR_ID
                      ? t('menu.platDuJour', { defaultValue: 'Plat du Jour' })
                      : (() => {
                          const cat = visibleCategories.find((c) => c.id === activeCat);
                          return cat ? pickLang(cat.name, lang) : '';
                        })()}
                </h2>
                <span className="tf-menu__section-count">
                  {t('menu.itemCount', {
                    count: filtered.length,
                    defaultValue: '{{count}} plats',
                  })}
                </span>
              </div>
              {filtered.map((d) => {
                const needsModal = dishNeedsModal(d);
                const simpleLine = needsModal ? undefined : simpleLineFor(d.id);
                const qty = simpleLine?.quantity ?? 0;
                const canOrder = !menuOnly && d._catActive && d.available;
                const action = !canOrder ? null : needsModal ? (
                  <button
                    type="button"
                    className="tf-add-btn"
                    onClick={() => setOpenDish(d)}
                    aria-label={t('cart.add')}
                  >
                    <IconPlus size={18} />
                  </button>
                ) : qty === 0 ? (
                  <button
                    type="button"
                    className="tf-add-btn"
                    onClick={() => addLine(makeLine(d, [], 1))}
                    aria-label={t('cart.add')}
                  >
                    <IconPlus size={18} />
                  </button>
                ) : (
                  <div className="tf-qty-ctrl">
                    <button
                      type="button"
                      className="tf-qty-btn"
                      onClick={() =>
                        qty <= 1
                          ? removeLine(simpleLine!.uid)
                          : setLineQuantity(simpleLine!.uid, qty - 1)
                      }
                      aria-label={t('cart.decrease', { defaultValue: 'Decrease' })}
                    >
                      <IconMinus size={16} />
                    </button>
                    <span className="tf-qty-num" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="tf-qty-btn"
                      onClick={() => setLineQuantity(simpleLine!.uid, qty + 1)}
                      aria-label={t('cart.increase', { defaultValue: 'Increase' })}
                    >
                      <IconPlus size={16} />
                    </button>
                  </div>
                );
                return (
                  <DishRow
                    key={d.id}
                    dish={d}
                    lang={lang}
                    unavailableLabel={t('menu.unavailable')}
                    categoryInactive={!d._catActive}
                    onOpen={menuOnly || !d._catActive ? null : () => d.available && setOpenDish(d)}
                    action={action}
                  />
                );
              })}
            </>
          )
        ) : null}

      </div>

      {!menuOnly && openDish ? (
        <ItemDetailModal dish={openDish} lang={lang} onClose={() => setOpenDish(null)} />
      ) : null}
      {!menuOnly && openCart ? <CartDrawer lang={lang} onClose={() => setOpenCart(false)} /> : null}

      {!menuOnly && !openCart && !openDish && lineCount > 0 ? (
        <div className="tf-cart-bar">
          <button
            type="button"
            className={`tf-cart-bar__pill${pulse ? ' is-pulsing' : ''}`}
            onClick={() => setOpenCart(true)}
            aria-label={t('cart.view')}
          >
            <span className="tf-cart-bar__left">
              <IconBag size={18} />
              <span className="tf-cart-bar__label">{t('cart.review')}</span>
              <span className="tf-cart-bar__badge">{lineCount}</span>
            </span>
            <span className="tf-cart-bar__total">{formatMillimes(subtotal)}</span>
          </button>
        </div>
      ) : null}

      {!menuOnly && addedToast ? <Toast message={addedToast} onDone={() => setAddedToast(null)} /> : null}
    </div>
  );
}

function DishRow({
  dish,
  lang,
  onOpen,
  unavailableLabel,
  categoryInactive = false,
  action = null,
}: {
  dish: Dish;
  lang: LanguageCode;
  onOpen: (() => void) | null;
  unavailableLabel: string;
  categoryInactive?: boolean;
  action?: ReactNode;
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
        {(dish.variantGroups ?? []).map((g) => {
          const active = (g.variants ?? []).filter((v) => v.isActive);
          if (active.length === 0) return null;
          return (
            <p key={g.id} className="tf-row__variants">
              {active
                .map((v) => {
                  const price = dish.priceMillimes + v.priceDeltaMillimes;
                  return `${pickLang(v.name, lang)} ${formatMillimes(price)}`;
                })
                .join(' · ')}
            </p>
          );
        })}
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

  const rowClass = `tf-row${dish.available ? '' : ' is-unavailable'}${categoryInactive ? ' is-cat-inactive' : ''}`;

  return (
    <div className={rowClass}>
      {onOpen ? (
        <button
          type="button"
          className="tf-row__open"
          onClick={onOpen}
          aria-label={pickLang(dish.name, lang)}
        >
          {inner}
        </button>
      ) : (
        <div className="tf-row__open">{inner}</div>
      )}
      {action}
    </div>
  );
}
