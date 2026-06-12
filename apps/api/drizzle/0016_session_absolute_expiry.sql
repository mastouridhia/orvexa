-- S-07: absolute lifetime cap on customer sessions
-- Sets absolute_expires_at = created_at + 24h for existing rows so they don't
-- get a NULL constraint violation on the backfill.
ALTER TABLE "customer_sessions"
  ADD COLUMN IF NOT EXISTS "absolute_expires_at" TIMESTAMPTZ;

UPDATE "customer_sessions"
  SET "absolute_expires_at" = "created_at" + INTERVAL '24 hours'
  WHERE "absolute_expires_at" IS NULL;

ALTER TABLE "customer_sessions"
  ALTER COLUMN "absolute_expires_at" SET NOT NULL;
