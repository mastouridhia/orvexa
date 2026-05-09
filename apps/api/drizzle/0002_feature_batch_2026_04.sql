-- Feature batch 2026-04: waiter routing, table merge, staff attendance
-- Tasks 11.12, 13.19, 13.20

-- 11.12 — Track which waiter a ready order is routed to
ALTER TABLE "orders"
  ADD COLUMN "assigned_waiter_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "orders_assigned_waiter_idx" ON "orders" ("assigned_waiter_id");
--> statement-breakpoint

-- 13.19 — Merge tables for parties: a member table points at its leader; orders/bills follow the leader
ALTER TABLE "tables"
  ADD COLUMN "merged_into_table_id" uuid REFERENCES "tables"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "tables_merged_into_idx" ON "tables" ("merged_into_table_id");
--> statement-breakpoint

-- 13.20 — Simple shift attendance (present today yes/no per shift)
CREATE TABLE "staff_shifts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shift_date" date NOT NULL,
  "present" boolean NOT NULL DEFAULT false,
  "checked_in_at" timestamp with time zone,
  "checked_out_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "staff_shifts_user_date_unique" UNIQUE ("user_id", "shift_date")
);
--> statement-breakpoint
CREATE INDEX "staff_shifts_restaurant_date_idx" ON "staff_shifts" ("restaurant_id", "shift_date");
--> statement-breakpoint
CREATE TRIGGER "staff_shifts_updated_at"
  BEFORE UPDATE ON "staff_shifts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
