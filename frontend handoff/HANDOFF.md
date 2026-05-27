# TableFlow — Frontend Handoff

For Claude Code (or any frontend engineer). The backend exists; this package is the visual + interaction contract for the four product surfaces.

---

## What's in this folder

| File                                   | Purpose                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| `TableFlow DMOS.html`                  | The canvas — open this to browse every surface                |
| `tokens.jsx`                           | Design tokens, primitives, theme hook (`useTheme`), icon set  |
| `design-canvas.jsx`                    | Canvas chrome (not part of the product — handoff viewer only) |
| `ios-frame.jsx`, `tweaks-panel.jsx`    | Canvas chrome only                                            |
| `customer-data.jsx`                    | Sample menu data — replace with API                           |
| `customer-app.jsx`                     | **Product** — customer iOS app                                |
| `kitchen-data.jsx`                     | Sample tickets — replace with API                             |
| `kitchen-screens.jsx`                  | **Product** — Tablet KDS + Wall display                       |
| `waiter-app.jsx`                       | **Product** — Waiter phone app                                |
| `admin-dashboard.jsx`                  | **Product** — Owner desktop dashboard                         |
| `states.jsx`                           | Empty / loading / error variants for every surface            |
| `system-screens.jsx`, `moodboards.jsx` | Documentation only — design system reference                  |

The four files marked **Product** are what you're rebuilding against the real backend.

---

## Stack assumptions

These are React components written as `.jsx` for in-browser Babel transpilation. **Port these to your real stack** (Next.js, Vite, Expo, whatever) — don't try to ship the raw files. The shapes, props, and visual logic are the contract; the file format is not.

For the **customer app** and **waiter app**, the target is mobile (web responsive PWA or native). Either is fine — the components are platform-agnostic enough to translate to React Native with minor tweaks.

For the **kitchen** and **admin**, target is desktop / tablet web.

---

## Design tokens

All tokens live in `tokens.jsx` → `TF_TOKENS`. Two themes (`light` / `dark`). Use `useTheme(dark = false)` to read them.

The saffron accent is also exposed as CSS custom properties on `:root`:

```css
--tf-accent: #d97a2c;
--tf-accent-ink: #7c3f12;
--tf-accent-bg: #fbeed9;
--tf-accent-glow: rgba(217, 122, 44, 0.32);
```

Any new code should reference these, not hard-code the hex. The dashboard's hue tweak in the prototype rewrites these vars live — replicate that pattern if you support theming.

**Type stack:** Newsreader (display, italic) + Geist (sans) + Geist Mono. Loaded from Google Fonts in `tokens.jsx`. Sub or self-host as you prefer.

**Spacing:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80
**Radii:** sm 6, md 10, lg 14, xl 20, 2xl 28, pill 999
**Motion:** fast 160ms, base 240ms, slow 360ms — all `cubic-bezier(0.2, 0.7, 0.3, 1)`

---

## The four surfaces

### 1. Customer app (`customer-app.jsx`)

The diner's phone, accessed by QR at the table.

**Flow:** Menu → Item detail → Cart → Place order → Live tracking → Call waiter / Request bill

**Key components:**

- `CustomerApp` — root, owns cart + order state
- `MenuScreen`, `ItemSheet`, `CartSheet`, `TrackingScreen`, `WaiterScreen`, `BillScreen`
- `CartFab` — sticky add-to-cart button
- `OrderTimeline` — the live "received → preparing → ready" rail (in `customer-app.jsx`)

**Signature interactions (preserve these):**

- Item sheet has a parallax hero — image translates 0.6× scroll speed
- Cart slides up with a spring (`tf-sheet-up` keyframe)
- Order timeline animates each step as it advances
- Waiter call has a 3-state machine: idle → calling (pulse ring) → ack (check-mark draw-on)

**Backend hooks needed:**

- `GET /menu` → array of `{ id, cat, name, ar, fr, desc, price, image, tags, allergens }`
- `POST /orders` → returns `{ orderId }`
- `GET /orders/:id` → returns `{ state: 'received'|'preparing'|'ready'|'served', items, eta }`
- WebSocket subscribe to order state for live updates
- `POST /tables/:n/calls` body `{ type: 'water'|'bill'|'bread'|'manager' }` → triggers waiter notification

### 2. Kitchen Display (`kitchen-screens.jsx`)

`TabletKDS` (1366×1024 landscape) and `WallDisplay` (1920×1080).

**Key components:**

- `TabletKDS` — interactive ticket rail; press-and-hold a card to bump
- `WallDisplay` — read-only, glanceable from across the line
- Ticket data shape in `kitchen-data.jsx` — `{ id, table, items: [{name, ar, qty, station, course}], placedAt, course }`

**Signature interactions:**

- Cards age: green (<5m) → saffron (5-12m) → red pulse (>12m)
- Press-and-hold (800ms) bumps a course to ready; releases a soft chime
- Course chips show pacing — starters firing while mains queue
- Station load (Hot / Cold / Bar) shown as bar chart in header

**Backend hooks needed:**

- WebSocket: subscribe to `tickets` channel — receive `{ created, updated, bumped }` events
- `POST /tickets/:id/bump` body `{ course: 'starter'|'main'|'dessert' }`
- `GET /stations/load` → real-time station counts for header

### 3. Waiter app (`waiter-app.jsx`)

The server's phone. Three tabs: Floor / Calls / Tables.

**Key components:**

- `WaiterApp` — root, owns table sim
- `FloorView` — pannable map, breathing dots per table
- `CallsView` — oldest-first urgency stack
- `TableDetail` — bottom sheet, course-by-course fire/pass

**Table state machine (important):**

`open → seated → ordered → cooking → ready → paying → clean → open`

Plus `call` as a transient overlay on any state that ages with a timer.

**Signature interactions:**

- Tables on the map have a state-colored ring; calling tables throb red (`tf-late-throb`)
- Call cards age with color — green (<60s) → saffron (60-120s) → red (>120s, "OVERDUE")
- Course-level fire-to-kitchen and pass-to-table buttons in the table detail

**Backend hooks needed:**

- `GET /tables` → array with current state, server, mins-in-state
- WebSocket: `table-state-changed` events
- `POST /calls/:id/ack` — mark a call as on-the-way
- `POST /tables/:n/state` body `{ to: 'seated'|'paying'|'clean'|... }`

### 4. Admin dashboard (`admin-dashboard.jsx`)

Owner's desktop. One screen, four zones: KPI strip, service pulse chart, menu performance, staff leaderboard, right-now feed.

**Key components:**

- `AdminDashboard` — root with sidebar nav
- `ServicePulse` — minute-by-minute bar chart with peak callout
- `MenuPerf` — items ranked by margin × velocity
- `StaffBoard` — leaderboard with gold-ribbon top earner
- `RightNow` — dark sidebar with live feed

**Backend hooks needed:**

- `GET /metrics/today` → `{ revenue, covers, avgTicket, avgDwell, deltas }`
- `GET /metrics/pulse` → array of `{ minute, covers }` for the day
- `GET /menu/performance?range=today` → items with sold, revenue, margin, trend, score
- `GET /staff/today` → server tallies (tables, covers, sales, tips, rating)
- WebSocket: `events` channel for the right-now feed (call/ready/cooking/seated/paid/review)

---

## Empty / loading / error states (`states.jsx`)

Every product surface has at least one of these. Hook them in by gating on your data fetch:

```jsx
if (isLoading) return <CustomerMenuLoading />;
if (error) return <CustomerNetworkError />;
if (!items.length) return <CustomerEmptyCart />;
return <MenuScreen items={items} />;
```

Inventory:

- **Customer:** menu loading skeleton, empty cart, network error, payment failed, order confirmed
- **Kitchen:** all caught up (empty queue), offline (network down)
- **Waiter:** empty calls (caught up), shift start (clock in)
- **Admin:** loading skeleton, closed day

Add more for any surfaces that need them — these are starters, not exhaustive.

---

## What's faked in the prototype

Don't copy these patterns 1:1; replace with real data layer:

1. **Timers** — `setInterval` in every root component drives ticket aging, call queue, table state. Replace with WebSocket events.
2. **Sample data** — `customer-data.jsx`, `kitchen-data.jsx`, `W_TABLES` in `waiter-app.jsx`, the `A_*` constants in `admin-dashboard.jsx`. Replace with API calls.
3. **Audio cue** in kitchen — currently uses Web Audio API to synth a tone on bump. Keep it, but consider a real sample.
4. **Sample order in customer app** — when no real order exists, the prototype hardcodes one. Real app: empty state.

---

## Localization (RTL + Arabic)

Not yet built. When you add it:

- Use **logical CSS properties** everywhere (`margin-inline-start`, `padding-block`, `inset-inline-end`)
- The components currently mix `left/right` with `flex` — audit and replace
- Arabic copy is already in the data files (`ar` field on every menu item) — wire it to a language toggle
- For Arabic, switch the sans stack to `"IBM Plex Sans Arabic", "Geist", system-ui`

---

## Component inventory (what's reusable vs. one-off)

**Reusable primitives** (in `tokens.jsx`):

- `TFButton` — primary / secondary / ghost / danger × sm/md/lg
- `TFInput` — labeled text input
- `TFCard` — sunken-shadow surface
- `TFPill` — small status chip
- `TFAvatar` — initials circle with status dot
- `Icon` — single-source SVG icon set (~30 glyphs)

**Surface-specific** (in their respective files) — listed above. Don't lift these into a shared library; they're tuned for each context.

---

## Open design decisions for you

1. **Item modifiers / allergies** — not in the prototype. Add to `ItemSheet` when ready (chips for "no onions", "extra harissa", etc.).
2. **Split bills** — bill screen shows a single tab. Add split-by-item / split-evenly UI when designing.
3. **Reservations** — entirely missing. Whole new surface.
4. **Multi-restaurant tenancy** — admin sidebar shows one venue. Add a switcher when needed.
5. **Receipts / accounting export** — not designed.

---

## Contact

Built in design tool. Post-handoff iteration: come back to the canvas, copy the file, edit, send back. Don't try to refactor the prototype itself — it's deliberately a single-purpose handoff artifact.
