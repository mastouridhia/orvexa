-- Phase 17.2 — query profiling indexes
--
-- `order_items.dish_id`: hot path for ReportsService.topItems (joins order_items → dishes)
-- and revenueByCategory (groups by dish then category). Without this, postgres falls back to
-- a seq scan on order_items for any aggregation that filters by dish. Existing
-- `order_items_order_idx` only covers reverse lookups by order_id.
CREATE INDEX IF NOT EXISTS "order_items_dish_idx" ON "order_items" ("dish_id");
--> statement-breakpoint

-- `payments.status`: split-bill flows aggregate paid amounts per order to compute remaining
-- balance (PaymentService.record). Existing `payments_order_idx` covers (order_id) but the
-- per-order status filter ends up sequential. Composite (order_id, status) preserves the
-- existing single-column lookup while accelerating the aggregation.
CREATE INDEX IF NOT EXISTS "payments_order_status_idx" ON "payments" ("order_id", "status");
--> statement-breakpoint

-- `customer_sessions.table_id`: TableService.deriveForTable + customer-session bootstrap
-- both look up the most recent session for a given table. Existing index is on
-- table_day_token_id which is many-to-one with table; this gives direct access.
CREATE INDEX IF NOT EXISTS "customer_sessions_table_idx" ON "customer_sessions" ("table_id");
