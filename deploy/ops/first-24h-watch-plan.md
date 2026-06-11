# Orvexa — First 24-Hour Watch Plan

Run these checks actively during the first service. Keep an SSH terminal open the whole time.

---

## Terminal 1 — Live API logs

```bash
ssh root@51.210.97.193
cd /opt/orvexa
docker compose logs -f api
```

**What to watch for:**
- `ERROR` lines — note the route and timestamp
- `429` (rate limit hit) — expected if staff refreshes too fast, abnormal if constant
- `500` — unexpected crashes, investigate immediately
- Slow responses (anything mentioning timeout)

---

## Terminal 2 — Nginx access log (real traffic)

```bash
docker compose exec nginx tail -f /var/log/nginx/access.log
```

**What to watch for:**
- High volume of `4xx` from a single IP (scraper / bot)
- `499` (client closed connection) — customer gave up; page too slow
- Repeated `404` on known routes — routing config issue

---

## Check for 429 spikes (rate limit)

```bash
docker compose logs api --since 10m | grep -c "429"
```

If > 20 in 10 minutes during normal service, the rate limit window is too tight. Increase `windowMs` in the rate limit middleware.

---

## Check slow queries

```bash
docker compose exec db psql -U orvexa -c "
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

> pg_stat_statements must be enabled (it is by default on this setup). Anything > 200ms mean is worth investigating.

---

## Check active connections

```bash
docker compose exec db psql -U orvexa -c "SELECT count(*) FROM pg_stat_activity;"
```

Should stay below 20 during normal service.

---

## iOS + Android spot checks (do these manually every 30 min)

- [ ] Open https://orvexa.tn on an iPhone (Safari)
- [ ] Open https://orvexa.tn on an Android (Chrome)
- [ ] Scan a real QR code with each device
- [ ] Place a test order end-to-end
- [ ] Confirm order appears on kitchen screen
- [ ] Confirm waiter sees table status update

---

## After service ends — end-of-day checks

```bash
# Confirm backup ran
ls -lh /opt/orvexa/backups/ | tail -5

# Check error count for the day
docker compose logs api --since 24h | grep -c "ERROR"

# Check disk usage
df -h /
```

Disk usage above 80% → clean old backups or expand VPS storage.

---

## If anything looks wrong

1. Note the exact error and timestamp
2. Check the rollback cheat sheet: `deploy/ops/rollback-cheatsheet.md`
3. If unsure, bring the service down cleanly: `docker compose down` — then investigate before bringing it back up
