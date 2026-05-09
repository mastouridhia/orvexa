-- Phase 20.19 — shared table cart (multi-user session).
-- One open draft cart per table; the first scanner of a given day-token
-- becomes the owner and is the only one allowed to checkout / call waiter / request bill.

CREATE TABLE IF NOT EXISTS "table_carts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "table_id" uuid NOT NULL UNIQUE REFERENCES "tables"("id") ON DELETE CASCADE,
  "table_day_token_id" uuid NOT NULL REFERENCES "table_day_tokens"("id") ON DELETE CASCADE,
  "owner_session_id" uuid NOT NULL REFERENCES "customer_sessions"("id") ON DELETE CASCADE,
  "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "table_carts_token_idx"
  ON "table_carts" ("table_day_token_id");

CREATE TRIGGER "table_carts_set_updated_at"
  BEFORE UPDATE ON "table_carts"
  FOR EACH ROW EXECUTE PROCEDURE "set_updated_at"();
