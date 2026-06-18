#!/usr/bin/env bash
# Full production deploy from repo root on the VPS.
#
# Usage:
#   cd /opt/orvexa && ./deploy/scripts/deploy.sh
#
# What it does:
#   1. git pull
#   2. Rebuild API (uses cache — no APP_NAME arg ambiguity)
#   3. Rebuild the 4 SPA frontends with --no-cache (REQUIRED: they share one Dockerfile
#      and Docker's cache can cross-contaminate them, serving the wrong app per subdomain)
#   4. Rebuild the landing site (own Dockerfile — cache is safe)
#   5. Recreate all containers

set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "[deploy] Pulling latest code..."
git pull

echo "[deploy] Building API..."
$COMPOSE build api

echo "[deploy] Building SPA frontends (--no-cache to prevent cross-contamination)..."
$COMPOSE build --no-cache customer kitchen waiter admin

echo "[deploy] Building landing site..."
$COMPOSE build landing

echo "[deploy] Restarting containers..."
$COMPOSE up -d --force-recreate

echo "[deploy] Done. Running containers:"
$COMPOSE ps
