# Staff Training — Kitchen + Waiter

Quick training reference for the two staff-facing apps. Print this for the wall.

## Sign in

Both apps use the same login endpoint. Your admin gives you:

- Email + password
- Restaurant slug (only needed if your account belongs to multiple restaurants — usually leave blank)

### Picking your language

The login screen has a tiny FR / ع / EN toggle in the corner. Pick your language once — it's remembered for next time. To change later, go to Settings (admin) or sign out and back in (kitchen / waiter).

---

## Kitchen App

**URL**: `kitchen.<your-domain>` — works best on a tablet or wall-mounted screen.

### What you see

A **board with 3 columns**: *Received* (just placed), *Preparing*, *Ready*. Cards flow left-to-right as orders progress.

Each card shows:

- The table label (top-left)
- Quantities + dish names (with any modifiers like *+ Harissa* or notes from the customer)
- Elapsed time since the order was placed (top-right) — turns yellow at 10 minutes, red at 20 minutes

A short sound + toast plays when a new order arrives. (If you missed it, the *Received* column always shows new orders highlighted.)

### Your job

- Tap **Start** on a *Received* card when you begin cooking → moves to *Preparing*.
- Tap **Mark ready** on a *Preparing* card when the food is plated → moves to *Ready*. The system automatically picks the least-busy waiter for delivery.
- Don't touch the *Mark served* button — that's the waiter's job (it confirms the food actually got to the table).

### When something is wrong

- Customer cancels: the card turns gray + shows *Cancelled*. Stop cooking.
- Wrong order: tell the waiter — they can advance/cancel from their app.
- Out of an ingredient: in the admin app (or ask the manager), toggle the dish *Available* off → it disappears from the customer menu instantly.

---

## Waiter App

**URL**: `waiter.<your-domain>` — works best on a phone or small tablet.

### What you see

A **grid of tables**, color-coded by status:

| Color | Status | What it means |
|-------|--------|---------------|
| Green | Free | Empty, ready for new customers |
| Blue | Seated | Customer scanned the QR but hasn't ordered yet |
| Yellow | Ordering / Waiting | An order is in progress (kitchen still cooking) |
| Orange (pulsing) | Calling | Customer pressed "Call waiter" |
| Red (pulsing) | Bill | Customer requested the bill |

Plus a **Requests feed** at the top showing live call-waiter and bill-request events. Tap *Acknowledge* once you've handled it.

### Tap a table to act

The **drawer** opens with the current order, totals, and action buttons. The buttons that appear depend on order status:

- **Mark served** — appears when the kitchen has marked the order *Ready*. Tap this when you've delivered the food.
- **Request bill** — appears once the order is *Served* and not yet paid. Tap this to flag the table for billing (you can also wait for the customer to do it themselves).
- **Take payment** — appears once the order is *Ready* or *Served* and not yet paid. Opens a small form for tip + cash. Confirms the payment.

### Important: served ≠ paid

A table is only **fully cleared** when *both* the food was served AND payment was taken. The system handles this automatically — once both are true, the table goes back to *Free* and is ready for the next customers.

### "Yours" vs "Assigned to another waiter"

When the kitchen marks an order *Ready*, the system picks the least-busy waiter on duty and assigns the delivery to them. You'll see:

- A green **Yours** badge on tables assigned to you — prioritize these.
- A neutral **Assigned to another waiter** badge on tables assigned to a colleague — you *can* still serve them if your colleague is busy, but the assignment is the system's best guess at who's least loaded.

If no waiter is on duty (no `waiter` role users active in Staff), orders won't be assigned — they stay unassigned and any waiter can pick them up.

### Requesting the bill on a customer's behalf

Some customers don't realize they need to tap *Request bill* in their app. You can do it for them from the table drawer once status is *Served*. The request shows up in your Requests feed (and any other waiter's feed) just like a customer-initiated request would.

### When something is wrong

- Customer cancels mid-meal: from the order drawer, *Cancel order*. Confirm. The table goes back to a free state once any partial payment is reconciled.
- Wrong dish delivered: tell the kitchen verbally. There's no in-app "redo" — the customer can place an additional order if they want a replacement.
- Card payment: the *Take payment* form shows method = *Cash* by default. Pick *Card* or *Mobile* from the dropdown if applicable. Note: card/mobile are stubs — they create a `pending` payment that an admin will reconcile later.

---

## House rules (template — operator should adjust)

- **Greeting time**: ≤ 60 seconds after a customer scans (status = Seated).
- **Drink delivery**: ≤ 5 minutes after order.
- **Food delivery**: ≤ 2 minutes after status flips to Ready.
- **Bill delivery**: ≤ 90 seconds after status flips to Bill.

Adjust to your service standard.
