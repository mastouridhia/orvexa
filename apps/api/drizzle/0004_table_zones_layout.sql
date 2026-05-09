-- Phase 18.25 — Floor-plan table zones + per-table normalized coordinates
-- Admin draws a per-zone canvas; waiter app consumes the persisted layout.

CREATE TABLE "table_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "table_zones_restaurant_name_idx" ON "table_zones" ("restaurant_id", "name");
--> statement-breakpoint
CREATE INDEX "table_zones_restaurant_sort_idx" ON "table_zones" ("restaurant_id", "sort_order");
--> statement-breakpoint
CREATE TRIGGER "set_updated_at"
  BEFORE UPDATE ON "table_zones"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- Tables get an optional zone + normalized 0..1 canvas coordinates.
-- Existing tables stay null; waiter UI keeps its current behavior until admin places them.
ALTER TABLE "tables"
  ADD COLUMN "zone_id" uuid REFERENCES "table_zones"("id") ON DELETE SET NULL,
  ADD COLUMN "x" double precision,
  ADD COLUMN "y" double precision;
--> statement-breakpoint
CREATE INDEX "tables_zone_idx" ON "tables" ("zone_id");
--> statement-breakpoint

-- Defensive: x/y are normalized 0..1 coordinates. Values outside that range would
-- silently break the floor-plan editor's drag-drop math, so reject at the DB layer.
ALTER TABLE "tables"
  ADD CONSTRAINT "tables_x_range" CHECK ("x" IS NULL OR ("x" >= 0 AND "x" <= 1)),
  ADD CONSTRAINT "tables_y_range" CHECK ("y" IS NULL OR ("y" >= 0 AND "y" <= 1));
