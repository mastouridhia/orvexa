#!/usr/bin/env bash
# Snapshot the running Postgres container and uploads volume, then rotate old backups.
# Drop into host cron with:
#   0 3 * * * cd /opt/orvexa && ./deploy/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-orvexa-db-1}"
API_CONTAINER="${API_CONTAINER:-orvexa-api-1}"
DB_NAME="${POSTGRES_DB:-orvexa}"
DB_USER="${POSTGRES_USER:-orvexa}"
BACKUP_DIR="${BACKUP_DIR:-./deploy/data/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"

# --- DB dump ---
db_out="$BACKUP_DIR/orvexa-db-$stamp.sql.gz"
echo "[backup] Dumping $DB_NAME -> $db_out"

docker exec -i "$DB_CONTAINER" \
  pg_dump --username "$DB_USER" --dbname "$DB_NAME" --clean --if-exists \
  | gzip -9 > "$db_out"

size=$(stat --printf="%s" "$db_out" 2>/dev/null || stat -f "%z" "$db_out")
if [ "$size" -lt 1024 ]; then
  echo "[backup] FAIL: DB dump is only ${size}B; refusing to keep it." >&2
  rm -f "$db_out"
  exit 1
fi
echo "[backup] DB OK: ${size}B written"

# --- Uploads snapshot ---
uploads_out="$BACKUP_DIR/orvexa-uploads-$stamp.tar.gz"
echo "[backup] Snapshotting uploads -> $uploads_out"

docker exec -i "$API_CONTAINER" \
  tar -czf - -C /app uploads 2>/dev/null > "$uploads_out" \
  || { echo "[backup] WARN: uploads snapshot failed (volume may be empty)"; rm -f "$uploads_out"; }

# --- Offsite upload (optional) ---
# Set RCLONE_REMOTE in the cron environment to enable, e.g.:
#   RCLONE_REMOTE=b2:orvexa-backups     (Backblaze B2)
#   RCLONE_REMOTE=gdrive:orvexa-backups (Google Drive -- needs rclone config)
# Failure here is non-fatal: local backup is already written.
if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] Uploading DB dump to offsite: $RCLONE_REMOTE"
  if rclone copy "$db_out" "$RCLONE_REMOTE/" --log-level ERROR 2>&1; then
    echo "[backup] Offsite DB upload OK"
    if [ -n "${uploads_out:-}" ] && [ -f "$uploads_out" ]; then
      rclone copy "$uploads_out" "$RCLONE_REMOTE/" --log-level ERROR 2>&1 \
        || echo "[backup] WARN: uploads offsite upload failed (non-fatal)"
    fi
  else
    echo "[backup] WARN: offsite upload failed -- local backup still intact" >&2
  fi
else
  echo "[backup] RCLONE_REMOTE not set -- skipping offsite upload"
fi

# --- Rotate old backups ---
removed=$(find "$BACKUP_DIR" -name "orvexa-*.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
echo "[backup] Rotated $removed old dumps (retention: ${RETAIN_DAYS}d)"
