# Orvexa — Maintenance Schedule

---

## Monthly (first Monday of each month)

| Task | How |
|------|-----|
| Run `npm audit` for vulnerabilities | `cd /opt/orvexa && npm audit` |
| Check disk usage | `df -h /` — alert if > 80% |
| Review error count since last month | `docker compose logs api --since 720h \| grep -c "ERROR"` |
| Prune old Docker images | `docker image prune -f` |
| Verify backups exist and are recent | `ls -lh /opt/orvexa/backups/ \| tail -10` |
| Test UptimeRobot alert (send test) | UptimeRobot dashboard → Send Test Alert |
| Review any new staff accounts (disable leavers) | Admin panel → Staff |

**Next due:** 2026-07-06

---

## Quarterly (every 3 months)

| Task | How |
|------|-----|
| Rotate JWT_SECRET and SESSION_JWT_SECRET | See `deploy/security-ops.md` → Secrets Rotation |
| Review and update staff passwords | Remind all staff to change passwords |
| Full DB backup + test restore | Restore backup to a local Postgres and verify table counts |
| Review nginx logs for anomalies | `docker compose logs nginx --since 2160h \| grep " 4[0-9][0-9] "` |
| Update Node.js base image if new LTS available | Update `FROM node:XX` in Dockerfiles, rebuild |
| Review and prune unused DB backups (keep last 90 days) | `ls /opt/orvexa/backups/` — delete anything older |
| Check OVH VPS plan — storage and bandwidth OK? | OVH control panel |

**Next due:** 2026-09-08

---

## Annual

| Task | How |
|------|-----|
| Renew domain `orvexa.tn` | OVH control panel (auto-renew should be on — verify it) |
| Rotate DB password | See `deploy/security-ops.md` → Secrets Rotation |
| Full security review | Review open ports: `sudo ufw status`, review SSH config |
| Review all active staff accounts | Disable anyone who no longer works at Capitol |
| Update SSL cert contacts if email changed | OVH + Let's Encrypt account |

**Domain renewal due:** check OVH dashboard for exact date — set a calendar reminder 30 days before.

---

## Calendar reminders to set now

Create these in Google Calendar (or phone calendar):

| Reminder | Date | Repeat |
|----------|------|--------|
| Orvexa monthly maintenance | 2026-07-06 | Monthly, first Monday |
| Orvexa quarterly maintenance | 2026-09-08 | Every 3 months |
| Orvexa domain renewal check | 30 days before expiry | Annual |
| Orvexa secrets rotation | 2026-09-08 | Every 3 months |
| npm audit | 2026-07-06 | Monthly, first Monday |
