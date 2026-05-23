-- Add kitchen_section to categories (the category determines the prep station)
ALTER TABLE "categories" ADD COLUMN "kitchen_section" text DEFAULT 'kitchen' NOT NULL;
--> statement-breakpoint
-- Snapshot kitchen_section and per-item status onto order_items at order time
ALTER TABLE "order_items" ADD COLUMN "kitchen_section" text DEFAULT 'kitchen' NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "item_status" text DEFAULT 'received' NOT NULL;
--> statement-breakpoint
CREATE INDEX "order_items_kitchen_section_idx" ON "order_items" ("kitchen_section");
--> statement-breakpoint
CREATE INDEX "order_items_item_status_idx" ON "order_items" ("item_status");
