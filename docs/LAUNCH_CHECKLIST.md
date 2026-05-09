# Launch Checklist

Run through this before pointing real customers at Orvexa.

## Infrastructure

- [ ] Domain pointed at the host (DNS A/AAAA records for `apex`, `www`, `api`, `customer`, `kitchen`, `waiter`, `admin`).
- [ ] Reverse proxy reachable on :80/:443. Firewall blocks every other port.
- [ ] Postgres + Redis run on the internal docker network only — never publish their ports.
- [ ] Database backups scheduled. `deploy/scripts/backup-db.sh` cron'd nightly. Verify a test restore works **before** you need it.
- [ ] Persistent volumes exist for `pgdata`, `redisdata`, `api-uploads`, `letsencrypt`. `docker volume ls` should list all four.

## TLS

- [ ] `init-certs.sh` ran successfully against Let's Encrypt **production** (not staging). Verify with `curl -I https://api.<your-domain>` — expect 200 + valid cert.
- [ ] `certbot` sidecar is running and renewal works. Check the next renewal date: `docker compose exec proxy certbot certificates`.
- [ ] HSTS header is present on every HTTPS response. `curl -I https://customer.<your-domain> | grep -i strict-transport`.

## Secrets

- [ ] `JWT_SECRET` set to `openssl rand -base64 48`.
- [ ] `SESSION_JWT_SECRET` set to a different `openssl rand -base64 48`.
- [ ] `DATABASE_URL` uses a strong DB password (not `orvexa:orvexa`).
- [ ] `.env.production` is **not** in git. `.gitignore` honors `.env.*` with the `!.env.production.example` exception.
- [ ] Default seeded admin (`admin@demo.tn` / `orvexa`) has been replaced. Either:
  - Created a new admin via the Staff page and disabled the seeded one, or
  - Re-seeded after dropping the demo restaurant entirely.

## Data

- [ ] `docker compose exec api npm run db:migrate` ran successfully (the API CMD does this on every start, but worth a sanity check).
- [ ] Real restaurant data entered: name, timezone, tax %, service %, supported languages.
- [ ] At least one staff member per role you need (admin, manager, kitchen, waiter).
- [ ] Tables created with their physical labels.
- [ ] QR codes printed (admin → Tables → Print sheet).
- [ ] Menu populated: categories + dishes + at least the modifier groups customers expect.

## Frontends

- [ ] All four frontends render at their hostnames. Sign in with each role + verify the role lands on the right home page.
- [ ] Customer scan flow works on a real phone (test with a fresh QR — confirm the daily-rotating token issues correctly).
- [ ] Place a real test order, watch it appear on the kitchen board, advance it through to served + paid, confirm the table clears.
- [ ] Confirm Arabic RTL renders correctly on the customer app (tab order, alignment, currency formatting).

## Realtime

- [ ] Socket.io upgrades to WebSocket on `api.<your-domain>` (check the browser DevTools Network tab — request to `/socket.io/?…&transport=websocket` returns 101).
- [ ] Order:status events propagate to all open kitchen + waiter clients within 1 second.

## Security

- [ ] `npm audit --omit=dev` reports no HIGH or CRITICAL findings.
- [ ] `/auth/login` returns 429 RATE_LIMITED after 11 wrong attempts in a minute (confirms `authRateLimit` is active).
- [ ] `helmet` headers present on responses (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
- [ ] Cross-restaurant access blocked. As a non-admin staff user, try to GET another restaurant's order via API — expect 403.

## Monitoring

- [ ] `GET /health` returns 200.
- [ ] `GET /health/db` returns 200 with a current timestamp.
- [ ] `GET /version` reports the deployed git SHA / build date and `demoMode: false`.
- [ ] Log destination configured (stdout → wherever you ship them: docker logging driver, Loki, CloudWatch, etc.).
- [ ] Uptime monitor pointed at `/health` with on-call alerting.
- [ ] (Optional) APM / error tracking — Sentry, Bugsnag, etc. — wired for both API and frontends.

## Operational dry-run

Walk through these end-to-end with the actual restaurant team **before** day one:

- [ ] Customer flow: scan → menu → order with modifiers → cancel order → re-order → request bill → receipt.
- [ ] Kitchen flow: order arrives → start → mark ready → confirm waiter assignment shows up.
- [ ] Waiter flow: see assigned ready order → mark served → take cash payment → confirm table clears.
- [ ] Edge: two tables merged for a party → one customer requests bill → confirm both tables' orders show on the consolidated bill.
- [ ] Edge: kitchen flips a popular dish to *Unavailable* → confirm it disappears from open customer menus within 5 seconds (via `menu:updated` socket).
- [ ] Edge: server restart while an order is mid-flight → confirm the order is still there and live updates resume after the client reconnects.

## Rollback plan

- [ ] You know how to roll back: `docker compose down && git checkout <previous-tag> && docker compose up -d --build`.
- [ ] You know how to restore the latest backup: `gunzip -c deploy/data/backups/orvexa-<stamp>.sql.gz | docker compose exec -T db psql -U orvexa orvexa`.
- [ ] Both procedures rehearsed at least once on a staging copy.

## Day-one watch

For the first 24h of real traffic:

- [ ] Tail `docker compose logs -f api` for unexpected stack traces.
- [ ] Watch the `429` count (rate-limit hits) — a spike means a real attacker or a misbehaving client.
- [ ] Spot-check `pg_stat_activity` for long-running queries (anything > 1s deserves an `EXPLAIN ANALYZE`).
- [ ] Check the storefront on multiple devices/browsers (iOS Safari + Android Chrome are the primary customer surfaces).

When all of the above is green, you're launched. 🚀
