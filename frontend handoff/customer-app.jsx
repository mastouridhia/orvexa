// customer-app.jsx — TableFlow customer prototype
// Stateful: menu browsing, item detail sheet (parallax), cart slide-up (spring),
// order tracking (live timeline), call-waiter (confirmation moment), bill request.
//
// Single canvas-ready component; renders into a 402x874 iOS frame slot.

const SCREENS = {
  MENU: 'menu',
  ITEM: 'item',
  CART: 'cart',
  TRACKING: 'tracking',
  WAITER: 'waiter',
  BILL: 'bill',
};

function CustomerApp() {
  const [screen, setScreen] = React.useState(SCREENS.MENU);
  const [activeItem, setActiveItem] = React.useState(null);
  const [cat, setCat] = React.useState('all');
  const [cart, setCart] = React.useState([]); // [{id, qty, notes}]
  const [orderState, setOrderState] = React.useState(null); // null | 'received' | 'preparing' | 'ready' | 'served'
  const [waiterCalled, setWaiterCalled] = React.useState(null); // null | 'pending' | 'ack'
  const [billRequested, setBillRequested] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const items = TF_MENU.items;
  const filtered = items.filter((it) =>
    (cat === 'all' || it.cat === cat) &&
    (!search || it.name.toLowerCase().includes(search.toLowerCase()))
  );

  const cartItems = cart.map((c) => ({ ...c, item: items.find((i) => i.id === c.id) }));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cartItems.reduce((s, c) => s + c.qty * c.item.price, 0);

  const addToCart = (id) => {
    setCart((cs) => {
      const ex = cs.find((c) => c.id === id);
      if (ex) return cs.map((c) => c.id === id ? { ...c, qty: c.qty + 1 } : c);
      return [...cs, { id, qty: 1 }];
    });
  };
  const setQty = (id, q) => {
    setCart((cs) => q <= 0 ? cs.filter((c) => c.id !== id) : cs.map((c) => c.id === id ? { ...c, qty: q } : c));
  };

  const placeOrder = () => {
    setOrderState('received');
    setScreen(SCREENS.TRACKING);
    // simulate kitchen progress
    setTimeout(() => setOrderState('preparing'), 3500);
    setTimeout(() => setOrderState('ready'), 9000);
  };

  const callWaiter = () => {
    setWaiterCalled('pending');
    setTimeout(() => setWaiterCalled('ack'), 2200);
  };

  const requestBill = () => {
    setBillRequested(true);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#FAF8F4', overflow: 'hidden' }}>
      {/* MENU ─────────────────────────────────────────────── */}
      {(screen === SCREENS.MENU || screen === SCREENS.ITEM) && (
        <MenuScreen
          cat={cat} setCat={setCat}
          items={filtered}
          onItem={(it) => { setActiveItem(it); setScreen(SCREENS.ITEM); }}
          search={search} setSearch={setSearch}
          orderState={orderState}
          onTracking={() => setScreen(SCREENS.TRACKING)}
        />
      )}

      {/* ITEM detail sheet with parallax hero */}
      {screen === SCREENS.ITEM && activeItem && (
        <ItemSheet
          item={activeItem}
          onClose={() => setScreen(SCREENS.MENU)}
          onAdd={(qty) => { for (let i = 0; i < qty; i++) addToCart(activeItem.id); setScreen(SCREENS.MENU); }}
        />
      )}

      {/* CART slide-up */}
      {screen === SCREENS.CART && (
        <CartSheet
          items={cartItems} total={cartTotal}
          onClose={() => setScreen(SCREENS.MENU)}
          setQty={setQty}
          onPlace={placeOrder}
        />
      )}

      {/* TRACKING */}
      {screen === SCREENS.TRACKING && (
        <TrackingScreen
          orderState={orderState}
          items={cartItems} total={cartTotal}
          onBack={() => setScreen(SCREENS.MENU)}
          onWaiter={() => setScreen(SCREENS.WAITER)}
          onBill={() => setScreen(SCREENS.BILL)}
        />
      )}

      {/* WAITER */}
      {screen === SCREENS.WAITER && (
        <WaiterScreen
          state={waiterCalled} onCall={callWaiter}
          onClose={() => { setScreen(orderState ? SCREENS.TRACKING : SCREENS.MENU); setTimeout(() => setWaiterCalled(null), 600); }}
        />
      )}

      {/* BILL */}
      {screen === SCREENS.BILL && (
        <BillScreen
          items={cartItems} total={cartTotal}
          requested={billRequested} onRequest={requestBill}
          onClose={() => setScreen(SCREENS.TRACKING)}
        />
      )}

      {/* PERSISTENT CART FAB on menu */}
      {(screen === SCREENS.MENU) && cartCount > 0 && (
        <CartFab count={cartCount} total={cartTotal} onClick={() => setScreen(SCREENS.CART)} />
      )}
    </div>
  );
}

// ── MENU SCREEN ─────────────────────────────────────────────────────────────
function MenuScreen({ cat, setCat, items, onItem, search, setSearch, orderState, onTracking }) {
  const r = TF_MENU.restaurant;
  const cats = TF_MENU.categories;
  return (
    <div className="tf" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header — hand-numbered table chip + vertical timestamp */}
      <div style={{ padding: '70px 20px 12px', flexShrink: 0, background: '#FAF8F4', position: 'relative', zIndex: 2 }}>
        {/* vertical timestamp running up the right edge */}
        <div className="tf-mono" style={{
          position: 'absolute', right: 14, top: 70, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          fontSize: 10, letterSpacing: 2.4, color: 'rgba(25,20,14,0.4)', textTransform: 'uppercase',
        }}>SERVED · 13:42 · TUE</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingRight: 24 }}>
          {/* hand-numbered table chip — display italic numeral on a saffron card */}
          <div style={{ display: 'inline-flex', alignItems: 'stretch', gap: 0, borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(25,20,14,0.08)' }}>
            <div style={{ background: '#FBEED9', padding: '6px 10px 6px 12px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="tf-mono" style={{ fontSize: 9, letterSpacing: 1.4, color: 'rgba(124,63,18,0.7)', textTransform: 'uppercase' }}>Table</span>
              <span className="display" style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: '#7C3F12', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{r.table}</span>
            </div>
            <div style={{ background: '#fff', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#2E8B57' }} />
              <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(25,20,14,0.6)', textTransform: 'uppercase' }}>Open</span>
            </div>
          </div>
          <button style={{ width: 34, height: 34, borderRadius: 17, border: '1px solid rgba(25,20,14,0.08)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lang" size={16} color="#19140E" />
          </button>
        </div>
        <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 500, letterSpacing: -1, marginBottom: 4 }}>
          {r.name.split(' ')[0]} <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>{r.name.split(' ')[1]}</span>
        </div>
        <div style={{ fontSize: 14, color: 'rgba(25,20,14,0.6)' }}>Lunch service · until 16:00</div>

        {/* search */}
        <div style={{ marginTop: 16 }}>
          <TFInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the menu" leading={<Icon name="search" size={16} color="rgba(25,20,14,0.5)" />} />
        </div>
      </div>

      {/* Category strip — sticky-feeling */}
      <div style={{ padding: '4px 0 12px', flexShrink: 0, background: '#FAF8F4', borderBottom: '1px solid rgba(25,20,14,0.06)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
          {cats.map((c) => {
            const on = cat === c.id;
            return (
              <button key={c.id} onClick={() => setCat(c.id)}
                style={{
                  flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 999,
                  background: on ? '#19140E' : 'transparent',
                  color: on ? '#FAF8F4' : 'rgba(25,20,14,0.7)',
                  border: 'none', fontSize: 14, fontWeight: 500, letterSpacing: -0.1,
                  transition: 'all 180ms cubic-bezier(0.2,0.7,0.3,1)',
                }}>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 100 }}>
        {orderState && (
          <button onClick={onTracking} style={{ display: 'flex', alignItems: 'center', gap: 12, width: 'calc(100% - 32px)', margin: '14px 16px 4px', padding: 14, background: '#19140E', color: '#FAF8F4', border: 'none', borderRadius: 14, textAlign: 'left' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#F59A4D', animation: 'tf-pulse 1.4s ease-in-out infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Your order is {orderState}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Tap to track</div>
            </div>
            <Icon name="chevron" size={16} color="rgba(245,239,230,0.6)" />
          </button>
        )}
        {/* Group by category, but only when no search */}
        {!search && cat === 'all' ? (
          cats.filter((c) => c.id !== 'all').map((c) => {
            const group = items.filter((it) => it.cat === c.id);
            if (!group.length) return null;
            return (
              <div key={c.id} style={{ paddingTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 20px', marginBottom: 10 }}>
                  <h3 className="display" style={{ fontSize: 26, fontStyle: 'italic', fontWeight: 400, letterSpacing: -0.4, margin: 0 }}>{c.name}</h3>
                  <span className="tf-mono" style={{ fontSize: 11, color: 'rgba(25,20,14,0.4)', letterSpacing: 1.2, textTransform: 'uppercase' }}>{String(group.length).padStart(2, '0')}</span>
                </div>
                <div>
                  {group.map((it) => <MenuRow key={it.id} item={it} onClick={() => onItem(it)} />)}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ paddingTop: 8 }}>
            {items.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Nothing matches “{search}”.</div>
                <div style={{ fontSize: 13, color: 'rgba(25,20,14,0.6)', marginTop: 6 }}>Try a category or ask your waiter.</div>
              </div>
            ) : items.map((it) => <MenuRow key={it.id} item={it} onClick={() => onItem(it)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuRow({ item, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      width: '100%', padding: '14px 20px', border: 'none', background: 'transparent',
      textAlign: 'left', borderBottom: '1px solid rgba(25,20,14,0.06)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2, color: '#19140E' }}>{item.name}</span>
          {item.tags.includes('chef') && <TagChip tag="chef" />}
          {item.tags.includes('signature') && <TagChip tag="signature" />}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(25,20,14,0.6)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: '#19140E' }}>{fmtTND(item.price)}</span>
          <span style={{ fontSize: 11, color: 'rgba(25,20,14,0.4)' }} className="tf-mono">TND</span>
          {item.time && <span style={{ fontSize: 12, color: 'rgba(25,20,14,0.5)', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6 }}><Icon name="clock" size={12} /> {item.time}</span>}
          {item.tags.includes('spicy') && <span style={{ marginLeft: 4 }}><TagChip tag="spicy" /></span>}
          {item.tags.includes('vegan') && <span style={{ marginLeft: 4 }}><TagChip tag="vegan" /></span>}
        </div>
      </div>
      <HeroSurface kind={item.hero} style={{ width: 76, height: 76, borderRadius: 12, flexShrink: 0 }} />
    </button>
  );
}

// ── ITEM SHEET (parallax hero, slide up) ────────────────────────────────────
function ItemSheet({ item, onClose, onAdd }) {
  const [qty, setQty] = React.useState(1);
  const [scrollY, setScrollY] = React.useState(0);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      animation: 'tf-sheet-up 420ms cubic-bezier(0.2,0.7,0.3,1)',
      background: '#FAF8F4',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div onScroll={(e) => setScrollY(e.target.scrollTop)} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Hero with parallax */}
        <div style={{ position: 'relative', height: 360, overflow: 'hidden' }}>
          <HeroSurface kind={item.hero} style={{
            position: 'absolute', inset: 0,
            transform: `translateY(${scrollY * 0.4}px) scale(${1 + scrollY * 0.0008})`,
            transition: 'transform 0ms',
          }} />
          {/* close pill */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 64, left: 16, zIndex: 2,
            width: 40, height: 40, borderRadius: 20,
            background: 'rgba(255,255,255,0.85)', border: 'none',
            backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <Icon name="chevronD" size={18} color="#19140E" />
          </button>
          {/* tags overlay bottom */}
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20, display: 'flex', gap: 6 }}>
            {item.tags.map((t) => <TagChip key={t} tag={t} />)}
          </div>
          {/* gradient fade into content */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, transparent, #FAF8F4)' }} />
        </div>

        {/* Body */}
        <div style={{ padding: '12px 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
            <h1 style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.8, margin: 0 }}>{item.name}</h1>
            <div className="display" style={{ fontStyle: 'italic', fontSize: 30, fontWeight: 400, color: '#D97A2C', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtTND(item.price)}</div>
          </div>
          <div style={{ fontSize: 16, color: 'rgba(25,20,14,0.7)', lineHeight: 1.5, marginBottom: 24 }}>{item.desc}</div>

          {/* Sub-rows */}
          <div style={{ display: 'flex', gap: 24, paddingTop: 16, paddingBottom: 16, borderTop: '1px solid rgba(25,20,14,0.08)', borderBottom: '1px solid rgba(25,20,14,0.08)', marginBottom: 24 }}>
            {item.time && <div>
              <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>Ready in</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>{item.time}</div>
            </div>}
            <div>
              <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>Allergens</div>
              <div style={{ fontSize: 14, marginTop: 2, color: 'rgba(25,20,14,0.7)' }}>Gluten, egg</div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 24 }}>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)', marginBottom: 8 }}>Notes for the kitchen</div>
            <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(25,20,14,0.1)', fontSize: 14, color: 'rgba(25,20,14,0.5)', minHeight: 60 }}>e.g. extra harissa on the side</div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{ padding: '12px 16px 28px', borderTop: '1px solid rgba(25,20,14,0.08)', background: 'rgba(250,248,244,0.94)', backdropFilter: 'blur(20px)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 6px', borderRadius: 26, background: '#F2EFE8' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="minus" size={18} color="#19140E" />
          </button>
          <div style={{ minWidth: 24, textAlign: 'center', fontWeight: 500, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{qty}</div>
          <button onClick={() => setQty(qty + 1)} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} color="#19140E" />
          </button>
        </div>
        <button onClick={() => onAdd(qty)} style={{
          flex: 1, height: 52, borderRadius: 26, border: 'none',
          background: '#19140E', color: '#FAF8F4',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 22px', fontSize: 15, fontWeight: 500,
          boxShadow: '0 1px 2px rgba(25,20,14,0.2), 0 8px 24px rgba(25,20,14,0.16)',
        }}>
          <span>Add to order</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTND(qty * item.price)} TND</span>
        </button>
      </div>
    </div>
  );
}

// ── CART FAB ────────────────────────────────────────────────────────────────
function CartFab({ count, total, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', left: 16, right: 16, bottom: 28, zIndex: 5,
      height: 56, borderRadius: 28, border: 'none',
      background: '#19140E', color: '#FAF8F4',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      boxShadow: '0 4px 12px rgba(25,20,14,0.2), 0 16px 40px rgba(25,20,14,0.18)',
      animation: 'tf-rise 240ms cubic-bezier(0.2,0.7,0.3,1)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 14, background: '#D97A2C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Review order</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtTND(total)}</span>
        <span style={{ fontSize: 12, opacity: 0.6 }} className="tf-mono">TND</span>
      </span>
    </button>
  );
}

// ── CART SHEET (spring slide-up) ────────────────────────────────────────────
function CartSheet({ items, total, onClose, setQty, onPlace }) {
  const r = TF_MENU.restaurant;
  const service = total * 0.10;
  const grand = total + service;
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(25,20,14,0.4)', animation: 'tf-fade 240ms ease-out' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
        height: '88%', background: '#FAF8F4',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        animation: 'tf-sheet-up 520ms cubic-bezier(0.34,1.36,0.64,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(25,20,14,0.2)',
      }}>
        {/* grabber */}
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(25,20,14,0.18)' }} />
        </div>
        <div style={{ padding: '8px 24px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1 }}>Your <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>order</span></div>
            <div style={{ fontSize: 13, color: 'rgba(25,20,14,0.6)', marginTop: 4 }}>Table {r.table} · {r.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: '#F2EFE8' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: '#F2EFE8', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(25,20,14,0.5)' }}>
                <Icon name="bag" size={26} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 500 }}>Your order is empty</div>
              <div style={{ fontSize: 14, color: 'rgba(25,20,14,0.6)', marginTop: 4 }}>Browse the menu to get started.</div>
            </div>
          ) : (
            <div style={{ padding: '4px 16px' }}>
              {items.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 8px', borderBottom: '1px solid rgba(25,20,14,0.06)' }}>
                  <HeroSurface kind={c.item.hero} style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{c.item.name}</div>
                    <div style={{ fontSize: 13, color: 'rgba(25,20,14,0.6)', fontVariantNumeric: 'tabular-nums' }}>{fmtTND(c.item.price)} <span className="tf-mono" style={{ fontSize: 11 }}>TND</span></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 2, borderRadius: 18, background: '#F2EFE8' }}>
                    <button onClick={() => setQty(c.id, c.qty - 1)} style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: 'transparent' }}>
                      <Icon name="minus" size={14} />
                    </button>
                    <div style={{ minWidth: 18, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 500 }}>{c.qty}</div>
                    <button onClick={() => setQty(c.id, c.qty + 1)} style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div style={{ padding: '20px 8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(25,20,14,0.6)', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
                  <span>Subtotal</span><span>{fmtTND(total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(25,20,14,0.6)', marginBottom: 14, fontVariantNumeric: 'tabular-nums' }}>
                  <span>Service · 10%</span><span>{fmtTND(service)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, borderTop: '1px solid rgba(25,20,14,0.1)' }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>Total</span>
                  <div className="display" style={{ fontStyle: 'italic', fontSize: 28, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{fmtTND(grand)} <span className="tf-mono" style={{ fontStyle: 'normal', fontSize: 12, color: 'rgba(25,20,14,0.5)' }}>TND</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: '14px 16px 32px', borderTop: '1px solid rgba(25,20,14,0.08)' }}>
            <button onClick={onPlace} style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: '#D97A2C', color: '#fff', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 1px 2px rgba(217,122,44,0.32), 0 8px 24px rgba(217,122,44,0.24)' }}>
              Send to kitchen <Icon name="arrow_r" size={16} color="#fff" />
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(25,20,14,0.5)', marginTop: 10 }}>Pay at the table when you're done.</div>
          </div>
        )}
      </div>
    </>
  );
}

// ── TRACKING (live timeline) ────────────────────────────────────────────────
function TrackingScreen({ orderState, items, total, onBack, onWaiter, onBill }) {
  const stages = [
    { id: 'received', name: 'Sent to kitchen', sub: 'The team has it' },
    { id: 'preparing', name: 'In preparation', sub: 'Plating soon' },
    { id: 'ready', name: 'Ready & served', sub: 'Bon appétit' },
  ];
  const order = ['received', 'preparing', 'ready'];
  const currentIdx = orderState ? order.indexOf(orderState) : -1;

  return (
    <div className="tf" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAF8F4' }}>
      {/* Header */}
      <div style={{ padding: '70px 20px 16px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px 0 8px', borderRadius: 16, border: '1px solid rgba(25,20,14,0.1)', background: '#fff', fontSize: 13, color: '#19140E', marginBottom: 14 }}>
          <Icon name="chevronL" size={14} /> Menu
        </button>
        <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>Order #2406-A · Table 14</div>
        <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, marginTop: 4, marginBottom: 6 }}>
          {orderState === 'ready' ? <>Enjoy.</> : <>Cooking <span className="display" style={{ fontStyle: 'italic', color: '#D97A2C', fontWeight: 400 }}>now.</span></>}
        </h1>
        <div style={{ fontSize: 14, color: 'rgba(25,20,14,0.6)' }}>
          {orderState === 'ready' ? 'Your dishes are at the pass.' : 'Estimated 22–28 min · Yassine is your waiter'}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {/* Timeline */}
        <div style={{ background: '#fff', border: '1px solid rgba(25,20,14,0.06)', borderRadius: 16, padding: 20, marginBottom: 14 }}>
          {stages.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.id} style={{ display: 'flex', gap: 14, paddingBottom: i === stages.length - 1 ? 0 : 18, position: 'relative' }}>
                {/* connector */}
                {i < stages.length - 1 && (
                  <div style={{ position: 'absolute', left: 11, top: 24, bottom: -6, width: 2, background: done ? '#19140E' : 'rgba(25,20,14,0.1)' }} />
                )}
                {/* dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: done ? '#19140E' : active ? '#D97A2C' : '#F2EFE8',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: active ? 'none' : 'none',
                  }}>
                    {done && <Icon name="check" size={14} color="#fff" />}
                    {active && <span style={{ width: 8, height: 8, borderRadius: 4, background: '#fff' }} />}
                  </div>
                  {active && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: '#D97A2C', animation: 'tf-pulse-ring 1.6s ease-out infinite' }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingTop: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: active || done ? '#19140E' : 'rgba(25,20,14,0.5)' }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(25,20,14,0.55)', marginTop: 2 }}>
                    {active ? s.sub : done ? 'Done' : ''}
                    {active && <span style={{ color: '#D97A2C', marginLeft: 6 }}>·  live</span>}
                  </div>
                </div>
                {active && (
                  <div className="tf-mono" style={{ fontSize: 11, color: 'rgba(25,20,14,0.5)', alignSelf: 'flex-start', paddingTop: 2 }}>
                    {orderState === 'received' ? 'just now' : '~12 min'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div style={{ background: '#fff', border: '1px solid rgba(25,20,14,0.06)', borderRadius: 16, padding: 20, marginBottom: 14 }}>
          <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)', marginBottom: 12 }}>Your order · {items.reduce((s, c) => s + c.qty, 0)} items</div>
          {items.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8, marginBottom: 8, borderBottom: '1px dashed rgba(25,20,14,0.08)' }}>
              <span style={{ fontSize: 14 }}><span style={{ color: 'rgba(25,20,14,0.5)' }} className="tf-mono">{c.qty}× </span>{c.item.name}</span>
              <span style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums', color: 'rgba(25,20,14,0.7)' }}>{fmtTND(c.qty * c.item.price)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontWeight: 500 }}>
            <span style={{ fontSize: 14 }}>Subtotal</span>
            <span style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{fmtTND(total)} <span className="tf-mono" style={{ fontSize: 11, color: 'rgba(25,20,14,0.5)' }}>TND</span></span>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 32 }}>
          <button onClick={onWaiter} style={{ height: 64, borderRadius: 14, background: '#fff', border: '1px solid rgba(25,20,14,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: '#FBEED9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={18} color="#7C3F12" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Call waiter</div>
              <div style={{ fontSize: 12, color: 'rgba(25,20,14,0.55)' }}>~30 sec response</div>
            </div>
          </button>
          <button onClick={onBill} style={{ height: 64, borderRadius: 14, background: '#fff', border: '1px solid rgba(25,20,14,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: '#F2EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="receipt" size={18} color="#19140E" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>The bill</div>
              <div style={{ fontSize: 12, color: 'rgba(25,20,14,0.55)' }}>Pay at table</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WAITER (confirmation moment) ────────────────────────────────────────────
function WaiterScreen({ state, onCall, onClose }) {
  return (
    <div className="tf" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FAF8F4', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '70px 20px 0', minHeight: 56 }}>
        {state === null && (
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px 0 8px', borderRadius: 16, border: '1px solid rgba(25,20,14,0.1)', background: '#fff', fontSize: 13 }}>
            <Icon name="chevronL" size={14} /> Back
          </button>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 32px', textAlign: 'center', position: 'relative' }}>
        {state === null && (
          <>
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 60, background: '#FBEED9' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: 60, border: '2px solid #D97A2C', opacity: 0.2 }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={48} color="#D97A2C" />
              </div>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, marginBottom: 10 }}>
              Need a hand?
            </h1>
            <div style={{ fontSize: 16, color: 'rgba(25,20,14,0.6)', marginBottom: 36, maxWidth: 280, lineHeight: 1.5 }}>
              We'll send <span style={{ color: '#19140E', fontWeight: 500 }}>Yassine</span> to table {TF_MENU.restaurant.table}.
            </div>
            <button onClick={onCall} style={{ height: 56, padding: '0 32px', borderRadius: 28, border: 'none', background: '#D97A2C', color: '#fff', fontSize: 16, fontWeight: 500, boxShadow: '0 1px 2px rgba(217,122,44,0.32), 0 12px 32px rgba(217,122,44,0.32)' }}>
              Call waiter
            </button>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(25,20,14,0.55)' }}>
              <span>Or — choose a quick request</span>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 320 }}>
              {['Water', 'Bread', 'Spicy on side', 'Speak to manager'].map((q) => (
                <button key={q} style={{ height: 40, borderRadius: 20, border: '1px solid rgba(25,20,14,0.1)', background: '#fff', fontSize: 13, fontWeight: 500 }}>{q}</button>
              ))}
            </div>
          </>
        )}

        {state === 'pending' && (
          <>
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 60, background: '#FBEED9' }} />
              <div style={{ position: 'absolute', inset: -10, borderRadius: 70, border: '2px solid #D97A2C', animation: 'tf-pulse-ring 1.6s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: 10, borderRadius: 50, border: '2px solid #D97A2C', animation: 'tf-pulse-ring 1.6s ease-out infinite 0.3s' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell_ring" size={48} color="#D97A2C" />
              </div>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, marginBottom: 10 }}>
              <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>Calling…</span>
            </h1>
            <div style={{ fontSize: 16, color: 'rgba(25,20,14,0.6)', maxWidth: 280, lineHeight: 1.5 }}>Waiting for a waiter to acknowledge.</div>
          </>
        )}

        {state === 'ack' && (
          <>
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 60, background: '#E6F4EC' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#1F6B43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="24" strokeDashoffset="24"
                    style={{ animation: 'tf-tick-fill 480ms cubic-bezier(0.2,0.7,0.3,1) forwards' }} />
                </svg>
              </div>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, marginBottom: 10 }}>
              On the way.
            </h1>
            <div style={{ fontSize: 16, color: 'rgba(25,20,14,0.6)', maxWidth: 280, lineHeight: 1.5, marginBottom: 32 }}>
              <span style={{ color: '#19140E', fontWeight: 500 }}>Yassine</span> acknowledged · ETA ~30s
            </div>
            <button onClick={onClose} style={{ height: 48, padding: '0 28px', borderRadius: 24, border: '1px solid rgba(25,20,14,0.1)', background: '#fff', fontSize: 14, fontWeight: 500 }}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── BILL ────────────────────────────────────────────────────────────────────
function BillScreen({ items, total, requested, onRequest, onClose }) {
  const service = total * 0.10;
  const grand = total + service;
  const r = TF_MENU.restaurant;
  return (
    <div className="tf" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FAF8F4', overflow: 'hidden' }}>
      <div style={{ padding: '70px 20px 12px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px 0 8px', borderRadius: 16, border: '1px solid rgba(25,20,14,0.1)', background: '#fff', fontSize: 13, marginBottom: 14 }}>
          <Icon name="chevronL" size={14} /> Tracking
        </button>
        <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>The bill · #2406-A</div>
        <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, marginTop: 4 }}>{r.name}, <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>table {r.table}</span></h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {/* Receipt — torn ticket with scalloped edges (signature move) */}
        <div style={{ position: 'relative', filter: 'drop-shadow(0 1px 2px rgba(25,20,14,0.04)) drop-shadow(0 8px 24px rgba(25,20,14,0.06))' }}>
          <div style={{
            background: '#fff',
            padding: '26px 22px 22px',
            WebkitMask: 'radial-gradient(circle 8px at 8px 50%, transparent 98%, #000 100%) -8px 0/16px 100%, radial-gradient(circle 8px at calc(100% - 8px) 50%, transparent 98%, #000 100%) 8px 0/16px 100%, linear-gradient(#000, #000)',
            WebkitMaskComposite: 'source-in, source-in, source-over',
            mask: 'radial-gradient(circle 8px at 8px 50%, transparent 98%, #000 100%) -8px 0/16px 100%, radial-gradient(circle 8px at calc(100% - 8px) 50%, transparent 98%, #000 100%) 8px 0/16px 100%, linear-gradient(#000, #000)',
            maskComposite: 'intersect',
          }}>
            {/* tear-stub mono header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10, marginBottom: 12, borderBottom: '1.5px dashed rgba(25,20,14,0.18)' }}>
              <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: 'rgba(25,20,14,0.55)', textTransform: 'uppercase' }}>Guest copy · keep</span>
              <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: 'rgba(25,20,14,0.4)' }}>2026·04·22 / 13:42</span>
            </div>
          {items.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px dashed rgba(25,20,14,0.08)' }}>
              <span style={{ fontSize: 14 }}>
                <span style={{ color: 'rgba(25,20,14,0.5)' }} className="tf-mono">{c.qty}× </span>
                {c.item.name}
              </span>
              <span style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmtTND(c.qty * c.item.price)}</span>
            </div>
          ))}
          <div style={{ paddingTop: 16, marginTop: 4 }}>
            <Row label="Subtotal" v={fmtTND(total)} />
            <Row label="Service · 10%" v={fmtTND(service)} muted />
            <div style={{ height: 1, background: 'rgba(25,20,14,0.1)', margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 17, fontWeight: 500 }}>Total · TND</span>
              <div className="display" style={{ fontStyle: 'italic', fontSize: 38, fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>{fmtTND(grand)}</div>
            </div>
          </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#fff', border: '1px solid rgba(25,20,14,0.06)', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(25,20,14,0.55)' }}>Split equally</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>2 people · {fmtTND(grand / 2)} TND each</div>
            </div>
            <button style={{ height: 32, padding: '0 14px', borderRadius: 16, border: '1px solid rgba(25,20,14,0.1)', background: '#FAF8F4', fontSize: 13, fontWeight: 500 }}>Adjust</button>
          </div>
        </div>

        <div style={{ height: 100 }} />
      </div>

      <div style={{ padding: '12px 16px 28px', borderTop: '1px solid rgba(25,20,14,0.08)', background: 'rgba(250,248,244,0.94)', backdropFilter: 'blur(20px)' }}>
        {!requested ? (
          <button onClick={onRequest} style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: '#19140E', color: '#FAF8F4', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', boxShadow: '0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.16)' }}>
            <span>Request the bill</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{fmtTND(grand)} TND</span>
          </button>
        ) : (
          <div style={{ width: '100%', minHeight: 52, padding: '14px 18px', borderRadius: 14, background: '#19140E', color: '#FAF8F4', display: 'flex', alignItems: 'center', gap: 12, animation: 'tf-rise 320ms cubic-bezier(0.2,0.7,0.3,1)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Bill on the way</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Yassine will bring it to your table</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, v, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: muted ? 'rgba(25,20,14,0.6)' : '#19140E', fontVariantNumeric: 'tabular-nums' }}>
      <span>{label}</span><span>{v}</span>
    </div>
  );
}

Object.assign(window, {
  CustomerApp, MenuScreen, ItemSheet, CartSheet, TrackingScreen, WaiterScreen, BillScreen, SCREENS,
});
