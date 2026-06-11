# Orvexa — Developer Absence Plan (33.6)

**Applies when:** the developer (Dhia Mastouri) is unreachable for > 2 hours during service.

---

## Who Has Access

| Person | What they can do | Credentials location |
|--------|-----------------|----------------------|
| Dhia (developer) | Everything — SSH, OVH, domain, GitHub | Personal devices + password manager |
| [TRUSTED CONTACT NAME] | SSH to VPS for basic restarts | Password manager — share SSH key before go-live |
| Capitol manager | Admin panel only (browser) | Their own staff login |

**Action before go-live:** share the SSH key and VPS IP with at least one trusted contact (friend, family member, or colleague) who can follow the emergency restart steps below.

---

## What the Manager Can Do Without Developer Help

These require only a browser + the admin staff account. No SSH needed.

| Situation | Manager action |
|-----------|---------------|
| Order not showing in kitchen | Admin → Orders → find the order, check status, manually advance if stuck |
| Staff forgot password | Admin → Staff → reset password |
| Menu item needs to be hidden | Admin → Menu → toggle "Available" off |
| Table stuck in wrong state | Admin → Tables → the table detail has a status override |
| WiFi down | Switch to mobile hotspot (see restaurant-fallback.md) |
| App down entirely | Switch to paper (see restaurant-fallback.md), then call developer |

---

## Emergency Restart (for the trusted contact)

If the app is completely down and the developer is unreachable:

```bash
# 1. SSH into the VPS
ssh root@51.210.97.193

# 2. Go to the project
cd /opt/orvexa

# 3. Try a soft restart first
docker compose -f docker-compose.prod.yml restart

# 4. If that doesn't help, full restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 5. Check health
curl -s https://api.orvexa.tn/health
# Should show: {"status":"ok"}
```

This takes about 2 minutes. It does not touch the database or lose any data.

---

## What Cannot Be Done Without the Developer

- Deploying code changes (requires GitHub push + VPS pull + rebuild)
- Database migrations
- Changing SSL certificates or domain DNS
- Restoring from backup (see restore-runbook.md — requires following all 10 steps)
- Changing API secrets or environment variables

---

## If the Developer Is Unreachable for > 48 Hours

1. Try calling/messaging Dhia on all channels (phone, WhatsApp, email)
2. If truly unreachable, the backup contact follows the emergency restart steps
3. If the system is down and no one can fix it, switch fully to paper service (see restaurant-fallback.md) — this is designed to work indefinitely
4. When Dhia is reachable again, debrief on what happened and update this plan if needed

---

## Access Inventory (fill in before go-live)

| Resource | Owner | Where credentials live |
|----------|-------|----------------------|
| VPS SSH key | Dhia | `~/.ssh/orvexa_vps` + password manager |
| OVH account | Dhia | Password manager |
| GitHub repo | Dhia | GitHub account |
| `.env.production` | Dhia | Password manager (encrypted note) |
| Rclone offsite config | Dhia | `/root/.config/rclone/rclone.conf` on VPS |
| UptimeRobot alerts | Dhia | Email + SMS (`dhiamastouri30@gmail.com`) |
| Domain `orvexa.tn` | Dhia | OVH account |

> Emergency copies of `.env.production` and the SSH private key should be stored in an encrypted file (e.g., a VeraCrypt container or a GPG-encrypted archive) on a second device or cloud drive — not just on the laptop.
