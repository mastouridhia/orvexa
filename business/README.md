# Orvexa — Business collateral (billing & contract)

Fillable, print-to-PDF documents for signing and billing new clients. Open each
in a browser, fill the fields on screen, then **Imprimer / Enregistrer en PDF**
(Ctrl/Cmd+P → *Save as PDF*). No build step — self-contained HTML, works offline.

French is the binding language (clients are Tunisian, like the [CGU](../legal/CGU.md)).

## Where they live / how to reach them

The two HTML templates ship inside the admin app's static folder
(`apps/admin/public/business/`) so they deploy with the site and are reachable
**from anywhere** — not just the dev machine:

- **In the Platform admin** → log in at `admin.orvexa.tn/platform` → **Documents** tab → *Ouvrir*.
- **Direct URL:** `admin.orvexa.tn/business/facture-modele.html` and `…/contrat-abonnement.html`.
- **Locally:** double-click the files in `apps/admin/public/business/` (or `npm run dev` and open `/business/…`).

This README stays at repo root as internal notes (not served publicly).

## Documents

| File | Purpose | When |
| --- | --- | --- |
| [`contrat-abonnement.html`](../apps/admin/public/business/contrat-abonnement.html) | **Bon de commande & contrat d'abonnement** — the one-pager the client signs. Selects the formule, states the agreed price, setup fee, start date, payment method, and what's in/out of scope. | At close — print 2 copies, both parties sign. |
| [`facture-modele.html`](../apps/admin/public/business/facture-modele.html) | **Facture / Reçu / Devis** — fillable payment document (auto-totals, TND in millimes, D17 payment). Toggle the type in the toolbar. | *Devis* during the pitch; *Facture/Reçu* for the setup fee + first period before go-live. |

## How they fit together

- The **contrat** carries the commercial deal (scope, price, setup fee, payment,
  start date) and **incorporates the CGU by reference** — so it stays a single
  page instead of duplicating the CGU's 23 articles. The heavy legal terms
  (IP, liability cap of 3 months, no SLA, no refunds, termination, Tunisian law /
  Tunis courts) all live in [`../legal/CGU.md`](../legal/CGU.md) and are binding via art. 8.
- The **facture** is pure billing. Pricing matches `PLANS.md`:
  Essentiel 19 / Plus 79 / Pro 149 TND/mo (×10 for yearly), Premium 499+ / sur devis.

## Operator setup (the real situation)

Orvexa is run by an **individual operator with a D17 account** — no matricule
fiscal, no TVA, no registered company. The documents reflect that:

- Payment is **D17 (mobile) or cash** — fill your D17 number on the invoice.
- No TVA line, no droit de timbre, no operator matricule.
- The "facture" is really a **simplified payment document / reçu**, not a fiscal
  invoice. Switch the type to *Reçu* if you prefer the honest label.

**Heads-up for B2B:** a registered restaurant's accountant may ask for a proper
*facture fiscale* to expense the subscription — that requires a tax registration
you don't have yet. Handle case by case; most small cafés won't ask. If this
starts blocking deals, registering as an auto-entrepreneur is the unlock.

> The contract clauses are a solid draft; an avocat review is still worth it
> before relying on them (see [`../legal/README.md`](../legal/README.md)).

## Tracking

- Invoice template = task **35.4** (closes the open half of 31.8).
- Contract = task **35.7**; the signed document is what lets the operator complete
  30.1 (signed agreement), 30.2 (scope), 30.3 (timeline), 31.1 (pricing in writing),
  31.2 (setup fee), 31.7 (payment method).
