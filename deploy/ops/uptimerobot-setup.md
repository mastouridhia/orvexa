# Orvexa — UptimeRobot Setup & Test Alert (28.12)

---

## Setup (if not done yet)

1. Go to https://uptimerobot.com → sign in or create a free account
2. Click **Add New Monitor**
3. Fill in:
   - Monitor Type: **HTTPS**
   - Friendly Name: `Orvexa API`
   - URL: `https://api.orvexa.tn/health`
   - Monitoring Interval: **5 minutes**
4. Click **Create Monitor**

Repeat for the customer app:
- Friendly Name: `Orvexa Customer`
- URL: `https://orvexa.tn`

---

## Add SMS + Email alerts

1. In UptimeRobot, go to **My Settings → Alert Contacts**
2. Add your email: `dhiamastouri30@gmail.com`
3. Add your phone number for SMS (free plan includes SMS alerts)
4. Verify both contacts (UptimeRobot sends a confirmation)

---

## Trigger a test alert (to confirm it works)

1. In UptimeRobot dashboard, click on the monitor
2. Click **Send Test Alert** (top-right of monitor details)
3. Confirm you receive:
   - [ ] Email at dhiamastouri30@gmail.com
   - [ ] SMS on your phone

> If no SMS arrives within 2 minutes, check: phone number format must be international (+216XXXXXXXX for Tunisia).

---

## What the alert looks like

**Email subject:** `[UptimeRobot] Orvexa API is DOWN`
**SMS:** `UptimeRobot: Orvexa API (https://api.orvexa.tn/health) is DOWN.`

When the site recovers, you get a matching UP alert.

---

## Free plan limits

- 50 monitors
- 5-minute check interval (minimum)
- SMS alerts included

This is more than enough for Orvexa.
