# Orvexa — Full Restore Runbook

Use this when the VPS is gone and you need to rebuild from scratch on a new server.  
**Target time: under 2 hours (our RTO).**

---

## Prerequisites — have these ready before you start

- [ ] OVH account credentials (orvexa.tn domain owner)
- [ ] GitHub/GitLab account that has the orvexa repo
- [ ] `.env.production` file — saved in your password manager or a personal encrypted drive
- [ ] Latest backup file — either from the old VPS (`/opt/orvexa/deploy/data/backups/`) or the offsite remote (`rclone ls b2:orvexa-backups`)
- [ ] SSH private key for the new VPS

If `.env.production` is lost: rebuild it from `.env.example` + your password manager. The critical secrets are `JWT_SECRET`, `SESSION_JWT_SECRET`, `POSTGRES_PASSWORD`, and the LE email.

---

## Step 1 — Provision a new VPS (~10 min)

1. Log in to **OVH → Public Cloud → Instances → Create an instance**
2. Choose: **Ubuntu 22.04 LTS**, smallest VPS with ≥ 2 GB RAM (current plan is fine)
3. Add your SSH public key during provisioning
4. Note the new IP address

---

## Step 2 — Install Docker & Git (~5 min)

```bash
ssh root@<NEW_IP>

apt-get update -y
apt-get install -y git curl ca-certificates gnupg

# Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## Step 3 — Clone the repo (~2 min)

```bash
mkdir -p /opt/orvexa
cd /opt/orvexa
git clone https://github.com/<your-org>/orvexa.git .
```

If the repo is private, create a GitHub deploy key:
```bash
ssh-keygen -t ed25519 -C "orvexa-vps" -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub   # paste this into GitHub → repo → Settings → Deploy keys
git clone git@github.com:<your-org>/orvexa.git .
```

---

## Step 4 — Restore environment config (~3 min)

```bash
# Copy .env.production from your password manager / local machine:
scp .env.production root@<NEW_IP>:/opt/orvexa/.env.production

# Verify the file is there and non-empty
wc -l /opt/orvexa/.env.production
```

---

## Step 5 — Get Let's Encrypt certs (~5 min)

The nginx container handles TLS. On first boot it needs certs for:
- `orvexa.tn`, `www.orvexa.tn`
- `api.orvexa.tn`, `admin.orvexa.tn`, `kitchen.orvexa.tn`, `waiter.orvexa.tn`

**First, point DNS to the new IP** (OVH → DNS Zone → update all A records). Propagation: up to 30 min, often < 5 min.

```bash
cd /opt/orvexa

# Bootstrap certs (runs certbot standalone on port 80)
chmod +x deploy/scripts/init-certs.sh
./deploy/scripts/init-certs.sh
```

If DNS hasn't propagated yet, certbot will fail. Wait 5 min and retry.

---

## Step 6 — Start all services (~5 min)

```bash
cd /opt/orvexa
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Watch logs until stable
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

The API container runs Drizzle migrations automatically on start. Watch for:
```
[api] Migrations applied successfully
[api] Server listening on port 4000
```

---

## Step 7 — Restore the database (~5 min)

```bash
# Option A: backup file is already on the new VPS
gunzip -c /opt/orvexa/deploy/data/backups/orvexa-db-<STAMP>.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db \
    psql -U orvexa orvexa

# Option B: download from offsite (rclone must be configured)
rclone copy b2:orvexa-backups/orvexa-db-<STAMP>.sql.gz /tmp/
gunzip -c /tmp/orvexa-db-<STAMP>.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db \
    psql -U orvexa orvexa
```

Use the most recent `orvexa-db-*.sql.gz` file (check timestamps).

---

## Step 8 — Verify the restore (~5 min)

```bash
# Health check
curl -s https://api.orvexa.tn/health
# Expected: {"status":"ok"}

# Quick DB sanity
docker compose -f docker-compose.prod.yml exec db \
  psql -U orvexa -c "SELECT count(*) FROM orders;"

# Open the apps in a browser
# https://orvexa.tn          → customer menu
# https://admin.orvexa.tn    → admin login
# https://kitchen.orvexa.tn  → kitchen login
# https://waiter.orvexa.tn   → waiter login
```

---

## Step 9 — Restore cron jobs (~2 min)

```bash
# Backup cron (adjust RCLONE_REMOTE if offsite is configured)
(crontab -l 2>/dev/null; echo 'RCLONE_REMOTE=b2:orvexa-backups'; \
 echo '0 3 * * * cd /opt/orvexa && ./deploy/scripts/backup-db.sh >> /var/log/orvexa-backup.log 2>&1') \
 | sort -u | crontab -

crontab -l   # confirm one entry
```

---

## Step 10 — Tell the client

Call the restaurant manager and let them know the system is back up. Confirm:
- QR codes still work (they encode the public slug, which survived in the restored DB)
- Staff can log in on their devices
- Test an order end-to-end

---

## Test Procedure (33.5)

Run this dry-run at least once on a spare machine or a temporary OVH instance before relying on this runbook in a real emergency.

```
Checklist for the dry-run:
[ ] Spun up a fresh Ubuntu 22.04 VPS
[ ] Completed Steps 1-9 using a real DB backup from the offsite remote
[ ] /health returned {"status":"ok"}
[ ] Could log in as admin and see menu/orders
[ ] Destroyed the test VPS after confirming
[ ] Date tested: ___________
```

> Schedule this as part of the quarterly maintenance (see maintenance-schedule.md → Quarterly).
