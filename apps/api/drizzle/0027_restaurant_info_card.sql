-- Phase 34.12 — Essentiel restaurant info card (menu.info capability).
-- View-only business info shown on the customer menu: hours, address, contact,
-- socials, wifi. All owner-filled and optional (nullable), so existing restaurants
-- (incl. Capitol) are unaffected until the owner enters data.
ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "address" text,
  ADD COLUMN IF NOT EXISTS "map_url" text,
  ADD COLUMN IF NOT EXISTS "phone" text,
  ADD COLUMN IF NOT EXISTS "instagram_url" text,
  ADD COLUMN IF NOT EXISTS "facebook_url" text,
  ADD COLUMN IF NOT EXISTS "tiktok_url" text,
  ADD COLUMN IF NOT EXISTS "wifi_ssid" text,
  ADD COLUMN IF NOT EXISTS "wifi_password" text,
  ADD COLUMN IF NOT EXISTS "opening_hours" jsonb;
