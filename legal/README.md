# Legal documents — maintainer notes

Two documents, three rendered surfaces. **Keep them in sync** and bump the
version everywhere when the text changes materially.

## Canonical source (this folder)
- `CGU.md` — Terms of Service (Conditions Générales d'Utilisation et de Service)
- `Politique-de-confidentialite.md` — Privacy Policy

These are authoritative. French is the binding language.

## Rendered copies (must match the canonical source)
1. **Public landing pages** — `apps/landing/terms.html`, `apps/landing/privacy.html`
   (served at `orvexa.tn/terms.html` and `/privacy.html`; also listed in the
   landing `Dockerfile` COPY block).
2. **In-app binding pages** — `apps/admin/src/pages/Legal.tsx` (`Terms` /
   `Privacy`), routes `/terms` and `/privacy`, linked from the signup consent
   checkbox in `apps/admin/src/pages/Setup.tsx`.

## Consent record
On account creation (`apps/api/src/routes/invitations.ts`) acceptance is required
(`acceptedTerms: true`) and stamped on the restaurant as `terms_accepted_at` +
`terms_version`. When the documents change materially, bump `LEGAL_TERMS_VERSION`
in that route AND the `Version …` strings in the markdown / HTML / TSX.

## Before go-live
- Fill the postal address / fiscal (RNE) placeholder in `CGU.md` §2.
- **Have a Tunisian avocat review these documents.** They are a solid draft
  written to protect the operator (sole operator, Tunisian law, Tunis courts,
  3-month liability cap, no SLA, no refunds, IP retained, client indemnification),
  but a lawyer should confirm the liability caps and any consumer-law edge cases
  before relying on them in production.

Contact used in the docs: orvexatn@gmail.com.
