# Demo Mode

A way to run Orvexa as a sandbox so prospects can evaluate the product without affecting real data.

## What it gives you

- A fully populated demo restaurant (8 tables, ~12 dishes across 4 categories, 4 staff users covering every role).
- A `demoMode: true` field in `GET /version` that frontends can read to surface a banner.
- A reset workflow that wipes transactional state (orders, payments, sessions, waiter calls) but keeps the menu fixture intact.

## Setup

### 1. Set the flag

In `.env`:

```
DEMO_MODE=true
```

This only affects the `/version` response — it does not change any business logic. The flag is intentionally non-load-bearing so production and demo deploys share the exact same code path.

### 2. Seed the demo data

```bash
npm run db:seed
```

This calls `seedDemoData()` (split out into `apps/api/src/db/seed-data.ts` for reuse from tests). It creates:

- One restaurant — `slug=demo`, name *"Demo Restaurant"*, 19% TVA + 10% service, Africa/Tunis timezone.
- 4 staff users with password `orvexa`:
  - `admin@demo.tn` (admin)
  - `manager@demo.tn` (manager)
  - `kitchen@demo.tn` (kitchen)
  - `waiter@demo.tn` (waiter)
- 8 tables (`Table 1`–`Table 8`, 2–6 seats).
- A trilingual menu — Entrées / Plats / Desserts / Boissons — with realistic Tunisian cuisine + variant groups (Cuisson, Sauce, Taille, etc.).

### 3. (Optional) Lock the demo

To prevent evaluators from making schema-level changes (rename categories, delete dishes), you can run the demo on a non-admin account — `manager@demo.tn` cannot create or delete categories per the role-gate in `requireRole`.

## Daily reset

Cron the reset on a host that has `docker compose` access:

```bash
# Daily at 04:00 UTC
0 4 * * * cd /opt/orvexa && docker compose exec -T api npm run db:reset >> /var/log/orvexa-demo-reset.log 2>&1
```

`db:reset` drops the `public` and `drizzle` schemas, runs all migrations, and re-seeds — the demo is back to the same starting state every morning.

## Surfacing the banner in frontends

Frontends can read `/version` on boot and conditionally render a banner. There's no banner component shipped — this is intentionally left to the operator since the messaging is deployment-specific (e.g. "Demo data — resets daily at 04:00 UTC. <a href='https://your-marketing.tld'>Talk to sales →</a>").

A minimal example for the customer app:

```tsx
// apps/customer/src/components/DemoBanner.tsx
import { useEffect, useState } from 'react';

export function DemoBanner() {
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/version`)
      .then((r) => r.json())
      .then((env) => setDemoMode(Boolean(env?.data?.demoMode)));
  }, []);
  if (!demoMode) return null;
  return (
    <div role="status" style={{ background: '#fff8e3', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.85rem' }}>
      Demo data — resets daily at 04:00 UTC.
    </div>
  );
}
```

Mount it in `App.tsx` above `<Outlet />`.

## What demo mode is **not**

- It is not a feature flag for hiding/showing functionality. Every screen and every endpoint behaves identically to production.
- It is not a multi-tenant isolation guarantee. The "demo" restaurant is just a normal row in the `restaurants` table; running it on the same Postgres as paying customers means a daily `db:reset` would wipe their data too. **Always run demo on a dedicated database/instance.**
