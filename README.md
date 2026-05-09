# Orvexa

QR-code-based digital ordering system for restaurants. Customers scan a table QR, browse the menu in their language, place orders, and call for waiter or bill — all without installing an app. Staff use dedicated dashboards for the kitchen, waiter floor, and admin.

## Architecture

Monorepo with four frontends and one API, sharing types via a workspace package.

```
apps/
  api/        Express + Socket.io + Postgres      (port 4000)
  customer/   React 19 + Vite — QR ordering PWA   (port 5173)
  kitchen/    React 19 + Vite — kitchen display   (port 5174)
  waiter/     React 19 + Vite — waiter ops        (port 5175)
  admin/      React 19 + Vite — admin dashboard   (port 5176)
packages/
  shared/     Types, zod schemas, socket contracts, i18n keys
```

Realtime updates flow through Socket.io rooms (`restaurant:{id}`, `table:{id}`, `kitchen:{id}`, `waiter:{id}`). Customer sessions are created from a QR token — no login required on the customer side. Staff authenticate with JWT.

## Requirements

- Node.js 22+ (see [.nvmrc](.nvmrc))
- Docker (for Postgres + Redis)
- npm 10+

## Setup

```bash
# 1. Install all workspace deps
npm install

# 2. Copy env template
cp .env.example .env

# 3. Start Postgres + Adminer
docker compose up -d
```

Adminer (DB web UI) is available at http://localhost:8081 once the stack is up — server `db`, user/pass/database all `orvexa`.

## Run

```bash
# Start everything concurrently (api + shared watch + 4 frontends)
npm run dev
```

Individual services:

```bash
npm run dev:api
npm run dev:customer
npm run dev:kitchen
npm run dev:waiter
npm run dev:admin
npm run dev:shared
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start API + shared watch + all 4 frontends |
| `npm run dev:<service>` | Start one service (api, customer, kitchen, waiter, admin, shared) |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run db:up` | Start Docker stack (Postgres + Adminer + Redis) |
| `npm run db:down` | Stop Docker stack (keeps data) |
| `npm run db:logs` | Tail Postgres logs |
| `npm run redis:logs` | Tail Redis logs |

## Environment Variables

See [.env.example](.env.example). Minimum for local dev:

- `PORT` — API port (default `4000`)
- `CLIENT_ORIGIN` — allowed CORS origin (default `http://localhost:5173`)
- `DATABASE_URL` — Postgres connection string

## Languages

Customer UI supports `ar` (RTL), `fr`, `en`. All user-facing strings are keyed via `packages/shared` i18n keys.

## Deployment

Production stack runs entirely under Docker Compose. One front-facing nginx
proxy terminates TLS and routes by hostname; everything else lives on an
internal network.

```
host (publishes :80, :443)
  └─ proxy (nginx)
       ├─ tableflow.tn         → customer
       ├─ kitchen.tableflow.tn → kitchen
       ├─ waiter.tableflow.tn  → waiter
       ├─ admin.tableflow.tn   → admin
       └─ api.tableflow.tn     → api  (with Socket.io upgrade)
```

### Initial deploy

```bash
# 1. DNS — point all 5 hostnames at the host (A records).
# 2. Configure secrets and domain.
cp .env.production.example .env.production
# generate secrets, e.g.
#   openssl rand -hex 24      # POSTGRES_PASSWORD
#   openssl rand -base64 48   # JWT_SECRET, SESSION_JWT_SECRET
$EDITOR .env.production

# 3. Build images and bring everything up. The proxy starts in HTTP-only
#    bootstrap mode; nothing is published over HTTPS yet.
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. Issue Let's Encrypt certs and activate HTTPS. Use STAGING=1 first to
#    sanity-check before hitting LE rate limits.
DOMAINS="tableflow.tn www.tableflow.tn kitchen.tableflow.tn waiter.tableflow.tn admin.tableflow.tn api.tableflow.tn" \
LE_EMAIL="you@example.com" \
STAGING=1 \
./deploy/scripts/init-certs.sh

# 5. If staging worked, redo without STAGING for real certs.
DOMAINS="..." LE_EMAIL="..." ./deploy/scripts/init-certs.sh
```

The first restaurant + 4 staff users land via the `db:seed` migration on
first start (idempotent — re-runs are no-ops).

To deploy under a different domain, search/replace `tableflow.tn` in
[deploy/nginx/conf.d-https/02-orvexa.conf](deploy/nginx/conf.d-https/02-orvexa.conf)
and update the variables in `.env.production` accordingly.

### Renewal

The `certbot` sidecar runs `certbot renew` every 12h. Successful renewal
touches `/var/www/certbot/.reload-nginx`; the proxy's background watcher
picks up the sentinel within 60s and triggers `nginx -s reload` — no
restart, sockets stay alive.

### Backups

```bash
# Manual snapshot (pg_dump → date-stamped gzip in deploy/data/backups/)
./deploy/scripts/backup-db.sh

# Schedule via host cron, e.g. nightly at 03:00:
echo '0 3 * * * cd /opt/orvexa && ./deploy/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1' | crontab -
```

`RETAIN_DAYS=14` by default; the script rotates older dumps automatically.

### Health & monitoring

Three endpoints are wired for external monitors:

- `https://api.tableflow.tn/health` — API liveness + uptime
- `https://api.tableflow.tn/health/db` — DB ping (returns `now()`)
- `https://api.tableflow.tn/version` — running build info
- `http://proxy/healthz` (internal) — proxy liveness

Point an uptime service (UptimeRobot, Better Uptime, etc.) at the public
ones; alert on non-200.

### Logs

Every container logs to stdout in structured JSON (pino on the API,
combined log on the proxy). Tail with:

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f proxy
```

For long-term retention, ship `docker logs` to a remote aggregator (Loki,
CloudWatch, Datadog) — provider not chosen yet.

## Project Status

Early-stage. Full roadmap and progress tracked in [TASKS.md](TASKS.md).
