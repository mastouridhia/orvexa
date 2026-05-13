#!/usr/bin/env bash
# Snapshot the running Postgres container and rotate old backups.
# Drop into host cron with:
#   0 3 * * * cd /opt/orvexa && ./deploy/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICE="${SERVICE:-db}"
DB_NAME="${POSTGRES_DB:-orvexa}"
DB_USER="${POSTGRES_USER:-orvexa}"
BACKUP_DIR="${BACKUP_DIR:-./deploy/data/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/orvexa-$stamp.sql.gz"

echo "[backup] Dumping $DB_NAME -> $out"

# pg_dump with --clean so the dump is restorable into an existing db; --if-exists
# avoids errors on a fresh target. Pipe straight to gzip — no temp file on disk.
docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" \
  pg_dump --username "$DB_USER" --dbname "$DB_NAME" --clean --if-exists \
  | gzip -9 > "$out"

# Refuse a suspiciously tiny dump (anything under 1KB is almost certainly an error).
size=$(stat --printf="%s" "$out" 2>/dev/null || stat -f "%z" "$out")
if [ "$size" -lt 1024 ]; then
  echo "[backup] FAIL: dump is only ${size}B; refusing to keep it." >&2
  rm -f "$out"
  exit 1
fi

echo "[backup] OK: ${size}B written"

# Rotate: delete dumps older than RETAIN_DAYS days.
removed=$(find "$BACKUP_DIR" -name "orvexa-*.sql.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
echo "[backup] Rotated $removed old dumps (retention: ${RETAIN_DAYS}d)"
