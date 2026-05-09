-- Phase 19.6 + 19.7 — per-dish estimated prep time + post-bill customer feedback.

-- 19.7 — per-dish prep time
ALTER TABLE "dishes"
  ADD COLUMN IF NOT EXISTS "prep_time_minutes" integer;

ALTER TABLE "dishes"
  ADD CONSTRAINT "dishes_prep_time_minutes_range_chk"
  CHECK ("prep_time_minutes" IS NULL OR ("prep_time_minutes" >= 1 AND "prep_time_minutes" <= 120));

-- restaurant-level fallback
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "default_prep_minutes" integer NOT NULL DEFAULT 15;

ALTER TABLE "restaurants"
  ADD CONSTRAINT "restaurants_default_prep_minutes_range_chk"
  CHECK ("default_prep_minutes" >= 1 AND "default_prep_minutes" <= 120);

-- snapshot per-line at order time so changing the dish later doesn't retroactively change ETAs
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "prep_time_minutes" integer;

-- 19.6 — customer feedback
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "table_id" uuid REFERENCES "tables"("id") ON DELETE SET NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "session_id" uuid REFERENCES "customer_sessions"("id") ON DELETE SET NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "locale" text NOT NULL DEFAULT 'fr',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "feedback"
  ADD CONSTRAINT "feedback_rating_range_chk"
  CHECK ("rating" >= 1 AND "rating" <= 5);

-- one feedback per order (keeps the customer-facing card a single-shot)
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_order_unique_idx"
  ON "feedback" ("order_id")
  WHERE "order_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "feedback_restaurant_created_idx"
  ON "feedback" ("restaurant_id", "created_at" DESC);
