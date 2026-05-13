-- Stable per-table public slug for printed QR codes. The slug never changes
-- once a table exists; daily rotation continues to happen inside
-- table_day_tokens but is no longer encoded in the printed URL.

ALTER TABLE "tables" ADD COLUMN "public_slug" text;
--> statement-breakpoint
UPDATE "tables"
   SET "public_slug" = substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 10)
 WHERE "public_slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "tables" ALTER COLUMN "public_slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tables"
  ALTER COLUMN "public_slug"
  SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10);
--> statement-breakpoint
CREATE UNIQUE INDEX "tables_public_slug_idx" ON "tables" ("public_slug");
