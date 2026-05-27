# Orvexa — What It Does

Orvexa is a QR-based digital ordering and operations system for restaurants. The diner scans a QR code on the table, browses the menu in their language, orders, pays, and calls the waiter — all without installing an app. Behind the scenes, the kitchen, the floor staff, and the owner each have their own dedicated screen, and everything stays in sync in real time.

This document is a tour of what the application can do.

---

## The Big Picture

Orvexa is one platform with **four connected apps**, sharing one live database:

| App                       | Who uses it            | Device                                    |
| ------------------------- | ---------------------- | ----------------------------------------- |
| **Customer App**          | The diner at the table | Their own phone (via QR)                  |
| **Kitchen Display (KDS)** | Cooks and the line     | Tablet on the pass + optional wall screen |
| **Waiter App**            | Servers on the floor   | Server's phone                            |
| **Admin Dashboard**       | Owner / manager        | Desktop or laptop                         |

Every action — a new order, a status change, a call for service — flows instantly between all four through a realtime channel. No refresh needed.

---

## 1. Customer App — for the Diner

Opened by scanning the QR code printed on the table. No account, no signup, no app install.

### Browsing the menu

- Full menu with photos, descriptions, prices, allergens, and dietary tags
- **Three languages**: Arabic (right-to-left), French, English — switchable on the fly
- Categories, search, and item detail sheets with a parallax hero image
- Currency in **TND** (Tunisian Dinar)

### Ordering

- Tap to add items to the cart, adjust quantities, leave notes per item
- Sticky cart button always visible
- Place the order in one tap — no checkout friction
- Order is automatically tied to the table the QR was scanned at

### Live order tracking

- A visual timeline shows the order moving through **Received → Preparing → Ready → Served**
- Each step animates as the kitchen advances it — the diner sees progress without asking
- Estimated time displayed when available

### Calling the waiter

- One-tap buttons for common requests: **water, bread, the manager, or the bill**
- Visual feedback: a pulse ring while the call is open, a check-mark when a server has acknowledged it
- The waiter app picks the call up instantly

### Paying

- Request the bill from the table
- Payment confirmation flow with success / failure states

---

## 2. Kitchen Display (KDS) — for the Line

Replaces the printer-and-paper system. Designed for a noisy, fast-moving kitchen.

### Tablet KDS (interactive, on the pass)

- Live ticket rail — every order appears the moment it's placed
- Tickets show the table number, items, quantities, course, and station (Hot / Cold / Bar)
- **Ticket aging colors**: green when fresh (<5 min), saffron when warm (5–12 min), red and pulsing when overdue (>12 min) — at-a-glance urgency
- **Press-and-hold to bump** a course to "ready" — prevents accidental taps in a busy kitchen
- Soft chime confirms the bump
- Course pacing — see starters firing while mains are still queued
- Station load shown as a bar chart in the header so the chef sees where the pressure is

### Wall Display (read-only, glanceable)

- Full-width, high-contrast view of the queue for the whole brigade to see from across the line
- No interaction — just live information

### States covered

- "All caught up" empty state when the queue clears
- Offline indicator if the network drops

---

## 3. Waiter App — for the Floor

A server's phone. Three tabs: **Floor / Calls / Tables**.

### Floor view

- Pannable map of the dining room
- Each table shows a colored ring matching its current state
- Tables that are calling for service throb red until acknowledged

### Calls view

- Oldest-first queue of all open service calls
- Cards age with color: green (<60s) → saffron (60–120s) → red and tagged "OVERDUE" (>120s)
- Tap to acknowledge — the diner sees a confirmation immediately

### Table view

- Full table state machine: **open → seated → ordered → cooking → ready → paying → clean → open**
- Course-by-course **fire-to-kitchen** and **pass-to-table** controls
- Per-table detail sheet showing current order, time in state, who's serving

### Roles & shifts

- Server identity carried through every action — calls, orders, and tables are attributed
- Shift-start / clock-in screen

---

## 4. Admin Dashboard — for the Owner

A single desktop screen that tells the owner how the restaurant is doing right now.

### KPI strip

- Today's revenue, covers (people served), average ticket, average dwell time
- Day-over-day deltas

### Service pulse

- Minute-by-minute bar chart of covers across the day, with the peak called out

### Menu performance

- Items ranked by margin × velocity — what's making money vs. what's just selling
- Trends per item (rising / falling)

### Staff leaderboard

- Tables, covers, sales, tips, and customer ratings per server
- Gold ribbon on the top earner of the day

### Right-now feed

- Live stream of what's happening in the restaurant: seatings, calls, kitchen events, payments, reviews

### Restaurant management

- Menu management (categories, items, prices, photos, translations, allergens, availability)
- Table management and floor layout
- Staff management with roles: **admin, manager, kitchen, waiter**

---

## Cross-Cutting Capabilities

These run across every surface:

- **Realtime everywhere** — orders, calls, table states, and kitchen tickets all push live via WebSockets. No polling, no refresh.
- **Multi-language** — Arabic, French, English. Arabic is fully right-to-left.
- **Role-based access** — each staff role sees only what they need.
- **Customer privacy** — no diner accounts, no personal data collected. Each session lasts only as long as the meal.
- **PWA-ready customer app** — works in any modern phone browser, no install required.
- **Offline-aware** — clear states when the network drops on any screen.

---

## Operations & Reliability

For the people running the deployment:

- **One-host Docker deployment** — the whole stack (API, four frontends, Postgres, Redis, nginx proxy) runs under Docker Compose
- **Automatic HTTPS** — Let's Encrypt certificates issued and renewed without downtime
- **Health endpoints** for uptime monitoring (API liveness, DB ping, build version)
- **Database backups** — scripted `pg_dump` snapshots with automatic retention rotation
- **Structured logs** — JSON output from every container, ready to ship to Loki / CloudWatch / Datadog

---

## What's Coming

Orvexa is in active development. Planned and in-flight work is tracked in [TASKS.md](TASKS.md). Highlights on the roadmap include richer payment integrations, deeper analytics, and continued polish on the redesigned "Saffron-Hospitality" UI.
