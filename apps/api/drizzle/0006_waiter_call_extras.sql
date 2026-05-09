-- Customer-facing "request extras" flow (Phase 20.18).
-- Reuses the existing waiter_calls table with a new `kind` value plus a free-text note.

ALTER TABLE "waiter_calls"
  ADD COLUMN IF NOT EXISTS "note" text;
