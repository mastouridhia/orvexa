-- Add item_status to order_items (was skipped when 0011 was partially applied)
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "item_status" text DEFAULT 'received' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_status_idx" ON "order_items" ("item_status");
