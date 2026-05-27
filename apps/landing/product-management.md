# Orvexa — Product Management

**A QR-based restaurant ordering system built for cafés and restaurants in Tunisia.**

---

## What We're Building and Why

Orvexa is a real-time ordering stack for dine-in restaurants: customers scan a QR code on their table, browse a trilingual menu, and place orders directly from their phone — no app install, no account, no waiter needed to take the order. The kitchen sees tickets instantly. The waiter sees which tables need attention. The owner sees daily revenue, top dishes, and table activity on a live dashboard.

The problem it solves is real and specific: in Tunisian cafés and restaurants, the ordering flow is slow, error-prone, and heavily dependent on staff memory and verbal communication. A busy waiter forgets a table. A kitchen misreads handwriting. A customer waits 15 minutes before anyone acknowledges them. Orvexa replaces that chain with a direct digital pipe from the customer's phone to the kitchen display and the waiter's floor view.

**The four apps in the stack:**

- **Customer app** — QR-triggered, ephemeral session, trilingual (AR / FR / EN), mobile-first
- **Kitchen app** — live ticket board for kitchen staff, tablet / TV, dark mode
- **Waiter app** — floor map, calls feed, payment flow, phone-first
- **Admin app** — menu editor, staff manager, reports, owner-facing dashboard

All four share a single API and are connected over WebSockets for real-time updates.

---

## Users and Their Jobs

### Customer

A diner at a table in the restaurant. They've scanned a QR code on the table. They want to:

- Browse the menu in their preferred language (Arabic, French, or English)
- Place an order without having to flag a waiter
- Track whether their food is being prepared
- Call the waiter when they need something
- Request the bill when they're done

They do not have an account. They will never create one. The session is tied to the table, lasts one visit, and is gone when the table clears.

### Kitchen Staff

A cook behind a pass. They want to:

- See every incoming order the moment it's placed, without checking a printer or a list
- Know how long each ticket has been waiting
- Advance tickets through the pipeline (received → preparing → ready) with a single tap
- Not miss any ticket — the board should be glanceable from across the kitchen

### Waiter

A floor staff member covering multiple tables. They want to:

- See the state of every table at a glance — who's ordering, who's waiting, who called, who needs the bill
- Know when a dish is ready to be passed to a table
- Take payment and close a table without going to a POS terminal
- Respond to call-waiter and request-bill alerts without having to watch their phone

### Owner / Manager (Admin)

The restaurant owner or a manager. They want to:

- Edit the menu in three languages with photos and variant pricing (sizes, extras, toppings)
- See today's revenue, top-selling dishes, and how many tables are active right now
- Manage staff accounts — create, assign roles, track who's present today
- View and export order history
- Print QR codes for each table from a single screen

---

## Roadmap — What We Built and in What Order

### Phase 0–3: Foundation

Before writing a single product feature, we built the infrastructure that everything else would depend on: a shared TypeScript package (`@orvexa/shared`) with all domain types and Zod schemas, a PostgreSQL schema with migrations, a structured API layer (routes → services → repositories), and a real-time bus over Socket.io.

This was not exciting work. It was the right work. Doing it first meant every subsequent phase was building on solid ground — typed, validated, and consistent across all four apps.

**Key decisions made here:**

- **Drizzle over Prisma** for migrations — lighter, SQL-close, easy to hand-write migrations when Drizzle's generator wasn't precise enough
- **Zod in shared** — schemas defined once, reused for API validation, TypeScript types, and frontend form validation
- **No Tailwind** — plain CSS with custom properties across all four apps. Introducing a utility framework would have required rewriting working UI for no functional gain
- **No CI/CD** — personal project, manual deploy. Skipped Husky, lint-staged, conventional commits, and GitHub Actions. These decisions are logged and intentional, not oversights

### Phase 4–9: API Layer

Auth, restaurant config, tables, menu, orders, payments, and real-time — all built as a clean REST API before any frontend touched it.

**Key decisions:**

- **Customer sessions are stateless QR tokens** — a customer scans a QR code, gets a short-lived JWT scoped to that table, and all their actions are tied to that session. No login, no account, no persistence across visits
- **Daily-rotating QR tokens** — the QR is printed once. The token encoded in it rotates daily server-side. Print once, no annual reprints
- **Variants, not SKUs** — for a menu like Capitol's (pizza sizes × sauce combinations × extras) we modeled 1 dish + variant groups with price deltas, not 250 separate line items. Flatten only when items are named recipes with genuinely different compositions
- **No per-item status** — `order_items` has no `status` column. Café-scale orders are prepared together at one station. Per-item status only matters for multi-station kitchens (drinks vs. mains split). This was consciously deferred, not forgotten
- **Payments stub for non-cash** — card and mobile-pay methods create a `pending` payment record with a `stub-<timestamp>` provider reference. The real gateway swap is a one-line branch change in `PaymentService.record`
- **HTML receipts via browser print** — no server-side PDF library. `GET /orders/:id/receipt.html` returns a self-contained HTML doc. Browser print-to-PDF covers the receipt need for MVP. Revisit with puppeteer if a fully headless print flow is needed

### Phase 10–13: The Four Apps

Customer, Kitchen, Waiter, and Admin apps — built in that order, functional before the redesign pass.

The customer app came first because it's the most critical path: no customer app = no orders = no reason for the kitchen or waiter apps to exist.

The kitchen and waiter apps came second because they're the two surfaces that close the loop — a placed order needs to arrive somewhere and get delivered.

The admin app came last because it's the configuration layer. An owner can seed the menu manually at first. They need the admin app before launch, not before the system works.

### Phase 14–15: Cross-cutting + Testing

Shared UI utilities, formatting helpers, a shared API client package. Vitest for unit and integration tests, Playwright for E2E. Playwright covers the three critical flows: customer order, kitchen status advance, waiter payment.

### Phase 16–17: Deployment

Docker, Nginx, Let's Encrypt, production environment config, a DB backup script with 14-day rotation, and a static landing page for the product. Deployed to an OVH VPS in Gravelines running Ubuntu, behind a Nginx reverse proxy with host-based routing to all five hostnames (apex + four subdomains).

### Phase 18: Visual Redesign ("Saffron-Hospitality")

A full visual port from the design handoff onto all four functional apps. The data layer — API clients, sockets, stores, i18n, variant selection — was preserved entirely. Only chrome, motion, and visual hierarchy changed.

The design language:

- **Warm-paper base** — `#FAF8F4` warm cream, `#19140E` near-black warm
- **Saffron accent** — `#D97A2C`, used for CTAs, active states, urgent indicators
- **Display italic** — Newsreader Italic for headlines, totals, table names
- **Monospace utility** — Geist Mono for prices, timestamps, table labels, reference codes
- **Geist sans** — body text and UI labels

Each app got a distinct palette tuned to its context: the customer app is warm and inviting, the kitchen app is dark and high-contrast, the waiter and admin apps are cool-light and functional.

### Phase 19–22: Post-Handoff, First Client, Stability

Features that either emerged from real-client requirements or surfaced during testing:

- **Cashier role + counter-payment flow** — Capitol requested a counter-payment mode where a dedicated cashier collects from all tables. Added `cashier` to the staff role enum, a new `/open-bills` view, and a `payment_point` restaurant setting
- **Post-bill customer feedback** — 1–5 star rating + optional comment after the bill is requested. New `feedback` table, customer card, admin feedback tab
- **Per-dish prep time** — `prep_time_minutes` on dishes, `default_prep_minutes` on the restaurant, ETA derived as `max(prep times)` across the order (kitchen parallelizes). Shown on the customer tracking screen and kitchen ticket card
- **Table floor-plan editor** — admin drags tables onto a canvas, assigns them to named zones. Waiter floor map consumes the persisted coordinates and shows a real spatial layout instead of an auto-grid
- **Mixed-section order split** — items grouped by `kitchenSection` (`bar` | `kitchen`) at order placement. One order per section created in a single DB transaction with a shared `round` number. Customer tracking shows both as independent cards with section labels
- **End-of-day close** — `POST /admin/close-day` cancels active orders, resets all tables to free, clears waiter calls. Auto-triggers at midnight UTC. Admin dashboard has a "Clôture du jour" button with a confirm modal
- **Shared table cart** — first customer to scan is the cart owner. Others on the same table can view and add items. Only the owner can confirm/order. Cart state is server-synced over WebSocket (`cart:updated` event) so all devices on the table see changes within 350ms

---

## What We Deliberately Did Not Build

These are all logged as `[-]` skipped tasks. Each has a reason.

| What                            | Why it was skipped                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Customer login / accounts       | By design. QR → session is the model. Accounts add friction that kills the no-login pitch                                                  |
| Multi-currency                  | Tunisia-only for now. TND hardcoded. Multi-currency is a generalization for a problem that doesn't exist yet                               |
| Per-item order status           | Café-scale kitchens prepare orders whole. No station split needed yet                                                                      |
| Redis pub/sub adapter           | Single-instance API. The `RealtimeBus` abstraction makes the swap local when horizontal scaling lands                                      |
| CI/CD pipeline                  | Personal project. Manual `docker compose up -d --build` until a team warrants it                                                           |
| Server-side PDF receipts        | Browser print covers the need. No puppeteer dependency for MVP                                                                             |
| Tailwind / CSS-in-JS            | Plain CSS with custom properties was already the de-facto choice. Rewriting working UI for no functional gain                              |
| Dedicated translation endpoints | `PATCH /dishes/:id` already accepts full `LocalizedString` objects. A separate translation endpoint is a thin wrapper over the same fields |
| Per-item station routing        | No `Dish.station` column. Revisit when multi-station kitchens become a real ask                                                            |
| Push notifications              | Live socket + audio covers the urgent-attention need without the HTTPS / service worker tax                                                |
| Reservations                    | Net-new surface. Not designed, not needed for Capitol                                                                                      |
| Audit log viewer                | The `audit_log` table exists but nothing writes to it yet. A viewer over an empty table is misleading                                      |
| Multi-restaurant tenancy        | Single-tenant until post-exam period (~June 2026). JWT already carries `restaurantId`, so the scoping work is isolated                     |

---

## MVP Definition — First Client Go-Live

**Client:** Capitol — a Tunisian café/restaurant in Tunis  
**Deadline:** 2026-05-16  
**Language priority:** French-primary, Arabic for mains section, English available

The Capitol menu has:

- Variant-priced dishes (pizza sizes)
- Bread × filling matrices
- Multi-select flavor choices

The MVP had to support all of this without flattening it into hundreds of SKUs. The variant group model (`dish → variant_groups → variants` with price deltas) was validated directly against the Capitol seed data before go-live.

**What "live" meant:**

- Real QR codes on real tables
- Real staff trained on their respective apps
- Real customers placing real orders
- Cash payment via waiter
- Owner monitoring dashboard and daily close

**What was explicitly out of scope for go-live:**

- Card / mobile-pay gateway integration (stub in place)
- Reservations
- Split bills
- Multi-restaurant tenancy
- Per-item status

The deployment is live at `orvexa.tn` on an OVH VPS (51.210.97.193) with real Let's Encrypt certificates for apex, www, and all four subdomains.

---

## Key Product Decisions

### No customer accounts — ever

The customer experience is scan → order → pay → done. Adding accounts would require a login screen, password recovery, profile management, and session persistence — none of which makes the dining experience better. Users don't want to create an account to order a coffee. This is a constraint, not a limitation. It shapes every customer-side decision.

### Tunisia-first, single currency

TND only. `Currency` type is defined in `@orvexa/shared` but the system doesn't abstract over multiple currencies — there's only ever one. Multi-currency architecture is complexity for a problem that doesn't exist yet. If the product expands to other markets, the abstraction gets added then.

### French + Arabic + English — all three, properly

The menu is trilingual from the database layer up. Every `name` and `description` field is a `LocalizedString: { ar, fr, en }`. Arabic is RTL — the customer app switches `<html dir="rtl">` on language change. The admin menu editor has a three-tab input for every translatable field.

### Real-time everywhere, degraded gracefully

Every status change — order placed, order status updated, table status changed, waiter called, bill requested — emits a WebSocket event. If the socket disconnects, the apps fall back to polling. If the API is unreachable, offline banners appear. The system is designed to work on a busy restaurant floor with spotty connectivity.

### Design handoff is the source of truth

The `frontend handoff/` folder (HANDOFF.md + JSX surface files) is the canonical design reference. Where it conflicts with this document or `TASKS.md`, the handoff wins. The visual redesign in Phase 18 was a direct port from those files onto the functional apps — not an interpretation.

### Hold-to-bump on the kitchen board

Kitchen staff advance ticket status by holding a button for 600ms — not tapping. This prevents accidental status advances on a greasy touchscreen in a hot kitchen. It's a deliberate UX decision, not a missing tap handler.

### Age-coded tickets on the kitchen display

Tickets change color as they age: fresh (green) → cooking (neutral) → pushing (saffron) → late (red, with a throbbing shadow). The color is derived from `createdAt` + `now` with no configuration. The kitchen team can read the floor state at a glance from across the room without counting minutes.

---

## Key Questions We Had to Answer

**Which features move the needle on retention for Capitol specifically?**
The owner's retention isn't about digital features — it's about whether the system actually speeds up service and reduces mistakes. The metrics that matter are: time from order placement to kitchen ticket, time from kitchen ready to table delivery, number of missed orders, number of waiter call responses. We built around these flows first.

**What's the real problem — not what the owner says, but what they show?**
The stated problem was "waiters forget orders." The actual problem was a broken information chain: kitchen doesn't know what was ordered until a waiter tells them, waiters don't know when food is ready until the kitchen shouts, customers don't know what's happening at all. Orvexa replaces verbal communication with a live data model that all three parties read from simultaneously.

**What should we build vs. buy vs. ignore?**

- **Build:** The ordering flow, real-time bus, menu model, role-based auth — all core to the product's value
- **Buy (stub for now):** Payment gateway — the stub pattern lets us ship cash-only and swap in a real gateway later without touching the rest of the system
- **Ignore (for now):** Reservations, loyalty programs, inventory management, fiscal integration — all legitimate needs, none of them required to open the doors on day one

**Are we solving for today's user or tomorrow's?**
Today's user is Capitol. Single restaurant, single currency, Tunisian context, French-primary menu. We've deliberately not built multi-tenant abstractions, multi-currency support, or internationalized fiscal requirements. The product will generalize when a second client signs — not before.

**What's the cost of not shipping the variant group model?**
High. Without `variant_groups` with price deltas, Capitol's menu would require 250+ individual dishes to represent what are actually 15 dishes with options. The menu editor would be unusable, the ordering flow would be confusing, and the order data would be meaningless for reports. This was non-negotiable for the MVP.
