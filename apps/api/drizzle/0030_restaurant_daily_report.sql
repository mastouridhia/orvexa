-- Phase 35.2 — daily email report (Plus+).
-- Per-restaurant opt-in + recipient for the scheduled "Rapport quotidien par email".
-- Default disabled; recipient nullable (job skips restaurants without a recipient).
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "daily_report_enabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "report_email" text;
