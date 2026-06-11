# Orvexa — Emergency Contact Card

**Post this on-site (kitchen + manager station)**

---

## System Down / App Not Working

| Who | Role | Phone | When to call |
|-----|------|-------|--------------|
| [YOUR NAME] | Developer / Owner | [YOUR PHONE] | Any time — always call first |
| [BACKUP CONTACT] | [ROLE] | [PHONE] | If developer unreachable > 15 min |

---

## Restaurant Management

| Who | Role | Phone |
|-----|------|-------|
| [MANAGER NAME] | Manager / Cashier | [PHONE] |
| [OWNER NAME] | Owner | [PHONE] |

---

## If the App Is Down — Do This First

1. **Check Wi-Fi** — confirm the tablet/phone is on the restaurant Wi-Fi
2. **Hard-refresh the page** — pull down to refresh or press F5
3. **Try another device** — borrow a staff phone
4. **Switch to paper** — paper menus are in [LOCATION], tally on notepad
5. **Call the developer** (number above)

---

## Paper Fallback Procedure

- Paper menus are stored at: **[LOCATION]**
- Write orders on notepads: Table number → items → quantity
- Hand written ticket to kitchen
- Cashier tallies manually at checkout
- Enter orders into system retroactively once service restores

---

## Hosting / Infrastructure

| Service | Details |
|---------|---------|
| VPS Provider | OVH — ovh.com |
| VPS IP | 51.210.97.193 |
| Domain | orvexa.tn (registered at OVH) |
| Domain renewal | [RENEWAL DATE — check annually] |
| DB backups | /opt/orvexa/backups/ on VPS |
| Monitoring | UptimeRobot (alerts via SMS + email) |

---

*Last updated: 2026-06-08*
