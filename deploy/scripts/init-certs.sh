#!/usr/bin/env bash
# One-time cert provisioning. Run after `docker compose -f docker-compose.prod.yml up -d`.
#
#   DOMAINS="orvexa.tn www.orvexa.tn kitchen.orvexa.tn waiter.orvexa.tn admin.orvexa.tn api.orvexa.tn" \
#   LE_EMAIL="ops@example.com" \
#   ./deploy/scripts/init-certs.sh
#
# Strategy: HTTP-01 challenge via webroot. The proxy is already running in
# bootstrap mode and serves /.well-known/acme-challenge/ from a shared volume.
# After certs land, this script enables the HTTPS config and reloads nginx.

set -euo pipefail

: "${DOMAINS:?DOMAINS env var is required (space-separated list)}"
: "${LE_EMAIL:?LE_EMAIL env var is required for Lets Encrypt registration}"
STAGING="${STAGING:-0}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

staging_flag=""
if [ "$STAGING" = "1" ]; then
  staging_flag="--staging"
  echo "[init-certs] Using Let's Encrypt STAGING environment (rate-limit-safe)."
fi

# Group domains so that {orvexa.tn, www.orvexa.tn} share a single cert.
# Everything else gets its own cert keyed on the bare hostname.
issue_cert() {
  local primary="$1"
  shift
  local san_args=("-d" "$primary")
  for d in "$@"; do
    san_args+=("-d" "$d")
  done

  echo "[init-certs] Requesting cert for: $primary ${*:+(SANs: $*)}"
  compose run --rm --entrypoint certbot certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email "$LE_EMAIL" --agree-tos --no-eff-email \
    --non-interactive \
    --cert-name "$primary" \
    $staging_flag \
    "${san_args[@]}"
}

# Parse DOMAINS into apex and subdomain groups.
apex=""
www=""
others=()
for d in $DOMAINS; do
  case "$d" in
    www.*) www="$d" ;;
    *.*.*) others+=("$d") ;;        # subdomains (kitchen.orvexa.tn etc)
    *.*)   apex="$d" ;;             # 2-label domains (orvexa.tn)
    *)     echo "[init-certs] skipping malformed domain: $d" >&2 ;;
  esac
done

if [ -n "$apex" ]; then
  if [ -n "$www" ]; then
    issue_cert "$apex" "$www"
  else
    issue_cert "$apex"
  fi
fi

for d in "${others[@]}"; do
  issue_cert "$d"
done

# Activate the full HTTPS config: copy from conf.d-https to conf.d on the
# host (both dirs are mounted read-only into the proxy), then reload nginx
# inside the container.
echo "[init-certs] Activating HTTPS config and reloading proxy..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cp "$REPO_ROOT/deploy/nginx/conf.d-https/02-orvexa.conf" \
   "$REPO_ROOT/deploy/nginx/conf.d/02-orvexa.conf"
compose exec -T proxy nginx -t
compose exec -T proxy nginx -s reload

echo "[init-certs] Done. HTTPS is live."
