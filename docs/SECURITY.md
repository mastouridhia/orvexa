# Security Audit — OWASP Top 10 (2026-04-25)

This is a pre-launch security review against the OWASP Top 10 (2021). Each item lists what's in place and any known gaps.

## A01 — Broken Access Control

**Mitigations**:
- All state-mutating routes (`POST`/`PATCH`/`DELETE`) are wrapped in `requireAuth` + `requireRole(...)` or `requireCustomerSession`. Verified by walking every file under `apps/api/src/routes/` (auth.ts, sessions.ts, restaurant.ts, tables.ts, menu.ts, categories.ts, dishes.ts, variant-groups.ts, orders.ts, payments.ts, staff.ts, waiter-calls.ts, reports.ts).
- Restaurant scope check on every entity-touching service — e.g. `TableService.update` / `StaffService.disable` re-fetch the row, compare `restaurantId`, and throw `ForbiddenError` on cross-restaurant reads/writes.
- Customer sessions are bound to a specific `tableId` — `POST /tables/:id/call-waiter` enforces `req.customerSession.tableId === req.params.id`.
- Self-disable blocked: `POST /staff/:id/disable` returns 409 if `:id === req.user.id`.

**Status**: ✅ Covered.

## A02 — Cryptographic Failures

**Mitigations**:
- Passwords are hashed with `argon2id` (`apps/api/src/utils/password.ts`). No plaintext storage.
- JWTs are signed with HS256 using independent secrets for staff (`JWT_SECRET`) and customer sessions (`SESSION_JWT_SECRET`) — a leak of one cannot forge the other. Type field on the JWT is checked at verification (`apps/api/src/utils/jwt.ts`).
- Both secrets fail-fast in production: `requiredSecret()` in `config.ts` throws if `NODE_ENV=production` and the env var is unset.
- HTTPS termination is at the nginx proxy with HSTS + Mozilla intermediate ciphers (see `deploy/nginx/conf.d-https/02-orvexa.conf`).

**Gaps** (deferred):
- Argon2 memory/time parameters use library defaults; revisit if migrating to a hosting tier where defaults are too conservative.

**Status**: ✅ Covered for launch.

## A03 — Injection

**Mitigations**:
- All DB access is via drizzle-orm with parameterized queries — no raw `pool.query` interpolation in service code (verified by grep over `apps/api/src/services/`). One `pool.query` call exists in `health.ts` but uses a literal SQL string with no user input.
- All request bodies are validated by Zod schemas via the `validate({ body, params, query })` middleware before any handler runs. The recon over `routes/*.ts` confirmed every body-reading handler is preceded by `validate()`.
- File uploads (`/dishes/:id/image`) go through `multer` with strict mime-type and size limits configured in `services/image-upload.ts`.

**Status**: ✅ Covered.

## A04 — Insecure Design

**Mitigations**:
- Customer auth model is QR-token → short-lived session JWT — no password to leak, no account to compromise. The QR token itself rotates daily (`table_day_tokens.day` index ensures one token per table per UTC date).
- Order state machine is enforced both server-side (`STATUS_TRANSITIONS` in `OrderService`) and surfaced as a 409 to clients on illegal transitions; clients cannot skip steps.
- Cancel rules: customers can only cancel `received`; staff can cancel `received` or `preparing`.

**Status**: ✅ Covered.

## A05 — Security Misconfiguration

**Mitigations**:
- `helmet` middleware applied with `crossOriginResourcePolicy: cross-origin` (needed because uploaded images are served on a different origin than the consumers).
- Default helmet headers cover: HSTS (when over HTTPS), X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy no-referrer.
- `app.disable('x-powered-by')` removes Express fingerprinting.
- CORS is whitelist-based via `CLIENT_ORIGINS` env var; no `*` wildcards in any environment.
- Body-parser limit defaults to `100kb` — well below typical attack payloads.
- Production migrations + drizzle schema in lockstep; the API container CMD runs `node dist/db/migrate.js` before `dist/index.js` so schema drift is impossible.
- No interactive container shells; runtime image runs as non-root `orvexa:1001`.

**Gaps** (deferred):
- Content-Security-Policy header is helmet's default (which is fairly strict, no inline scripts allowed). Frontends ship pre-bundled, so this works out of the box. Revisit if any frontend ever needs to evaluate dynamic `script` tags.

**Status**: ✅ Covered.

## A06 — Vulnerable + Outdated Components

**Mitigations**:
- All workspace packages run on Node 22 (pinned via `.nvmrc` and engines). React 19, i18next 26, drizzle-orm latest. `npm audit` periodically.
- Dockerfile pins `node:22-bookworm-slim` — explicit base for reproducibility.

**Process recommendation**:
- Run `npm audit --omit=dev` before each tagged release. Triage any HIGH/CRITICAL findings.

## A07 — Identification + Authentication Failures

**Mitigations**:
- Login + refresh + customer-session-issuance are now rate-limited at **10 requests/minute per IP** with `skipSuccessfulRequests: true` (see `apps/api/src/middleware/rateLimit.ts`). Failed attempts count against the bucket; successful ones don't.
- Rate-limit response is the standard envelope with `code: RATE_LIMITED`, status 429.
- Refresh tokens are stateless JWTs — short access (1h) + longer refresh (7d). Logout is a no-op acknowledgement (the client discards tokens) — there is no server-side blocklist, which means a stolen refresh token is valid until expiry. **Trade-off**: simpler infrastructure (no Redis blocklist on the auth path) at the cost of revocation latency.

**Gaps**:
- No MFA. Acceptable for a single-restaurant operator with a small staff list (current target). Revisit if multi-tenant SaaS becomes the deployment model.
- No "force logout all sessions" admin action. Add when needed.

**Status**: ✅ Covered for launch.

## A08 — Software + Data Integrity Failures

**Mitigations**:
- All NPM packages installed via `npm ci` (lockfile-honoring) in CI/Docker builds.
- Drizzle migrations are versioned + journaled (`drizzle/meta/_journal.json`) — drift between code-generated schema and applied migrations is caught by `db:check`.
- No deserialization of untrusted data anywhere (all I/O is JSON parsed by Express + validated by Zod).

**Status**: ✅ Covered.

## A09 — Security Logging + Monitoring Failures

**Mitigations**:
- Every request is logged with a request ID (pino structured JSON via `requestId` + `requestLogger` middleware).
- Errors are logged with stack traces server-side; the client envelope only carries `code` + `message` (no internals leaked).
- `audit_log` table exists in schema (Phase 2) but is not yet written to — flagged in TASKS.md `13.14` for a future audit-instrumentation pass.

**Gaps**:
- No SIEM / log aggregation yet. `docker compose logs` is the operational surface; see `TASKS.md 16.8` for the deferred decision.
- No alerting on rate-limit spikes or 5xx surges.

**Status**: ⚠️ Acceptable for launch with operator-attended logs; revisit before scaling.

## A10 — Server-Side Request Forgery (SSRF)

**Mitigations**:
- API never fetches arbitrary URLs based on user input. The only external HTTP is the optional Stripe/CIB stub (currently a no-op stub that doesn't make outbound calls).

**Status**: ✅ Not applicable to current functionality.

## Summary

Pre-launch posture: **green** for A01–A06, A08, A10; **green with deferred work** for A07 (refresh-token revocation) and A09 (audit-log writes, log aggregation). No HIGH or CRITICAL exposures identified.

Before any public deployment:
1. Set `JWT_SECRET` and `SESSION_JWT_SECRET` to cryptographically random values (`openssl rand -base64 48`).
2. Set `CLIENT_ORIGINS` to the production hostnames only.
3. Set `DATABASE_URL` with a strong DB password.
4. Run `npm audit --omit=dev` and triage any HIGH/CRITICAL.
5. Run a manual probe of `/auth/login` with a wrong password 11 times — expect `429 RATE_LIMITED` on the 11th.
