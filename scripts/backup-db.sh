#!/usr/bin/env bash
# Daily PostgreSQL backup for Orvexa production.
# Run via cron on the VPS:
#   0 3 * * * /opt/orvexa/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1
#
# Keeps 7 days of backups locally, then rotates.
# Restore: pg_restore -d "$DATABASE_URL" <file>.dump

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/orvexa}"
KEEP_DAYS="${KEEP_DAYS:-7}"
DB_URL="${DATABASE_URL:?DATABASE_URL must be set}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE="$BACKUP_DIR/orvexa_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup → $FILE"
pg_dump --format=custom --no-password "$DB_URL" --file="$FILE"
echo "[$(date -Iseconds)] Backup complete ($(du -sh "$FILE" | cut -f1))"

# Rotate — delete dumps older than KEEP_DAYS
find "$BACKUP_DIR" -name "orvexa_*.dump" -mtime +"$KEEP_DAYS" -delete
echo "[$(date -Iseconds)] Rotation done — kept last $KEEP_DAYS days"
