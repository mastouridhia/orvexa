# Database Migrations — Runbook

## How migrations work

Drizzle Kit generates numbered SQL files in `apps/api/drizzle/`.
`apps/api/src/db/migrate.ts` applies them on startup (called from `index.ts`).
The journal at `drizzle/meta/_journal.json` records which files have been applied.

**Drizzle has no built-in rollback.** Every rollback requires manual SQL.

---

## Creating a new migration

```bash
# 1. Edit the schema in src/db/schema/
# 2. Generate the migration SQL file:
npm run db:generate --workspace=apps/api

# 3. Review the generated file in apps/api/drizzle/
# 4. Apply it (or restart the API — migrate runs on startup):
npm run db:migrate --workspace=apps/api
```

---

## Rolling back a migration

Two strategies depending on the situation.

### Strategy A — Forward fix (preferred)

Write a new migration that undoes the change. This keeps drizzle's journal
consistent and is safe to deploy normally.

```bash
# Edit schema to reverse the change, then:
npm run db:generate --workspace=apps/api
# Review and test, then deploy
```

### Strategy B — Emergency rollback (production incident)

Use when the change must be reversed immediately and you cannot wait for a
deployment cycle.

1. **Apply the inverse SQL manually** on the database (see per-migration SQL below).
2. **Remove the journal entry** from `drizzle/meta/_journal.json`:
   delete the object with the matching `tag`.
3. **Delete the migration file** (e.g., `drizzle/0016_session_absolute_expiry.sql`).
4. If you deployed and the migration already ran on all nodes:
   rebuild and redeploy so the API starts without trying to re-apply the removed file.

> After Strategy B the schema and code must stay in sync — don't leave a file
> in `src/db/schema/` that references columns you just dropped.

---

## Per-migration rollback SQL

### 0000 — Initial schema (catastrophic — full data loss)

```sql
-- WARNING: drops everything
DROP TABLE IF EXISTS
  order_items, payments, orders, table_carts,
  customer_sessions, table_day_tokens, waiter_calls,
  staff_shifts, feedback, categories, dishes,
  variant_groups, variants, refresh_tokens,
  tables, table_zones, users, restaurants CASCADE;
```

### 0001 — updated_at trigger

```sql
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.triggers
    WHERE trigger_name = 'set_updated_at' AND trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I;', r.table_name);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS set_updated_at();
```

### 0002 — Feature batch 2026-04 (waiter routing, table merge, staff_shifts)

```sql
DROP TABLE IF EXISTS staff_shifts CASCADE;
DROP INDEX IF EXISTS tables_merged_into_idx;
ALTER TABLE tables DROP COLUMN IF EXISTS merged_into_table_id;
DROP INDEX IF EXISTS orders_assigned_waiter_idx;
ALTER TABLE orders DROP COLUMN IF EXISTS assigned_waiter_id;
```

### 0003 — Performance indexes

```sql
DROP INDEX IF EXISTS order_items_dish_idx;
DROP INDEX IF EXISTS payments_order_status_idx;
DROP INDEX IF EXISTS customer_sessions_table_idx;
```

### 0004 — Table zones + floor-plan coordinates

```sql
ALTER TABLE tables
  DROP CONSTRAINT IF EXISTS tables_x_range,
  DROP CONSTRAINT IF EXISTS tables_y_range;
DROP INDEX IF EXISTS tables_zone_idx;
ALTER TABLE tables
  DROP COLUMN IF EXISTS zone_id,
  DROP COLUMN IF EXISTS x,
  DROP COLUMN IF EXISTS y;
DROP TABLE IF EXISTS table_zones CASCADE;
```

### 0005 — Dish image_urls array

```sql
-- NOTE: re-applying 0005 will not recover image_urls data — the backfill
-- from image_url is idempotent but data added after 0005 is lost.
ALTER TABLE dishes DROP COLUMN IF EXISTS image_urls;
```

### 0006 — Waiter-call note field

```sql
ALTER TABLE waiter_calls DROP COLUMN IF EXISTS note;
-- also revert kind back if you added it in an earlier migration;
-- check 0006 — it only adds 'note', 'kind' was added in the initial schema.
```

### 0007 — table_carts

```sql
DROP TABLE IF EXISTS table_carts CASCADE;
```

### 0008 — Prep time + feedback

```sql
DROP TABLE IF EXISTS feedback CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS prep_time_minutes;
ALTER TABLE restaurants
  DROP CONSTRAINT IF EXISTS restaurants_default_prep_minutes_range_chk,
  DROP COLUMN IF EXISTS default_prep_minutes;
ALTER TABLE dishes
  DROP CONSTRAINT IF EXISTS dishes_prep_time_minutes_range_chk,
  DROP COLUMN IF EXISTS prep_time_minutes;
```

### 0009 — payment_point on restaurants

```sql
ALTER TABLE restaurants
  DROP CONSTRAINT IF EXISTS restaurants_payment_point_chk,
  DROP COLUMN IF EXISTS payment_point;
```

### 0010 — table public_slug

```sql
-- WARNING: QR codes printed with slugs will stop working after this rollback.
DROP INDEX IF EXISTS tables_public_slug_idx;
ALTER TABLE tables
  ALTER COLUMN public_slug DROP DEFAULT,
  DROP COLUMN IF EXISTS public_slug;
```

### 0011 — kitchen_section on categories + order_items

```sql
DROP INDEX IF EXISTS order_items_kitchen_section_idx;
DROP INDEX IF EXISTS order_items_item_status_idx;
ALTER TABLE order_items
  DROP COLUMN IF EXISTS item_status,
  DROP COLUMN IF EXISTS kitchen_section;
ALTER TABLE categories DROP COLUMN IF EXISTS kitchen_section;
```

### 0012 — kitchen_section cleanup (dishes column removed)

```sql
-- 0012 removed kitchen_section from dishes. Rollback adds it back.
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS kitchen_section text DEFAULT 'kitchen' NOT NULL;
```

### 0013 — item_status safety net (idempotent add)

```sql
DROP INDEX IF EXISTS order_items_status_idx;
ALTER TABLE order_items DROP COLUMN IF EXISTS item_status;
```

### 0014 — refresh_tokens table

```sql
-- WARNING: all active refresh tokens are lost; all logged-in staff are logged out.
DROP TABLE IF EXISTS refresh_tokens CASCADE;
```

### 0015 — token_version on users

```sql
-- WARNING: all outstanding access tokens are immediately accepted again
-- (token version checking stops working).
ALTER TABLE users DROP COLUMN IF EXISTS token_version;
```

### 0016 — absolute_expires_at on customer_sessions

```sql
ALTER TABLE customer_sessions
  DROP COLUMN IF EXISTS absolute_expires_at;
```

---

## Checking what has been applied

```sql
SELECT * FROM drizzle."__drizzle_migrations" ORDER BY created_at;
```

(Drizzle stores applied migration hashes in its own schema, not in the journal file.)

## VPS quick reference

```bash
ssh orvexa-vps
cd /opt/orvexa
git pull
npm run build --workspace=apps/api
# migrations run automatically on next start:
docker compose restart api
docker compose logs -f api  # watch for "migrations complete"
```
