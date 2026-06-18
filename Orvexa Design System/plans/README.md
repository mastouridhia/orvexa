# Handoff: Plans / Pricing Page

## Overview

A standalone **plans and pricing page** (`/plans`) for Orvexa — the QR-based digital ordering platform for restaurants in Tunisia. The page lets prospective restaurant owners compare subscription tiers, toggle between monthly and annual billing, and start a free trial or request an enterprise quote.

---

## About the Design Files

The files in this bundle are **HTML design references** — high-fidelity prototypes showing the intended look, copy, and interactions. Do not ship them directly. Your task is to **recreate this design in the target codebase** (React + Vite, per the existing Orvexa monorepo) using the established component patterns, routing, and i18n system.

`plans.html` — open this in a browser to see the complete reference.  
`colors_and_type.css` — the Orvexa design token contract. All CSS custom properties used in the design live here.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, shadows, and copy are all final. Recreate pixel-precisely, adapting markup to React/JSX and the codebase's existing component library where it covers a given element.

---

## Screens / Views

### Plans Page — `/plans`

A single-page layout with six sections stacked vertically.

---

### 1 · Nav (sticky)

Shared site-wide nav. Matches `orvexa-landing` exactly — reuse whatever nav component exists.

- Height: `64px`. Sticky, `z-index: 100`.
- Background: `rgba(250,248,244,0.94)` + `backdrop-filter: blur(18px) saturate(1.4)`.
- Border-bottom: `1px solid var(--line)`.
- Left: brand mark (26×26 SVG) + wordmark "Orvexa" (Geist 600, −0.4px tracking) + italic saffron `.` (Newsreader Italic).
- Center links: Comment ça marche · Fonctionnalités · **Tarifs** (active state: `background: var(--sunken)`) · FAQ.
- Right: "Connexion" ghost link + "Essai gratuit 14 jours" saffron pill CTA → scrolls to `#plans`.

---

### 2 · Hero (dark)

Full-width section. `background: var(--ink)` (`#19140E`). Padding `80px 0 72px`.

Two radial saffron glows (decorative, `pointer-events: none`):
- Top-right: `rgba(217,122,44,0.15)` in a 680×680 circle.
- Bottom-left: `rgba(217,122,44,0.06)` in a 440×440 circle.

Content centred, `max-width: 720px`, `margin: 0 auto`:

| Element | Spec |
|---|---|
| Eyebrow | Geist Mono, 11px, `letter-spacing: 1.8px`, uppercase, `color: var(--accent)` (#D97A2C). Flanked by 18px saffron hairlines (`::before` / `::after`). Text: "Tarifs · 2026" |
| `<h1>` | Geist 500, `clamp(40px, 5vw, 62px)`, `letter-spacing: −2.4px`, `line-height: 1.03`, `color: var(--paper-warm)`. "Commencez petit," — line break — "grandissez " + `<em>` "quand vous êtes prêt." in Newsreader Italic at `color: var(--accent)` |
| Lede `<p>` | Geist 400, 17px, `line-height: 1.65`, `color: rgba(245,239,230,0.62)`, `max-width: 46ch`. Bold runs use `color: var(--paper-warm); font-weight: 500`. |
| Pills row | Flex, `gap: 8px`, centred, wraps. 4 pills: "14 jours gratuits" · "Sans carte bancaire" · "Sans engagement" · "Changez de plan à tout moment". Each pill: `background: rgba(245,239,230,0.07)`, `border: 1px solid rgba(245,239,230,0.13)`, `color: rgba(245,239,230,0.62)`, `padding: 7px 14px`, `border-radius: 999px`, Geist Mono 13px. Dot: 6×6px circle, `background: var(--accent)`. |

---

### 3 · Plan Cards (`#plans`)

Background: `var(--paper)`.

**Section header** — flex row, space-between, `margin-bottom: 36px`, `padding-top: 72px`:

Left block:
- Eyebrow: "Nos plans" — Geist Mono 11px, uppercase, `letter-spacing: 1.8px`, `color: var(--accent-ink)`, with 18px saffron `::before` hairline.
- `<h2>`: Geist 500, `clamp(28px, 3.5vw, 40px)`, `letter-spacing: −1.4px`. "Simple, " + `<em>`"transparent,"` (Newsreader Italic, saffron) + " sans commissions."
- `<p>`: 15px, `color: var(--ink-muted)`. "Prix fixes en dinars tunisiens. Aucune commission sur vos ventes."

Right block — billing toggle:
- Pill toggle: `background: var(--sunken)`, `border-radius: 999px`, inner padding 4px.
- Active button: `background: var(--surface)`, `box-shadow: var(--shadow-sm)`, `color: var(--ink)`.
- Inactive: `color: var(--ink-muted)`.
- "Annuel" label has a `−17%` tag in Geist Mono 10.5px, `color: var(--accent)`.

**Cards grid** — `grid-template-columns: repeat(4, 1fr)`, `gap: 14px`. Responsive: 2-col at 960px, 1-col at 640px.

#### Card anatomy (shared)

```
background: var(--surface)
border: 1px solid var(--line)
border-radius: var(--radius-xl)   /* 24px */
padding: 26px 22px
display: flex; flex-direction: column; gap: 18px
transition: box-shadow 240ms, transform 240ms
hover: box-shadow var(--shadow-lg); transform: translateY(-2px)
```

Each card contains (top to bottom):
1. Plan chip: Geist Mono, 9px, 1.5px tracking, uppercase, `color: var(--ink-faint)`. e.g. "Plan 01".
2. Plan name: Newsreader Italic 400, 30px, `color: var(--accent)`, `line-height: 1`.
3. Price block: price number (Geist 500, 38px, `letter-spacing: −1.6px`, tabular nums) + `<span class="u">` suffix in Geist Mono 11px, `opacity: 0.48`. Below: sub-line in Geist Mono 10px, `color: var(--ink-faint)`.
4. Who-for: Geist 400, 13px, `color: var(--ink-muted)`, `line-height: 1.5`.
5. Hairline divider: `height: 1px; background: var(--line)`.
6. Feature list: `display: flex; flex-direction: column; gap: 8px`. Each item: check icon (16×16 circle, `background: var(--accent-bg)`, SVG checkmark in `#7C3F12`) + text in Geist 13px, `color: var(--ink-muted)`.
7. CTA button (full-width, at bottom, pushed by `flex: 1` on the features list).

#### Plan data

| Plan | Chip | Price (monthly) | Price (annual) | Annual sub-line | CTA label | CTA style |
|---|---|---|---|---|---|---|
| **Essentiel** | Plan 01 | 19 TND/mois | 190 TND/an | 190 TND/an · 2 mois offerts | Commencer gratuitement | `.btn-outline` |
| **Plus** | Plan 02 | 79 TND/mois | 790 TND/an | 790 TND/an · 2 mois offerts | Commencer gratuitement | `.btn-outline` |
| **Pro** | Plan 03 | 149 TND/mois | 1 490 TND/an | 1 490 TND/an · 2 mois offerts | Commencer gratuitement | `.btn-primary` (saffron) |
| **Premium** | Plan 04 | 499+ TND/mois | Sur devis | À partir de · sur devis | Demander un devis | `.btn-outline` |

#### Pro card (dark / featured)

```
background: var(--ink)       /* #19140E */
border-color: var(--ink)
box-shadow: var(--shadow-xl)
transform: translateY(-4px)  /* elevated at rest */
```

- "Le plus populaire" badge: absolute, `top: -11px`, horizontally centred. `background: var(--accent)`, white text, Geist Mono 9px, `letter-spacing: 1.2px`, uppercase, `padding: 4px 14px`, `border-radius: 999px`.
- Chip colour: `rgba(245,239,230,0.35)`.
- Plan name: `color: var(--dark-accent)` (`#F59A4D`).
- Price: `color: var(--paper-warm)`.
- Sub-line: `color: rgba(245,239,230,0.38)`.
- Who-for: `color: rgba(245,239,230,0.55)`.
- Divider: `background: rgba(245,239,230,0.09)`.
- Feature text: `color: rgba(245,239,230,0.65)`. Check icon bg: `rgba(217,122,44,0.14)`, checkmark stroke `#F59A4D`.

#### Premium card (saffron border)

```
border: 1.5px solid rgba(217,122,44,0.28)
```

**Billing toggle logic:**

```js
// Monthly → Annual
pval.textContent = value.toLocaleString('fr-FR')  // e.g. 1490 → "1 490"
psub.textContent = e.g. "1 490 TND/an · 2 mois offerts"

// Annual → Monthly
pval.textContent = raw monthly number
psub.textContent = "Facturé mensuellement"
```

**Footnote** (below grid): centred, 12.5px, `color: var(--ink-faint)`:
> Essai gratuit 14 jours sur les plans Essentiel, Plus et Pro — **aucune carte bancaire requise.**  
> Tables supplémentaires : +10 TND/mois par pack de 10. Écran cuisine supplémentaire : +50 TND/mois.

---

### 4 · Comparison Table (desktop only, hidden ≤1060px)

Full-width table, `border-collapse: collapse`, under section header "Ce que comprend chaque plan."

**Column structure:** 34% feature label · 4× 16.5% plan columns.

**Plan column headers** — top cap:
- White card: `background: var(--surface)`, `border: 1px solid var(--line)`, `border-radius: 16px 16px 0 0`, `border-bottom: none`, `padding: 18px 16px 14px`.
- Dark card (Pro): `background: var(--ink)`, `border-color: var(--ink)`.
- Inside: plan name (Newsreader Italic, 22px, saffron / `var(--dark-accent)`) + price (Geist Mono 15px, 600, `color: var(--ink)` / `var(--paper-warm)`).

**Feature groups** (5 groups):

1. Menu & QR
2. Commandes & service
3. Cuisine & équipes
4. Analytics & rapports
5. Multi-zones (Premium uniquement)

Group header rows: Geist Mono 10px, uppercase, `letter-spacing: 1.4px`, `color: var(--ink-faint)`, `border-bottom: 1px solid var(--line)`, `padding: 20px 0 8px`.

Feature rows: `border-bottom: 1px solid var(--line-soft)`, `padding: 12px 0`.

- Feature label cell: Geist 13.5px, `color: var(--ink)`. Optional `<small>` sub-line: 11.5px, Geist Mono, `color: var(--ink-faint)`.
- Value cells: centred. Pro column gets `background: rgba(25,20,14,0.035)`.
  - ✓ present: 20×20 circle, `background: var(--accent-bg)`, checkmark `#7C3F12`. Pro variant: `rgba(217,122,44,0.18)` bg, checkmark `#F59A4D`.
  - ✗ absent: `–` in `color: var(--ink-faint)`, 16px.
  - Text value (e.g. "20 tables", "Illimitées"): Geist 12.5px.

**Footer row** — bottom cap with CTA buttons (mirror of header cap structure, `border-radius: 0 0 16px 16px`).

---

### 5 · Add-ons

3-column grid (`gap: 14px`). Each card: `background: var(--surface)`, `border: 1px solid var(--line)`, `border-radius: var(--radius-lg)`, `padding: 24px 22px`.

Icon container: 40×40px, `border-radius: var(--radius-md)`, `background: var(--accent-bg)`, `border: 1px solid rgba(217,122,44,0.15)`. SVG icons: 18×18, stroke `var(--accent-ink)`, `stroke-width: 1.75`.

Price tag: Geist Mono 12px, `color: var(--accent-ink)`, `background: var(--accent-bg)`, `padding: 4px 10px`, `border-radius: 999px`.

| # | Title | Description | Price tag |
|---|---|---|---|
| 1 | Pack tables supplémentaires | Ajoutez des tables supplémentaires à votre plan Plus. Chaque pack comprend 10 tables. | +10 TND/mois · par pack de 10 |
| 2 | Écran cuisine supplémentaire | Un KDS de plus pour un deuxième poste ou une deuxième station dans la même cuisine. | +50 TND/mois · par écran |
| 3 | Formation sur site | Une demi-journée avec un technicien Orvexa pour former votre équipe et configurer les écrans. | Sur devis · Tunis & régions |

---

### 6 · FAQ

Two-column grid, `gap: 0 72px`. 5 questions per column. Each item: `padding: 20px 0`, `border-bottom: 1px solid var(--line)`. First item in each column: `border-top: 1px solid var(--line)`.

Question: Geist 600, 15px, `letter-spacing: −0.2px`. Italic words use Newsreader Italic, `color: var(--accent)`.  
Answer: Geist 400, 13.5px, `line-height: 1.65`, `color: var(--ink-muted)`. Bold runs: `color: var(--ink); font-weight: 600`.

Questions:

1. Mes clients ont-ils besoin d'une *application* ?
2. Puis-je *changer de plan* à tout moment ?
3. Comment fonctionne l'*essai gratuit* ?
4. Orvexa fonctionne-t-il en *arabe* ?
5. Y a-t-il des *commissions* sur mes ventes ?
6. Comment ajouter plus de *tables* ?
7. Puis-je recevoir les commandes sur *WhatsApp* ?
8. Qu'est-ce que le *KDS* (écran cuisine) ?
9. Est-ce adapté aux *hôtels et resorts* ?
10. Que se passe-t-il si je suis *hors ligne* ?

(See `plans.html` for full answer copy.)

---

### 7 · Final CTA

`background: var(--ink)`. Padding `96px 0`. Centred. Same radial glow as hero.

- Eyebrow: "Prêt à démarrer ?" (saffron, centred).
- `<h2>`: "Lancez votre menu digital " + *aujourd'hui.* — `clamp(32px, 4.2vw, 52px)`, `letter-spacing: −2px`.
- Lede: "14 jours gratuits. Sans carte bancaire. Sans engagement."
- CTAs: "Commencer gratuitement" (saffron pill, lg) + "Voir la plateforme →" (ghost).
- Contact pills (3): phone · email · Instagram — Geist Mono 12px, semi-transparent background.

---

### 8 · Footer

`background: var(--ink)`, `border-top: 1px solid rgba(245,239,230,0.07)`, `padding: 34px 0`. Flex row, space-between:
- Brand mark + wordmark.
- Nav links: Fonctionnalités · Tarifs · FAQ · Confidentialité · CGU · Connexion.
- Copyright: Geist Mono 10px, `color: rgba(245,239,230,0.3)`. "© 2026 Orvexa SARL · Tunis, Tunisie".

---

## Interactions & Behavior

### Billing toggle (monthly ↔ annual)
- Toggle state in local React state (`'monthly' | 'yearly'`).
- On switch to annual: price numbers update (e.g. 149 → 1 490), sub-line updates to "X TND/an · 2 mois offerts", toggle note updates to "Économisez 2 mois sur l'abonnement annuel".
- No animation required on the numbers — instant swap is correct.
- Annual prices: Essentiel 190 · Plus 790 · Pro 1 490 · Premium stays "Sur devis".
- Format annual prices with French locale grouping: `toLocaleString('fr-FR')` → "1 490".

### Scroll reveal
- Elements with class `.reveal` animate in: `opacity 0 → 1`, `translateY(18px) → 0`, duration `600ms`, easing `cubic-bezier(0.2, 0.7, 0.3, 1)`.
- Triggered by `IntersectionObserver` at `threshold: 0.08`, `rootMargin: '0px 0px -32px 0px'`.
- Stagger delays: `d2 = 80ms`, `d3 = 160ms`, `d4 = 240ms`.

### Hover states
- Plan cards: `box-shadow: var(--shadow-lg)`, `transform: translateY(-2px)`. Pro card: `translateY(-6px)`.
- Add-on cards: `box-shadow: var(--shadow-md)`.
- Nav links: `background: var(--sunken)`, `color: var(--ink)`.
- `.btn-primary` hover: `filter: brightness(1.07)`, `transform: translateY(-1px)`.
- `.btn-outline` hover: `border-color: rgba(25,20,14,0.22)`, `color: var(--ink)`, `background: var(--sunken)`.
- All transitions: `var(--motion-fast)` = `180ms cubic-bezier(0.2, 0.7, 0.3, 1)`.

---

## State Management

```ts
// Minimal state for this page
const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

// No server data needed — all content is static
// Plans data can live in a const array in the same file or a sibling data file
```

---

## Design Tokens

All tokens are in `colors_and_type.css`. Key values referenced in this page:

| Token | Value | Usage |
|---|---|---|
| `--paper` | `#FAF8F4` | Page background |
| `--surface` | `#FFFFFF` | Cards |
| `--sunken` | `#F2EFE8` | Toggle bg, hover bg |
| `--ink` | `#19140E` | Primary text, Pro card bg |
| `--ink-muted` | `rgba(25,20,14,0.62)` | Secondary text |
| `--ink-faint` | `rgba(25,20,14,0.42)` | Tertiary, eyebrows |
| `--line` | `rgba(25,20,14,0.08)` | Borders |
| `--line-soft` | `rgba(25,20,14,0.05)` | Table row dividers |
| `--accent` | `#D97A2C` | Saffron — CTAs, names, glows |
| `--accent-ink` | `#7C3F12` | Text on saffron-tinted bg |
| `--accent-bg` | `#FBEED9` | Saffron-tinted bg |
| `--dark-accent` | `#F59A4D` | Saffron on dark surfaces |
| `--paper-warm` | `#F5EFE6` | Text on dark (ink) surfaces |
| `--font-sans` | `'Geist'` | All UI text |
| `--font-display` | `'Newsreader'` | Italic editorial moments |
| `--font-mono` | `'Geist Mono'` | Numbers, eyebrows, tags |
| `--radius-xl` | `24px` | Plan cards |
| `--radius-lg` | `16px` | Add-on cards, table caps |
| `--radius-md` | `12px` | Add-on icon containers |
| `--radius-pill` | `999px` | Buttons, toggle, pills |
| `--shadow-sm` | `0 1px 3px …` | Toggle active button |
| `--shadow-lg` | `0 4px 8px … 0 16px 48px …` | Card hover |
| `--shadow-xl` | `0 8px 16px … 0 32px 80px …` | Pro card rest state |
| `--shadow-saffron` | `0 1px 2px rgba(217,122,44,0.32), 0 8px 24px rgba(217,122,44,0.24)` | Primary CTA |
| `--motion-fast` | `180ms cubic-bezier(0.2,0.7,0.3,1)` | Hover transitions |
| `--motion-base` | `240ms cubic-bezier(0.2,0.7,0.3,1)` | Card transitions |

---

## Assets

| File | Usage |
|---|---|
| `orvexa-mark.svg` | Brand mark — dark circle with saffron ring and dot. Use as `<img>` or inline SVG in nav and footer. Light-mode variant (for footer on dark bg): swap circle fill to `#F5EFE6`, inner fill to `#15110D`, dot to `#F59A4D`. |

Fonts are loaded from Google Fonts:
```
https://fonts.googleapis.com/css2?family=Newsreader:opsz,ital,wght@6..72,1,400;6..72,1,500;6..72,1,600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap
```

---

## Files in this bundle

| File | Purpose |
|---|---|
| `README.md` | This document |
| `plans.html` | Full hi-fi design reference — open in a browser |
| `colors_and_type.css` | Orvexa design token contract — all CSS custom properties |
| `orvexa-mark.svg` | Brand mark SVG |

---

## Route

Implement as `/plans` (or `/tarifs`). Link from the main nav's "Tarifs" item and from the landing page hero CTA "Essayer 14 jours gratuit".

---

*Orvexa design system · plans page handoff · June 2026*
