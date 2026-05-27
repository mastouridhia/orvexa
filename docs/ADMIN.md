# Admin Guide

Everything a restaurant owner / manager needs to operate Orvexa from the admin app (default URL: `http://localhost:5176` in dev, `admin.<your-domain>` in prod).

## First sign-in

Default seeded admin credentials in dev: `admin@demo.tn` / `orvexa`. Change these immediately in production by creating a new admin via the Staff page and disabling the seeded one.

## Dashboard

The landing page after sign-in. Live-updates over the realtime socket whenever orders are placed or table status changes.

You'll see:

- **Today's sales** — total revenue from `served` orders since 00:00 in the restaurant's timezone.
- **Active orders** — anything in `received` / `preparing` / `ready`.
- **Active tables** — count of tables with a derived status that isn't `free`.
- **Top items today** — best-selling dishes by quantity.
- **First-run checklist** (only visible until your restaurant is fully set up) — restaurant info, menu, tables, staff. Each step links to the right page; the checklist hides itself once everything's done. Click "Dismiss" to hide it permanently.

## Menu editor

Three concepts, in order:

1. **Categories** (e.g. _Entrées_, _Plats_, _Desserts_) — group dishes for the customer's tab navigation.
2. **Dishes** — individual menu items with a name, optional description, image, and base price (in TND).
3. **Variant groups** — extras attached to a dish (e.g. _Sauce_ with options _Harissa +0.500_, _Mayonnaise +0_). Each group has a selection type (single / multi), required-or-not, and min/max counts.

Names + descriptions are localized into the three supported languages (Arabic / French / English) via the `<TriLangInput />` 3-tab editor. You only have to fill the language(s) your customers will actually use — empty entries fall back to French at render time.

### Adding a "Harissa +500 millimes" extra to a Brik

1. Open _Menu_ → click the dish _Brik à l'œuf_.
2. In the **Variant groups** panel, click _+ New variant group_.
3. Name: _Sauce_. Selection type: _single_. Required: off (customer can skip).
4. Add a variant _Harissa_ with `priceDelta = 0.500`. Add another _Mayonnaise_ with `priceDelta = 0`.
5. Save.

Customers see the options when they tap the dish; the +0.500 TND delta rolls into the line total + the order's subtotal.

## Tables

Each table has a label (typically `Table 1`, `Salon 4`, etc.) and a seat count. Print sheets generate a QR per table — every QR encodes a daily-rotating session token, so a printed sheet stays valid forever; only the underlying URL changes per day automatically.

### Merging tables (parties / birthdays)

When a group spans multiple tables, "merge" lets you treat them as one unit for billing.

1. On the _Tables_ page, on the row for the table that will be the **leader**, open the _Merge with_ dropdown and pick the other table to fold in.
2. Repeat for additional tables (each member points at the same leader).
3. Orders placed at the leader table are part of the merged group's bill. Member rows show _→ Leader_ in the _Merged_ column.
4. To unmerge, click _Unmerge_ on a member row.

Merged tables don't share QR codes — customers still scan their own table's QR. The merge is a billing/grouping construct, not a routing one.

## Staff

Roles available:

- **admin** — full access, including creating other admins.
- **manager** — like admin but can't create/disable other admins. Read-only access to staff list (no writes).
- **kitchen** — sees the kitchen board only (can advance order status but not take payments).
- **waiter** — sees the waiter app only (can mark served, take payment, request bills on customers' behalf).

### Attendance (Present today)

Each staff member has a "Present today" checkbox in the staff table. Toggling it writes to `staff_shifts` for today's date, with `checked_in_at` set on first toggle to true and `checked_out_at` set when toggled to false. There's no enforcement — it's a passive log meant for shift accountability, not authorization. The dashboard does not surface it; query it via the API (`GET /staff/shifts?from=...&to=...`) for reporting.

## Orders

Every order in the system, paginated. Filter by status (received / preparing / ready / served / cancelled). Click any order for the full receipt (line items, tax, service, total, payments). Use _Export CSV_ for accounting hand-offs.

## Reports

Three views:

- **Sales** — revenue bucketed by day / week / month over a date range.
- **Top items** — most-ordered dishes by quantity for a date range.
- **By category** — revenue grouped by menu category.

All three pull from `served` orders (cancelled and active orders are excluded from revenue).

## Settings

- **Restaurant name + timezone** — affects every "today" calculation.
- **Tax % + service %** — applied to every new order (existing orders keep the percentages they were placed at).
- **Default language** + **Supported languages** — controls which language tabs show in the customer app and the default for first-time visitors.
- **UI language** (separate card) — your personal admin-app language. Persists to localStorage.

## Common tasks

- **Disable a staff member** — Staff page → click _Disable_. They cannot log in. Re-enable later if needed.
- **Take a dish off the menu temporarily** — Menu → Dishes → click the dish → toggle _Available_. Keeps the dish in the catalog but hides it from customers.
- **Reorder categories** — Categories → drag rows to reorder. The customer's tab order follows.
- **Refund / mark a paid order as failed** — not yet wired in the UI. Manual via the API for now (`PATCH /orders/:id/payment-status`).
