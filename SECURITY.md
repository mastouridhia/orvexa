# Security Findings

Generated 2026-05-23. Based on full read of `apps/api/src/`.

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[-]` skipped (with reason)

---

## Critical

- [x] **S-01 — Logout is a no-op; refresh tokens not revoked**
  - File: `apps/api/src/routes/auth.ts:52`
  - `POST /auth/logout` returns `{ ok: true }` without touching the database.
    A refresh token issued to a shared tablet or stolen token stays valid for 7 days.
  - Fix: persist refresh token hashes in DB; delete on logout; verify on refresh.

- [x] **S-02 — Role changes don't take effect for up to 1 hour**
  - File: `apps/api/src/middleware/auth.ts:17-18`
  - `role` is read from the JWT payload, not the database. Demoting or disabling a
    staff member's _role_ (not the account) leaves the old role active until token expiry.
  - Fix (short-term): set `JWT_ACCESS_EXPIRES_IN=15m` in production `.env`.
  - Fix (long-term): add `tokenVersion` column on staff table; embed in access token;
    reject tokens whose version doesn't match the DB row on every request.

---

## High

- [-] **S-03 — Rate limiting bypassable via X-Forwarded-For if port 4000 is exposed**
  - File: `apps/api/src/app.ts:17`
  - `trust proxy: 1` makes Express read the client IP from `X-Forwarded-For`.
    If port 4000 is reachable from the internet (not just through Nginx), any attacker
    can spoof that header and bypass rate limiting with a fresh IP every request.
  - Skipped: port 4000 is not exposed externally — OVH VPS firewall + Nginx reverse
    proxy are the only ingress path. Verified in deploy runbook.

- [x] **S-04 — No per-session rate limit on order placement**
  - File: `apps/api/src/routes/orders.ts:43`
  - All customers in the restaurant share the same WiFi exit IP. The global 120-req/min
    limit is per-IP, so one table can exhaust the budget for all others.
  - Fix: add a `keyGenerator` that uses `req.customerSession?.id` so the limit is
    per-session, not per-IP.

- [x] **S-05 — Latent path traversal in LocalImageStorage.save()**
  - File: `apps/api/src/services/storage.ts:28-30`
  - `relativePath.replace(/^\/+/, '')` only strips leading slashes; `../` sequences
    survive and `join()` resolves them, allowing writes outside the uploads directory.
  - Not currently exploitable (all callers pass a hardcoded safe path), but the function
    itself is a trap for any future caller.
  - Fix: use `resolve()` and assert the result starts with `this.rootDir`.

---

## Medium

- [x] **S-06 — sql.raw with string interpolation in reports — no defense-in-depth**
  - File: `apps/api/src/services/reports.ts:38`
  - `sql.raw(\`'${granularity}'\`)` interpolates directly into SQL. Safe today because
    Zod enforces a closed enum at the route layer, but there is no second line of defense.
  - Fix: use a safe lookup map instead of template interpolation.

- [x] **S-07 — Customer sessions have no absolute lifetime cap**
  - File: `apps/api/src/services/customer-session.ts:76-93`
  - `/sessions/renew` extends expiry by the full TTL on every call. A client calling it
    every 30 min keeps the session alive indefinitely. The endpoint has no `authRateLimit`.
  - Fix: add `absolute_expires_at` column set at creation; never extend it on renewal.

- [x] **S-08 — Socket identity not re-validated after initial handshake**
  - File: `apps/api/src/realtime/server.ts:51-61`
  - Socket.io middleware runs once on connect. A disabled or demoted staff member stays
    in their rooms and keeps receiving events until they disconnect.
  - Fix: emit a revocation event via the bus when staff is disabled/role-changed;
    disconnect the relevant socket.

- [x] **S-09 — JWT algorithm not explicitly pinned**
  - File: `apps/api/src/utils/jwt.ts:29-31`
  - `jwt.sign()` and `jwt.verify()` use the library default (HS256). Should be explicit
    to guard against any future default change.
  - Fix: pass `{ algorithm: 'HS256' }` to `sign` and `{ algorithms: ['HS256'] }` to `verify`.

---

## Low / Informational

- [x] **S-10 — No minimum entropy check on JWT secrets**
  - File: `apps/api/src/config.ts:17-23`
  - `requiredSecret()` only checks `length > 0`. A 1-character secret would pass
    in production.
  - Fix: enforce `length >= 32` and throw if the value equals the known dev fallback.

- [x] **S-11 — notFoundHandler leaks request paths in responses**
  - File: `apps/api/src/middleware/errorHandler.ts:6-8`
  - `NotFoundError` has `expose: true` (status < 500), so `"Route not found: GET /…"`
    is returned verbatim in the JSON response. Harmless for paths the caller already
    knows, but worth confirming this is intentional.
  - Fix: change the message to a generic `"Not found"` and log the full path server-side only.

---

## Activity Log

<!-- append: YYYY-MM-DD — S-XX — short note -->

2026-05-23 — S-01 — refresh_tokens table + repo; login persists hash, refresh rotates it, logout revokes it; all 3 frontends fire-and-forget the revoke call before clearing state
2026-05-23 — S-02 — tokenVersion column on users; embedded as ver in access token; requireAuth checks ver+disabledAt against DB on every request; staff routes bump on role change/disable/enable; .env.example documents JWT_ACCESS_EXPIRES_IN=15m
2026-05-23 — S-03 — skipped; ops-level: port 4000 firewalled, only Nginx reaches it
2026-05-23 — S-04 — orderRateLimit (30 req/min keyed on customerSession.id) applied to POST /orders and POST /orders/:id/items
2026-05-23 — S-05 — resolve() + sep-aware prefix assert in LocalImageStorage.save(); path traversal sequences now throw before any I/O
2026-05-23 — S-06 — DATE_TRUNC_LITERAL lookup map in reports.ts replaces sql.raw template interpolation for granularity
2026-05-23 — S-07 — absolute_expires_at column (migration 0016); set to 4× sessionTtl at creation; extendExpiry uses LEAST() to clamp to cap; renewIfNeeded checks absolute expiry before extending
2026-05-23 — S-08 — bus.staffRevoked() iterates io.sockets and disconnects sockets with matching userId; called from disable and role-change staff routes
2026-05-23 — S-09 — algorithm: 'HS256' on sign; algorithms: ['HS256'] on verify
2026-05-23 — S-10 — requiredSecret() enforces length ≥ 32 and rejects dev fallback value in production
2026-05-23 — S-11 — notFoundHandler logs method+path at debug level, returns generic "Not found" body
