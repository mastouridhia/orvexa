# Orvexa — Product Plans Spec

> Canonical definition of the 4 subscription tiers: what each includes, what
> appears in each app, and the capability flags that gate it in code.
> Pricing finalized 2026-06-12. This doc is the source of truth for plan scope;
> `TASKS.md` tracks the implementation work (Phase 34).

## Status legend

- ✅ **built** — exists in code today
- 🔒 **gated-binary** — code exists but is currently behind the binary `isPlan1` check (treated as "any plan ≥ 2"); needs real per-tier gating
- 🔨 **to build** — not implemented yet
- ⏳ **future** — planned, post-launch

---

## 1. The four tiers at a glance

| # | Plan | Monthly | Yearly | One-liner | Target |
|---|------|---------|--------|-----------|--------|
| 1 | **Essentiel** | 19 TND | 190 TND | QR → digital menu + business info, view only | Cafés, bakeries, snacks, juice/ice-cream shops, beach cafés |
| 2 | **Plus** | 79 TND | 790 TND | + customer table ordering (no kitchen screen) | Cafés, food courts, small restaurants, shisha cafés |
| 3 | **Pro** | 149 TND | 1490 TND | + kitchen display + waiter app + full roles | Professional restaurants, hotel restaurants, large cafés |
| 4 | **Premium** | 499+ TND | custom | + multi-zone, room service, bill-to-room | Hotels, resorts, beach clubs, event venues |

Add-ons / fees:
- **Pro**: +50 TND/month per extra kitchen display.
- **Premium**: 2000–10000 TND one-time setup (config, training, QR install, hardware).
- **Extra tables** (all ordering tiers): each plan includes a table quota; past it,
  tables are a small paid add-on rather than a forced tier jump (see §8).

Each tier **includes everything in the tier below it.**

**QR codes are never a separate charge.** Every tier (including Essentiel) generates
its own print-ready QR table cards from the admin app (Tables → Print Sheet: 4 styles,
A4 4-up with crop marks, optional WiFi block, Save-as-PDF). The owner pays one
subscription price — there is no per-QR fee, no third-party QR purchase, and no reprint
cost when prices change (the QR is permanent; only the menu behind it updates). At
onboarding we hand the client laminated cards as part of setup; the only physical cost is
a few TND of lamination, absorbed into go-live (bundled into the Premium one-time setup
fee for that tier). Use this as a sales counter to the "subscription + buy QR codes"
objection: with Orvexa there is no second price.

---

## 2. Master capability matrix

Every capability flag, the minimum tier that unlocks it, and current build state.
This table is the contract the `PLAN_CAPABILITIES` map in `packages/shared` implements.

| Capability flag | 1 | 2 | 3 | 4 | State |
|---|:--:|:--:|:--:|:--:|---|
| **Menu & QR** | | | | | |
| `menu.view` — customer sees menu | ✅ | ✅ | ✅ | ✅ | ✅ built |
| `menu.edit` — categories/products/photos/allergens/availability | ✅ | ✅ | ✅ | ✅ | ✅ built |
| `menu.theme` — logo + colors/theme | ✅ | ✅ | ✅ | ✅ | ✅ built |
| `menu.multilang` — AR/FR/EN | ✅ | ✅ | ✅ | ✅ | ✅ built |
| `menu.info` — restaurant info card (hours, address, map, phone, socials, wifi) | ✅ | ✅ | ✅ | ✅ | 🔨 to build |
| `qr.generate` — generate/download/print QR per table | ✅ | ✅ | ✅ | ✅ | ✅ built |
| `analytics.views` — scan count, most-viewed, visitor activity | ✅ | ✅ | ✅ | ✅ | 🔨 to build |
| **Ordering** | | | | | |
| `ordering.customer` — scan → table → cart → submit | — | ✅ | ✅ | ✅ | ✅ built (client + API gated) |
| `ordering.inbox` — owner accepts/rejects, sound alerts | — | ✅ | ✅ | ✅ | ✅ built (client + API gated) |
| `customer.call_staff` — "Call Staff" button | — | ✅ | ✅ | ✅ | ✅ built (client + API gated) |
| `customer.request_bill` — "Request Bill" button | — | ✅ | ✅ | ✅ | ✅ built (client + API gated) |
| `analytics.sales_basic` — daily orders, revenue, best products, busy hours | — | ✅ | ✅ | ✅ | ✅ built (client + API gated) |
| `staff.basic` — single owner account (works the Orders inbox itself; no extra accounts) | — | ✅ | ✅ | ✅ | ✅ built (34.16) |
| **Pro operations** | | | | | |
| `kitchen.kds` — Kitchen Display (Pending→Preparing→Ready→Delivered) | — | — | ✅ | ✅ | 🔒 gated-binary |
| `waiter.app` — table map, manual orders, modify | — | — | ✅ | ✅ | 🔒 gated-binary |
| `tables.advanced` — table statuses, floor map, transfer | — | — | ✅ | ✅ | 🔒 gated-binary |
| `bills.split` — open bills, split, cashier flow | — | — | ✅ | ✅ | 🔒 gated-binary |
| `staff.roles_full` — Manager, Waiter, Kitchen, Cashier | — | — | ✅ | ✅ | 🔒 gated-binary |
| `analytics.advanced` — periods, best/worst sellers, employee performance | — | — | ✅ | ✅ | 🔒 gated-binary |
| `inventory` — ingredient tracking, stock alerts | — | — | ✅ | ✅ | ⏳ future |
| **Premium / hospitality** | | | | | |
| `zones.multi` — one business → many areas, each own menu/staff/reports | — | — | — | ✅ | 🔨 to build |
| `room_service` — QR in room → order tied to room number | — | — | — | ✅ | 🔨 to build |
| `bill_to_room` — charges accrue to room, settle at checkout | — | — | — | ✅ | 🔨 to build |
| `analytics.by_zone` — revenue by zone, profitability, peaks | — | — | — | ✅ | 🔨 to build |

---

## 3. Per-app breakdown — what appears

### 3.1 Customer app (`apps/customer`)

| Element | 1 Essentiel | 2 Plus | 3 Pro | 4 Premium |
|---|---|---|---|---|
| Menu browse (categories, items, photos, allergens) | ✅ | ✅ | ✅ | ✅ |
| Language switch AR/FR/EN | ✅ | ✅ | ✅ | ✅ |
| Restaurant info card (hours, address, map, contact, socials, wifi) | ✅ | ✅ | ✅ | ✅ |
| Item detail modal | hidden | ✅ | ✅ | ✅ |
| "Add to cart" / cart bar | hidden | ✅ | ✅ | ✅ |
| Table selection + submit order | hidden | ✅ | ✅ | ✅ |
| Call Staff / Request Bill | hidden | ✅ | ✅ | ✅ |
| Order status tracking | hidden | ✅ | ✅ | ✅ |
| Room-tied ordering / bill-to-room | hidden | hidden | hidden | ✅ |

In Essentiel the customer app is a **read-only menu** — no cart, no table picker, no action buttons. It does show a **view-only restaurant info card** (hours, address/map, contact, socials, wifi) when the owner has filled it in. Item taps do nothing (no detail modal — see 34.7b).

### 3.2 Admin app (`apps/admin`) — nav visibility

| Nav item | 1 | 2 | 3 | 4 | Notes |
|---|:--:|:--:|:--:|:--:|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | Content scales: views-only (1) → sales (2) → advanced (3) → by-zone (4) |
| Menu | ✅ | ✅ | ✅ | ✅ | |
| Tables | ✅ | ✅ | ✅ | ✅ | QR-only (1–2) → floor map + statuses + transfer (3) |
| Settings | ✅ | ✅ | ✅ | ✅ | Ordering/tax/service rows hidden when no ordering; business-info card editor (hours/address/contact/socials/wifi) for all tiers |
| Orders (inbox) | 🔒 | ✅ | ✅ | ✅ | Locked card + upsell on tier 1 |
| Staff | 🔒 | ✅ | ✅ | ✅ | Single owner account (2) → full roles (3) |
| Reports | 🔒 | ✅ | ✅ | ✅ | Basic stats (2) → advanced (3) |
| Feedback | 🔒 | 🔒 | ✅ | ✅ | Pro+ only |
| Open Bills | 🔒 | 🔒 | ✅ | ✅ | cashier/manager/admin only |
| Zones | 🔒 | 🔒 | 🔒 | ✅ | Premium multi-zone manager |

🔒 = nav item rendered **locked with "Upgrade to {tier}" upsell** (per chosen UX), not hidden.

### 3.3 Kitchen app (`apps/kitchen`)

| | 1 | 2 | 3 | 4 |
|---|:--:|:--:|:--:|:--:|
| KDS access | locked screen + upsell | locked screen + upsell | ✅ | ✅ (per-zone) |

Tiers 1–2 that open the kitchen URL get an "Available on Pro" screen.

### 3.4 Waiter app (`apps/waiter`)

| | 1 | 2 | 3 | 4 |
|---|:--:|:--:|:--:|:--:|
| Waiter ops (floor map, manual orders, transfer, split) | locked + upsell | locked + upsell | ✅ | ✅ (per-zone) |

---

## 4. Locked-feature UX rules (decided: visible + upsell)

1. **Whole app locked** (kitchen/waiter below Pro): full-screen "Available on Orvexa Pro — Upgrade" panel; no app chrome.
2. **Nav item locked** (admin): item still renders with a lock glyph; clicking opens an upsell panel naming the unlocking tier + its price; route guard blocks deep-linking.
3. **In-page action locked** (e.g. ordering toggle in Settings): control shown disabled with an inline "Pro" pill + tooltip linking to upgrade.
4. **Customer-facing**: locked features are **hidden, not upsold** — customers must never see Orvexa upsell copy. (Only the menu owner sees upsell.)
5. Upsell copy centralized in `packages/shared` i18n so all three locked states share one message per capability.

---

## 5. Code architecture (central capability map)

Single source of truth in `packages/shared`:

```ts
// packages/shared/src/plans.ts
export type Capability =
  | 'menu.view' | 'menu.edit' | 'menu.theme' | 'menu.multilang' | 'menu.info'
  | 'qr.generate' | 'analytics.views'
  | 'ordering.customer' | 'ordering.inbox'
  | 'customer.call_staff' | 'customer.request_bill'
  | 'analytics.sales_basic' | 'staff.basic'
  | 'kitchen.kds' | 'waiter.app' | 'tables.advanced' | 'bills.split'
  | 'staff.roles_full' | 'analytics.advanced' | 'inventory'
  | 'zones.multi' | 'room_service' | 'bill_to_room' | 'analytics.by_zone';

// minimum tier per capability (tiers are inclusive upward)
export const CAPABILITY_MIN_TIER: Record<Capability, 1 | 2 | 3 | 4> = { /* ... */ };

export function hasCapability(plan: number, cap: Capability): boolean {
  return plan >= CAPABILITY_MIN_TIER[cap];
}
```

- Apps replace every `usePlan() <= 1` / `isPlan1` with `can('ordering.customer')` etc.
- A small `useCan()` hook per frontend wraps `hasCapability(usePlan(), cap)`.
- **API enforces too**: middleware `requireCapability(cap)` on protected routes — gating must not be client-only.
- `CAPABILITY_MIN_TIER` is the only place a feature moves between tiers.

---

## 6. Implementation plan (→ TASKS.md Phase 34)

1. **34.1** Add `plans.ts` (capabilities, `CAPABILITY_MIN_TIER`, `hasCapability`) to `packages/shared`; export.
2. **34.2** `useCan()` hook in each of the 4 frontends.
3. **34.3** Replace all `isPlan1` checks with capability checks (admin nav + Settings + Menu + Dashboard + Tables; customer; kitchen; waiter).
4. **34.4** Locked-state components: `<LockedScreen>` (whole app) + `<UpsellPanel>` / `<ProPill>` (nav + in-page); shared upsell i18n.
5. **34.5** API `requireCapability()` middleware on ordering/kitchen/waiter/bills routes.
6. **34.6** Tier-2 vs tier-3 split: gate KDS, waiter app, open-bills, full roles, advanced tables/analytics behind tier 3 (currently they leak to tier 2).
7. **34.7** `analytics.views` (tier-1 scan/most-viewed stats) — net-new.
8. **34.8** Add `employee` role (role enum + permissions): sees incoming orders only; unlocked at tier 2 (`staff.basic`).
9. **34.9** Essentiel QR: default to a **single menu QR** per restaurant; add a per-restaurant `perTableQr` override flag, set ON for Capitol (grandfathered).
10. **34.10** Pricing page: monthly price + "billed yearly (X TND/year)" note.
11. **34.11** Premium: `zones.multi`, `room_service`, `bill_to_room`, `analytics.by_zone` — net-new (own sub-phase, post-launch).
12. **34.12** Essentiel restaurant info card — new `menu.info` capability (tier 1, all tiers inherit). Net-new restaurant fields (opening hours, address, map link, phone, social links, wifi name/password) + Settings editor + customer-menu render. Owner-filled and optional, so Capitol's live menu is unaffected until data is entered.

---

## 7. Decisions (resolved 2026-06-16)

- [x] **Essentiel QR** — **single menu QR** for the whole place (wall/counter), not per-table.
      **Exception: Capitol** keeps its already-printed per-table QRs (grandfathered).
      → Implementation must support a per-restaurant override, not a hard tier rule.
- [x] **Tier-2 "Employee" role** — ~~add a **new lighter `employee` role** (sees incoming orders only),
      separate from `waiter`~~. **Superseded (34.16):** Plus ships a **single owner account** that works
      the Orders inbox directly in the admin app — no separate employee/order-taker account. The dead
      `employee` branch was removed. "Accounts included" on Plus = **1**.
- [x] **Annual pricing display** — show **monthly price** with a small "billed yearly (X TND/year)" note.
- [x] **`feedback`** — **Pro (tier 3)** only.
- [x] **Essentiel scope refinement (2026-06-16)** — add a view-only **restaurant info card**
      (hours, address, map link, phone, socials, wifi) to Essentiel as `menu.info` (all tiers inherit).
      Owner-filled in Settings, optional → **safe for Capitol's live menu** (nothing shows until data is entered).
      **Not added:** read-only item-detail modal, most-viewed analytics, customer call-staff button —
      all stay out of Essentiel (item-detail stays declined per 34.7b; call-staff stays Plus-tier).
      **Confirmed 2026-06-16:** `menu.info` is tier-inclusive (shows on Essentiel *and above*, not Essentiel-only);
      opening hours are one open–close block per day (no midday split shift) — sufficient for cafés/Capitol, revisit only if a split-shift client appears.
- [x] **Table quota model (2026-06-17)** — **soft cap + paid overage**, not a hard wall (see §8).
      Table count does not track software value the way SaaS seats do (a 40-table café uses the
      same menu/inbox/ordering as a 20-table one), so a hard block would force an unwanted tier
      jump and cause churn. Each ordering tier ships a generous included quota; past it, extra
      tables are a small per-table (or pack-of-10) add-on that keeps the customer on the plan whose
      *features* fit them, while still nudging an upgrade once the add-on exceeds the next tier's delta.
      **`perTableQr` stays a manual toggle** (not plan-derived) per owner decision.

---

## 8. Table quota per tier (soft cap + paid overage)

> Decided 2026-06-17. Tables are gated by **count**, not a boolean capability — so this
> lives as a per-tier number (`TABLE_QUOTA`), **not** in `CAPABILITY_MIN_TIER`. A
> per-restaurant `extraTables` override holds purchased overage on top of the tier quota.

| Tier | Included tables | Past quota | Rationale |
|---|---|---|---|
| 1 Essentiel | n/a (cosmetic) | — | Single menu QR; a "table" has no order to bind to, so count is inert |
| 2 Plus | **30 included** | per-table add-on | Covers most cafés/food courts |
| 3 Pro | **150 included** | per-table add-on | Professional restaurants |
| 4 Premium | **unlimited** | — | Hotels/venues; zones, not table caps, are the scaling axis |

**Behavior**
- Effective limit = `TABLE_QUOTA[tier] + restaurant.extraTables`.
- Enforce on `createTable` (API) and gate `bulkAdd100` in [TablesManager.tsx](apps/admin/src/pages/TablesManager.tsx)
  so it stops at the limit and shows an **"add more tables"** owner upsell instead of silently creating 100.
- Overage pricing (per-table TND/mo vs pack-of-10) — **TBD**, finalize before tenant #2.
- **Capitol is grandfathered** (first client, always an exception): never cap Capitol's tables.
  The `extraTables` override is the mechanism — Capitol gets effectively unlimited regardless of tier.
- **Not on the go-live critical path.** Capitol is a single Pro venue under the included Pro quota;
  this is a billing-model item for when onboarding tenant #2 (post single-tenant period).
