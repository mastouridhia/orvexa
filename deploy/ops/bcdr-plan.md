# Orvexa — Business Continuity & Disaster Recovery Plan

**Client:** Capitol restaurant, Tunis  
**Written:** 2026-06-10  

---

## Recovery Objectives (33.1 + 33.2)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **RTO** (Recovery Time Objective) | **2 hours** | Restaurant staff can manage ~2h on paper menus without significant revenue loss or guest complaints. Beyond 2h the client relationship is at risk and the situation is a crisis requiring immediate action. |
| **RPO** (Recovery Point Objective) | **24 hours** | Backup cron runs at 03:00 daily. Worst-case data loss = the previous service's orders. For Capitol this is acceptable because payment is collected in cash at the time of service — losing order history does not cause financial harm, only gaps in reporting. If order history becomes business-critical (analytics, dispute handling), move to hourly pg_dump or Postgres streaming replication. |

---

## Backup Strategy (33.3)

### Local backup (primary)

- **Script:** `deploy/scripts/backup-db.sh`
- **Schedule:** `0 3 * * *` (03:00 server time = 03:00 Africa/Tunis)
- **Location on VPS:** `/opt/orvexa/deploy/data/backups/`
- **Retention:** 14 days of daily `.sql.gz` dumps + uploads `.tar.gz`
- **Integrity check:** script refuses to keep a dump < 1 KB

### Offsite backup (secondary — 33.3)

Uses `rclone` to copy each new backup file to a second cloud location immediately after it is written.

**Set up once on the VPS:**

```bash
# 1. Install rclone
curl https://rclone.org/install.sh | sudo bash

# 2. Configure a remote (interactive wizard)
rclone config
# Recommended: Backblaze B2 (free up to 10 GB, then $0.006/GB/month)
# Name the remote: b2-orvexa
# Bucket name: orvexa-backups

# 3. Add RCLONE_REMOTE to the cron environment
crontab -e
# Change the backup line to:
#   RCLONE_REMOTE=b2:orvexa-backups
#   0 3 * * * cd /opt/orvexa && ./deploy/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1

# 4. Test a manual upload
rclone ls b2:orvexa-backups
```

**Alternative remotes:**
- `gdrive:orvexa-backups` — Google Drive (free 15 GB, no credit card needed)
- `s3:orvexa-backups` — AWS S3 (pay-per-use, more complex setup)

> Offsite upload failure is non-fatal — the script logs a warning and continues. The local backup is already written.

---

## Disaster Scenarios & Response

| Scenario | Severity | Response |
|----------|----------|----------|
| API crashes / 502 | Medium | SSH in, `docker compose restart api`, check logs |
| VPS unreachable | High | Check OVH status page, then full restore on new VPS (see restore-runbook.md) |
| DB corruption | High | Stop writes, restore from latest backup (see restore-runbook.md) |
| Domain not resolving | High | Check OVH DNS panel, TTL wait up to 1h |
| Café WiFi down | Low | Mobile hotspot (see restaurant-fallback.md) |
| Developer unreachable | Medium | See developer-absence-plan.md |

---

## Related Documents

- `deploy/ops/restore-runbook.md` — full rebuild from scratch
- `deploy/ops/developer-absence-plan.md` — who acts when the developer is offline
- `deploy/ops/restaurant-fallback.md` — paper menus + hotspot procedure for Capitol
- `deploy/ops/emergency-contacts.md` — phone numbers (print and post on-site)
- `deploy/ops/rollback-cheatsheet.md` — quick rollback for bad deploys
