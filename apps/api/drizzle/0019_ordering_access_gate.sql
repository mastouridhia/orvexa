-- Phase 23 — anti-spam ordering access gate.
-- Adds presence-proof state so the static printed QR can't be used to spam
-- orders from off-premises. All columns are additive and defaulted, so this is
-- safe to apply on the live database with zero downtime.

ALTER TABLE "restaurants"
  ADD COLUMN "order_gate_mode" text NOT NULL DEFAULT 'off';
--> statement-breakpoint
ALTER TABLE "restaurants"
  ADD COLUMN "allowed_networks" text[] NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "tables"
  ADD COLUMN "ordering_code" text;
--> statement-breakpoint
ALTER TABLE "tables"
  ADD COLUMN "ordering_code_expires_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "customer_sessions"
  ADD COLUMN "presence_verified_at" timestamptz;
