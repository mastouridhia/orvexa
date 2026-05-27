# Scripts

## backup-db.sh

Dumps the Orvexa PostgreSQL database to `/var/backups/orvexa/` and rotates old files.

### Setup on VPS

```bash
# Make executable
chmod +x /opt/orvexa/scripts/backup-db.sh

# Add to crontab (runs at 03:00 every day)
crontab -e
# add this line:
0 3 * * * DATABASE_URL="postgres://orvexa:orvexa@localhost:5432/orvexa" /opt/orvexa/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1
```

### Restore

```bash
pg_restore -d "$DATABASE_URL" /var/backups/orvexa/orvexa_<timestamp>.dump
```

### Configuration

| Variable       | Default               | Description                |
| -------------- | --------------------- | -------------------------- |
| `DATABASE_URL` | required              | Postgres connection string |
| `BACKUP_DIR`   | `/var/backups/orvexa` | Where dumps are stored     |
| `KEEP_DAYS`    | `7`                   | Days of backups to retain  |
