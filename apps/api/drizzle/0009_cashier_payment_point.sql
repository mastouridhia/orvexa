-- Phase 19.8 / 19.9 — cashier role + per-restaurant payment_point
-- Note: users.role is text without a DB-level CHECK constraint, so the new
-- 'cashier' value needs no migration — it is enforced by the drizzle/zod enums only.

ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "payment_point" text NOT NULL DEFAULT 'table';

ALTER TABLE "restaurants"
  DROP CONSTRAINT IF EXISTS "restaurants_payment_point_chk";

ALTER TABLE "restaurants"
  ADD CONSTRAINT "restaurants_payment_point_chk"
  CHECK ("payment_point" IN ('table', 'counter'));
