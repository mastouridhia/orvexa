# Orvexa — Security Operations

## Secrets Rotation (26.14)

Rotate annually at minimum, or immediately after any suspected compromise.

**JWT_SECRET and SESSION_JWT_SECRET**
1. Generate new values: `openssl rand -base64 48`
2. Update `/opt/orvexa/.env.production` on the VPS
3. Update the copy in Bitwarden
4. Restart the API: `docker compose restart api`
5. Note: all active sessions (staff logins + customer QR sessions) will be invalidated — staff will need to log in again

**DB password**
1. Pick a new password and update it in Bitwarden first
2. Update in Postgres: `docker compose exec db psql -U orvexa -c "ALTER USER orvexa PASSWORD 'new-password';"`
3. Update `DATABASE_URL` in `/opt/orvexa/.env.production`
4. Restart the API: `docker compose restart api`

**Next rotation due:** 2027-06-08

---

## Dependency Vulnerability Scan (26.15)

Run monthly from the repo root:

```bash
npm audit
```

Acceptable: moderate severity in dev-only dependencies (drizzle-kit, eslint toolchain) with no runtime impact.
Action required: any high or critical finding — patch or replace the package before the next deploy.

**Schedule:** first Monday of each month. Next due: 2026-07-06.

---

## Incident Response Plan (26.16)

### If the server is compromised or suspected compromised

**1 — Isolate (first 5 minutes)**
- Revoke all active SSH sessions except yours: `who` to see sessions, `sudo pkill -u <user> sshd` to kill others
- Block all inbound traffic temporarily if needed: `sudo ufw deny in on eth0`
- Do NOT reboot yet — logs are in memory

**2 — Assess (next 30 minutes)**
- Check auth logs: `sudo journalctl -u ssh --since "1 hour ago"`
- Check for unexpected processes: `ps aux | sort -rk 3 | head -20`
- Check for unexpected outbound connections: `ss -tnp`
- Check for new/modified files: `sudo find /opt/orvexa -newer /opt/orvexa/.env.production -type f`
- Check Docker logs: `docker compose logs --since 1h`

**3 — Contain**
- Rotate all secrets immediately (see Secrets Rotation above)
- If breach confirmed: snapshot the VPS disk via OVH control panel (evidence), then rebuild
- Notify the client (Capitol) that service is temporarily down

**4 — Restore**
- Rebuild from the repo: `git pull && docker compose up -d --build`
- Re-run migrations if needed: `docker compose exec api npm run db:migrate`
- Verify all endpoints respond: `curl https://api.orvexa.tn/health`
- Re-enable UFW if blocked: `sudo ufw allow in on eth0`

**5 — Post-incident**
- Document what happened and how entry was gained
- Patch the vector before bringing the server back to production

**OVH control panel:** log in at ovh.com — KVM console and disk snapshots are under the VPS section.

---

## Admin 2FA — Known Gap (26.17)

Two-factor authentication is not implemented for admin/manager/waiter/kitchen logins. Staff authenticate with username + password only.

**Risk:** if a staff account password is compromised, an attacker can access the admin panel.

**Mitigation in place:**
- Admin panel is behind HTTPS only
- Rate limiting on `/auth/login` prevents brute-force
- Strong password policy communicated to staff

**Communicated to client (Capitol):** yes — staff must use strong, unique passwords and not share accounts. Each person has their own login.

**Planned:** 2FA (TOTP) is on the backlog for a future phase, post-exam period (after 2026-06-10).
