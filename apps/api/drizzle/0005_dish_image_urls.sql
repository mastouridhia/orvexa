-- Add multiple-image support for dishes.
-- Keep legacy `image_url` for backward compatibility (first image).

ALTER TABLE "dishes"
  ADD COLUMN IF NOT EXISTS "image_urls" text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill from legacy single image.
UPDATE "dishes"
SET "image_urls" = ARRAY["image_url"]
WHERE "image_url" IS NOT NULL
  AND array_length("image_urls", 1) IS NULL;

