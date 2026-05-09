# Orvexa — Claude Project Guide

QR-based restaurant ordering system. Personal project. Monorepo.

## Stack
- **Backend:** Node.js + Express + Socket.io + PostgreSQL (TypeScript)
- **Frontends:** 4 × React 19 + Vite + TypeScript apps
- **Shared:** `packages/shared` for cross-workspace types, zod schemas, socket contracts
- **Infra:** Docker Compose for Postgres (port 5432, db/user/pass all `orvexa`)

## Layout
- `apps/api` — Express API + Socket.io server (port 4000)
- `apps/customer` — customer QR-ordering PWA
- `apps/kitchen` — kitchen display (KDS)
- `apps/waiter` — waiter ops app
- `apps/admin` — restaurant admin dashboard
- `packages/shared` — shared types, zod schemas, socket event contracts, i18n keys

## Commands (run from repo root)
- `npm install` — install all workspace deps
- `npm run dev` — start api + shared (watch) + all 4 frontends concurrently
- `npm run build` — build all workspaces
- `npm run typecheck` — type-check all workspaces
- `npm run lint` — lint all workspaces
- `docker compose up -d` — start Postgres

## Workflow Conventions
- **`TASKS.md` is the source of truth for work.** Before starting anything, check it. When starting a task, flip `[ ]` → `[~]`. When finishing, flip to `[x]` and add a dated Activity Log entry at the bottom (`YYYY-MM-DD — <task number> — <short note>`). If you discover missing work, add a numbered task to the right phase rather than doing it silently.
- **Phase numbering is stable.** Never renumber existing tasks — add new ones with the next free number.
- **Skip markers:** use `[-]` with a reason when a task is intentionally not done.
- Personal project — skip heavy ceremony (CI, husky, conventional commits). Git is already linked to enterprise account.

## Code Conventions
- TypeScript everywhere, strict mode
- Use `@orvexa/shared` for cross-workspace types (path alias to be set up in 0.9)
- Zod schemas live in `packages/shared` and get reused for API validation
- i18n keys are centralized in `packages/shared`
- Languages: `ar`, `fr`, `en` (Arabic is RTL — customer app must support)
- Prefer editing existing files over creating new ones

## Domain Quick Reference
- **Roles:** `admin`, `manager`, `kitchen`, `waiter`
- **Order statuses:** `received` → `preparing` → `ready` → `served` | `cancelled`
- **Table statuses:** `free`, `seated`, `ordering`, `waiting`, `call_waiter`, `needs_bill`
- **Customer auth:** QR token → session JWT (no login)
- **Staff auth:** JWT with role claims

## Realtime (Socket.io)
- Rooms: `restaurant:{id}`, `table:{id}`, `kitchen:{id}`, `waiter:{id}`
- Event names + payload types live in `packages/shared`
- Key events: `order:created`, `order:status`, `waiter:called`, `bill:requested`, `menu:updated`, `table:status`

## Gotchas
- `.env.*` in gitignore would swallow `.env.example` — we added `!.env.example` exception
- All 4 frontend apps started from identical Vite scaffolding — don't assume differences exist yet
- No git history at the time CLAUDE.md was written (repo is linked to enterprise account but local state looked fresh)
