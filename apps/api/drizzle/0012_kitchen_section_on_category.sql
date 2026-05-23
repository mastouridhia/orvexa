-- kitchen_section was already added to categories in 0011; this migration is a safe no-op
-- for the ADD, and drops the column from dishes if it was ever added there.
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "kitchen_section" text DEFAULT 'kitchen' NOT NULL;
--> statement-breakpoint
ALTER TABLE "dishes" DROP COLUMN IF EXISTS "kitchen_section";
