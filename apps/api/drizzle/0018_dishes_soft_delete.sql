-- Soft-delete support for menu items.
-- Hard-deleting a dish breaks the display of order history for any order that
-- referenced it. With deleted_at we can hide the dish from the live menu
-- while keeping the FK intact for historical orders and reports.
ALTER TABLE "dishes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dishes_deleted_at_idx" ON "dishes" ("deleted_at") WHERE "deleted_at" IS NULL;
