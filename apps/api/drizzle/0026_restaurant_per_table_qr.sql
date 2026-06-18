-- Phase 34.9 — per-restaurant QR mode.
-- true  = print one QR sticker per table (full ordering venues, and Capitol — grandfathered).
-- false = a single menu QR for the whole place (Essentiel menu-only venues).
-- Default true is intentional: every existing restaurant (incl. Capitol) keeps its
-- current per-table behavior with no data change; new Essentiel tenants are set to
-- false at provision time.
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "per_table_qr" boolean NOT NULL DEFAULT true;
