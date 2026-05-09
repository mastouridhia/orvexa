# Performance — Bundles + DB Indexes

## Frontend bundle baselines (2026-04-25)

Measured with `npm run build` against the production target. JS sizes are post-minification, gzip column is the size on the wire.

| App      | JS (raw)  | JS (gzip)  | CSS (raw) | Modules |
|----------|-----------|------------|-----------|---------|
| admin    | 390.28 kB | 119.40 kB  | 9.45 kB   | ~120    |
| customer | 361.78 kB | 114.33 kB  | 9.83 kB   | 117     |
| kitchen  | 302.23 kB | 95.65 kB   | 5.59 kB   | 101     |
| waiter   | 308.01 kB | 97.12 kB   | 7.95 kB   | 102     |

All four apps come in under 120kB gzipped — well within the "comfortably below the 200kB initial-payload target for mobile-first restaurant ordering" envelope.

## Bundle composition

The bulk of every bundle is a small React 19 + i18next + react-router + zustand + socket.io-client stack. Customer/admin add `react-router-dom`; admin's extra ~30kB is the form-heavy CRUD pages and chart code in Reports.

To inspect what's in a bundle:

```bash
cd apps/<app-name>
npm run build:analyze
# Then open dist/bundle-stats.html in a browser
```

The `build:analyze` script runs `vite build` with `ANALYZE=true`, which activates `rollup-plugin-visualizer` (treemap, gzip + brotli sizes). Wired in each app's `vite.config.ts` as a conditional plugin so normal builds aren't slowed.

## Optimization opportunities (deferred — current sizes are healthy)

- **Code-split Reports + MenuEditor in admin** (saves ~40kB initial). Worthwhile when admin grows past ~150kB gzipped.
- **Lazy-load Arabic font** in customer if RTL detection lands later.
- **Replace `qrcode` server-side library** with a smaller WASM build if QR generation becomes a hot path (currently called once per table per day).

## Database indexes (migration `0003_perf_indexes.sql`)

Three composite/single-column indexes added to cover hot paths surfaced by reading the repository code:

| Index | Table | Columns | Hot path |
|-------|-------|---------|----------|
| `order_items_dish_idx` | `order_items` | `(dish_id)` | `ReportsService.topItems` joins items → dishes by `dish_id`; without this it falls back to a seq scan of `order_items` for any aggregation that filters by dish. The pre-existing `order_items_order_idx` only covers reverse lookups by `order_id`. |
| `payments_order_status_idx` | `payments` | `(order_id, status)` | Split-bill flows aggregate paid amounts per order in `PaymentService.record`. Existing `payments_order_idx` covers `(order_id)` but the per-order status filter ends up sequential. |
| `customer_sessions_table_idx` | `customer_sessions` | `(table_id)` | `TableService.deriveForTable` and customer-session bootstrap both look up the most recent session for a given table. Pre-existing index was on `table_day_token_id`. |

### Indexes already in place (from earlier migrations — no work needed)

- `orders (restaurant_id, status, created_at)` — covers `OrderService.list*` filtered by status
- `orders (table_id, created_at)` — covers `listActiveForTables`, `hasNonTerminalForTable`
- `orders (assigned_waiter_id)` — covers waiter-routing lookups (added in `0002`)
- `tables (restaurant_id, label)` UNIQUE — covers ordered table list
- `waiter_calls (restaurant_id, cleared_at)` — covers open-calls feed
- `categories (restaurant_id, sort_order)`, `dishes (category_id, sort_order)` — menu rendering paths

## Profiling next steps (not yet done)

- Run `EXPLAIN ANALYZE` on the slowest reports query (`revenueByCategory`) under realistic data volumes (>10k orders) to confirm `order_items_dish_idx` plus the existing dish→category FK chain is sufficient before adding a covering index.
- Add a pino slow-query log channel (e.g. log queries above 200ms) so production can self-report regressions.
