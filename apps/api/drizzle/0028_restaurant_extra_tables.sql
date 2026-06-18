-- Phase 34.14 — table quota soft cap + paid overage (PLANS.md §8).
-- Per-tier included quota lives in code (TABLE_QUOTA); this column holds purchased
-- overage on top of it. Effective limit = TABLE_QUOTA[plan] + extra_tables.
-- Default 0: existing tenants keep the plain tier quota. Capitol is grandfathered
-- by setting a large value (done in the provision/seed path), never a hard cap.
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "extra_tables" integer NOT NULL DEFAULT 0;
