# Capitol Restaurant — Fallback Procedures

**Print this and keep one copy in the kitchen, one at the cashier.**  
**Last updated: 2026-06-10**

---

## When to Use This

- The Orvexa app is not loading on any device
- The internet is down in the restaurant
- The ordering system is too slow to use

These procedures let the restaurant run a full service without the app.

---

## Paper Menu Fallback (33.7)

### What you need

- [ ] Printed French menus — stored at: **[fill in location, e.g., "bottom drawer at the cashier"]**
- [ ] Printed Arabic menus — stored at: **[fill in location]**
- [ ] Notepad + pens for taking orders — stored at: **[fill in location]**
- [ ] Calculator or phone for totals

### Procedure

1. **Greet the table** — hand them the paper menu, note table number
2. **Take the order** on a notepad: table number → items → quantity → any notes
3. **Hand a written ticket to the kitchen** (use the format below)
4. **Kitchen prepares** using the written ticket
5. **Cashier totals manually** at checkout using the price list on the back of this sheet
6. Once the app is back: **enter orders retroactively** in Admin → Orders (optional, for reporting only — no financial impact since payment was collected)

### Ticket format (write clearly)

```
Table: ____    Time: ____

Qty  Item (FR)           Notes
---  ----------------    --------------------
 2   Pizza Margherita    grande
 1   Salade César
 1   Jus d'orange

Total: _____ TND
```

---

## Mobile Hotspot Fallback (33.8)

**Use this when the restaurant WiFi is down but the app server is fine.**

### Step 1 — Enable hotspot on the manager's phone

- iPhone: Settings → Personal Hotspot → toggle on
- Android: Settings → Network → Hotspot → toggle on
- **Set a simple password** and tell staff

### Step 2 — Reconnect devices

On each tablet/phone used for ordering or kitchen display:
1. Go to WiFi settings
2. Forget the restaurant WiFi
3. Connect to the manager's hotspot
4. Reload the Orvexa app — it should work immediately

### Step 3 — Prioritize who connects

Hotspot data is limited. Connect in this order of priority:
1. Kitchen display tablet (most important — kitchen needs to see orders)
2. Waiter phone/tablet
3. Admin tablet (cashier)
4. Customer ordering — switch to paper if hotspot is congested

### Step 4 — When restaurant WiFi comes back

1. Restaurant WiFi recovers → reconnect all devices back to it
2. Forget the hotspot on each device to avoid reconnecting by accident next time

### Note on mobile data

This procedure uses the manager's mobile data plan. The Orvexa app is lightweight — a full lunch service uses roughly 50–100 MB total. This is acceptable for an emergency day but not sustainable for weeks.

---

## Calling for Help

| Who | When | How |
|-----|------|-----|
| Developer (Dhia) | App is down, WiFi is fine, hotspot doesn't help | Phone / WhatsApp (see emergency-contacts.md) |
| OVH support | Suspect the VPS/hosting is down | ovh.com → support |
| Internet provider | WiFi is down, hotspot also unreliable | Number on router or provider contract |

---

## Price Reference (fill in before go-live)

Print the current menu prices here or tape a price list to the back of this sheet so cashiers can total manually without the app.

| Item | Price (TND) |
|------|-------------|
| [item] | [price] |
| ... | ... |

> Update this price list whenever menu prices change.
