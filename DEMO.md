# Orvexa — Demo Day Playbook

For: in-person demo with a restaurant CEO.
Goal: in 15 minutes, show that Orvexa replaces paper tickets, printer chaos, and "where is the waiter?" with one synced system that pays for itself in faster table turns.

---

## The 30-second pitch (open with this)

> "Your customer scans the QR on the table. They order in their language — Arabic, French, or English. The kitchen sees the ticket the second it's placed. The waiter knows which table is calling and how long they've been waiting. You see revenue, covers, and what's selling — live, on one screen. No app to install. No printer. No shouting across the pass."

Then hand them a phone and say: **"Scan that."**

---

## Demo setup — what MUST be working before he walks in

Run this checklist 30 minutes before. If any item fails, fix it or skip that part of the demo — never demo something that might break.

### Infrastructure
- [ ] `docker compose up -d` — Postgres is up
- [ ] `npm run dev` — API + 4 frontends all started without errors
- [ ] All four apps load in the browser:
  - Customer (the QR app)
  - Kitchen (KDS)
  - Waiter
  - Admin
- [ ] WebSocket connection is alive on each app (no red "offline" banner)

### Seed data the demo depends on
- [ ] At least **one restaurant** with a real name and logo
- [ ] At least **8–10 menu items** across **3 categories** (Starters / Mains / Drinks), each with:
  - A real photo (not placeholder)
  - Price in **TND**
  - Description in **AR + FR + EN**
  - At least 2 items with allergens / dietary tags
- [ ] At least **6 tables** with QR codes printed and ready
- [ ] **One waiter account** logged in on a phone
- [ ] **One kitchen account** logged in on the KDS tablet
- [ ] **One admin account** logged in on the laptop
- [ ] Today's `right-now` feed has 2–3 historical events so the admin screen isn't empty

### Devices
- [ ] **Laptop** open on Admin dashboard (this is what the CEO watches the whole time)
- [ ] **Tablet** on the Kitchen Display
- [ ] **Phone A** = waiter app, signed in
- [ ] **Phone B** = customer (clean browser, no cached session) — this is the phone you hand the CEO
- [ ] All devices on the **same wifi**, charged, screens at full brightness

### Pre-flight smoke test (do this at T-15 minutes)
1. Scan QR on Phone B → menu loads
2. Add 2 items → place order
3. Order appears on KDS within 1 second
4. KDS bumps to "ready" → customer timeline updates
5. Customer taps "Call waiter" → waiter phone buzzes, card appears in Calls tab
6. Waiter acknowledges → customer sees the checkmark
7. Admin "Right-now" feed shows all of the above
8. Reset: cancel that order, mark the table clean, clear Phone B's session

If all 8 pass, you're green. If anything fails, fix before he arrives.

---

## The demo script (15 minutes, in order)

### Act 1 — The customer experience (4 min)

**Hand him the phone.** Say nothing. Let him scan.

What he should see and feel:
1. **Welcome screen** — restaurant name, table label ("Table 4"), saffron QR halo, language picker
2. He picks **Arabic** → entire UI flips to RTL instantly. *This is your "wow" moment for a Tunisian operator.*
3. He browses categories. Photos are sharp. Prices are in **TND**.
4. He taps an item → detail sheet slides up with parallax hero, allergens, "Add to cart"
5. He adds 2–3 items, opens cart, places order

**While he does this, do not narrate. Let him drive.** When he hands the phone back, then explain.

Killer line: *"He just ordered, in his language, in under 60 seconds, with no app, no signup, no waiter."*

### Act 2 — The kitchen (3 min)

Walk him to the KDS tablet. His order is already there.

Point to:
- **Ticket aging color** — currently green. *"In 5 minutes it turns saffron. After 12 it turns red and pulses. The chef never has to ask 'how long has this been here?'"*
- **Station load bar** in the header. *"The chef sees pressure on Hot vs Cold without counting tickets."*
- **Press-and-hold to bump.** Demo it: hold a ticket → soft chime → it disappears.

Now switch to **Phone B** (the customer phone). The order timeline has advanced from "Received" to "Preparing" automatically.

Killer line: *"No printer. No paper. No 'lost ticket'. And the customer sees the kitchen's progress without asking."*

### Act 3 — The waiter (3 min)

Pick up Phone A (waiter).

1. On Phone B (customer), tap **"Call waiter"** → "I need water"
2. Phone A buzzes. The Calls tab shows a fresh card, green ring.
3. Show the **Floor view** — the table that called is **throbbing red** on the map.
4. Tap **Acknowledge** on the call card → on Phone B, the customer instantly sees the green checkmark.
5. Show the **age coloring** on calls: *"After 60 seconds it turns saffron, after 120 it goes red and tagged OVERDUE. No call ever falls through the cracks."*

Then quickly show **Tables view**: state machine (open → seated → ordered → cooking → ready → paying → clean), per-table detail, who's serving.

Killer line: *"Your floor manager sees, on one screen, every table that needs attention and how long they've been waiting. That's the difference between a 4-star and a 5-star review."*

### Act 4 — The owner's view (4 min)

This is the part the CEO actually buys. **Sit him in front of the laptop on the Admin dashboard.**

Walk him through, top to bottom:

1. **KPI strip** — today's revenue, covers, average ticket, average dwell time, with **day-over-day deltas**. *"You know by 11am if today is going to beat yesterday."*
2. **Service pulse** — the minute-by-minute covers chart. Point at the peak. *"That's your real lunch rush. Now you can staff for it."*
3. **Menu performance** — items ranked by **margin × velocity**. *"This isn't 'best seller' — it's 'best earner'. The dish that sells a lot but costs you margin shows up here."*
4. **Staff leaderboard** — covers, sales, tips, ratings per server, gold ribbon on the top earner. *"Your servers will compete for this."*
5. **Right-now feed** — point at the live stream of seatings, calls, kitchen events, payments. *"Everything that happened in the last 2 minutes is here. You can run the floor from your office."*
6. Scroll down: **Menu management, table management, staff management with roles** (admin / manager / kitchen / waiter). *"You change a price here, every customer's phone updates instantly."*

Demo this last one live: change a menu item price in admin → refresh customer phone → new price.

Killer line: *"You stop running the restaurant on memory and start running it on numbers."*

### Act 5 — The close (1 min)

Three sentences:
1. *"Everything you just saw is one platform, one database, real-time across four screens."*
2. *"It runs on one server, with HTTPS, automatic backups, and works on any phone or tablet you already own."*
3. *"What would it take to pilot this in your restaurant for two weeks?"*

Then **stop talking**. Let him answer.

---

## Features that MUST work in the demo (non-negotiable)

If any of these break mid-demo, the demo is over. Test each one twice before he arrives.

| # | Feature | Why it must work |
|---|---|---|
| 1 | QR scan → menu loads in <2 seconds | First impression |
| 2 | Arabic RTL flip | Local credibility |
| 3 | Order placed → appears on KDS in <1 second | Proves "real-time" isn't marketing |
| 4 | KDS bump → customer timeline updates | Proves the loop closes both ways |
| 5 | Waiter call → waiter phone buzzes, table throbs on floor map | The "wow" of the waiter app |
| 6 | Acknowledge call → customer sees checkmark | Proves staff-customer feedback loop |
| 7 | Admin "Right-now" feed shows the events you just generated | Proves the owner sees everything |
| 8 | Admin price change → reflects on customer phone after refresh | Proves operator control |
| 9 | TND currency everywhere | No "demo dollars" |
| 10 | At least one printable receipt / bill | Proves payment side exists |

---

## Features that are nice-to-have (show only if asked)

Don't volunteer these — they invite questions you may not want yet. If he asks:

- Wall display KDS (read-only big screen) — show only if you have a second monitor
- Per-item dietary/allergen tags — only if he asks about food safety
- Multi-photo item gallery with swipe — only if he asks about menu photography
- Course pacing (starters fire before mains) — only if he's a kitchen-side operator
- Shift clock-in screen — only if he asks about staff management
- Offline indicator — only if he asks "what if the wifi drops?"

---

## Things to NOT show (and what to say if asked)

These exist in the codebase but are not bulletproof enough for a live demo. Have a confident answer ready instead of demoing.

- **Payment processing** — *"We integrate with the local payment provider you already use. The customer flow and the receipt are done; the gateway is a 1-week integration once we know your provider."*
- **Multi-restaurant / multi-branch** — *"Single-restaurant today. Multi-branch is on the roadmap."*
- **Reservations / table booking** — *"Out of scope today. Orvexa is for in-restaurant ordering and operations."*
- **Loyalty / customer accounts** — *"Intentional. The customer is anonymous — they scan, eat, pay, leave. No data collection, no GDPR risk."*
- **Inventory / stock counts** — *"Roadmap."*

---

## Objections you'll hear, and the answer

**"My waiters won't use it."**
> "They will — because their tips go up. The leaderboard ranks them on the metrics they're already paid on. And calls don't get missed anymore, so customer ratings rise."

**"My kitchen guys aren't tech people."**
> "The KDS is one screen. Tickets come in, you press and hold to mark ready. That's it. Most cooks learn it in 5 minutes."

**"What about wifi failures?"**
> "Every screen shows an offline banner the second the network drops. Orders queued on the customer phone resync when wifi comes back. The kitchen and waiter apps work on local network even if internet is down."

**"How long to install?"**
> "One day on-site to print QRs, set up the menu, and train the team. We bring the hardware list."

**"How much?"**
> *Have your pricing answer ready. Don't improvise.*

**"What if you go out of business?"**
> "Your data is yours. The whole stack runs on Docker on a server you own — you can take it with you."

---

## Day-of red flags — abort the demo if you see these

- Any console errors visible on screen
- Placeholder / Lorem ipsum text anywhere
- A photo that's clearly stock / wrong cuisine
- Currency showing as `$` or `€` instead of `TND`
- Latin-only text in the Arabic UI
- More than 2 seconds between an action and the cross-screen update
- Any "Login failed" or "Token expired" toast

If any of these flash, pivot to the laptop-only admin walkthrough. Never try to debug in front of the CEO.

---

## After the demo

- Send him a 1-page recap email **the same day** with: what he saw, the pilot proposal, and a calendar link for a follow-up.
- Leave a printed QR card on his table that links to a 2-minute screen-recording demo he can show his partners.
- Note in the recap: pilot scope, duration (suggest 2 weeks), what hardware you provide, what success looks like (e.g. "average call response time under 90 seconds, zero lost tickets").

---

Good luck. Hand him the phone first. Talk last.
