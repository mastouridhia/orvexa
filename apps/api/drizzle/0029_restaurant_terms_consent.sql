-- Legal consent capture at account creation (CGU + Politique de confidentialité).
-- Stored as proof: timestamp of acceptance + version of the accepted document set.
-- Nullable so existing tenants (provisioned before consent gating) are unaffected.
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone;
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "terms_version" text;
