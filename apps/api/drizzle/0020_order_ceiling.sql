-- Phase 24 — configurable per-table order ceiling.
-- Replaces the hardcoded ORDER_CEILING = 6 constant with a per-restaurant
-- setting so admins can tune it from the dashboard.
-- Additive + defaulted: safe to apply on the live database with zero downtime.

ALTER TABLE "restaurants"
  ADD COLUMN "order_ceiling" integer NOT NULL DEFAULT 20;
