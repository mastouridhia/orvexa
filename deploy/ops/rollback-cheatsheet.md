# Orvexa — Rollback Cheat Sheet

**VPS:** 51.210.97.193 | **Repo:** /opt/orvexa | **Compose file:** /opt/orvexa/docker-compose.yml

---

## Step 1 — SSH in

```bash
ssh root@51.210.97.193
cd /opt/orvexa
```

---

## Step 2 — Identify the bad commit

```bash
git log --oneline -10
```

Note the commit hash you want to roll back to (the last known-good one).

---

## Step 3 — Roll back the code

```bash
git fetch origin
git checkout <good-commit-hash>
```

---

## Step 4 — Rebuild and restart

```bash
docker compose build --no-cache api
docker compose up -d --force-recreate api
```

> If a frontend is broken too:
> ```bash
> docker compose build --no-cache customer kitchen waiter admin
> docker compose up -d --force-recreate customer kitchen waiter admin
> ```

---

## Step 5 — Verify it's up

```bash
curl -s https://api.orvexa.tn/health
# Should return: {"status":"ok"}
```

Open https://orvexa.tn in a browser and place a test order.

---

## If the database migration broke things

**Check which migration ran last:**
```bash
docker compose exec db psql -U orvexa -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

**Roll back one migration manually** (run the inverse SQL from the migration file in `apps/api/drizzle/`):
```bash
docker compose exec db psql -U orvexa
```

Then paste the reverse SQL. Re-check `/health` after.

---

## If the DB is corrupt — restore from backup

```bash
# List available backups
ls /opt/orvexa/backups/

# Restore (replace YYYY-MM-DD with the backup date)
docker compose exec -T db psql -U orvexa orvexa < /opt/orvexa/backups/orvexa_YYYY-MM-DD.sql
```

---

## Emergency — full service restart

```bash
docker compose down
docker compose up -d
```

---

## Contacts if stuck

See emergency-contacts.md on this server or posted in the restaurant.
