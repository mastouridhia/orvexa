# Handoff: Orvexa Landing Page (orvexa.tn)

## Overview

This is the marketing landing page for **Orvexa** — a SaaS platform providing digital QR menus, table ordering, kitchen display systems (KDS), and multi-zone management for restaurants and hotels in Tunisia.

The landing page is in **French** (primary market language) and covers the full conversion funnel: hero → proof → how it works → features → pricing → FAQ → CTA.

---

## About the Design Files

The files in this bundle are **HTML design references** — high-fidelity prototypes showing the intended look, copy, layout, and interactions. They are **not** production-ready code to ship directly.

Your task is to **recreate these designs in your target codebase** (Next.js, Nuxt, Astro, plain HTML, etc.) using its established patterns, component library, and build toolchain. The HTML files serve as the single source of truth for visual intent.

The `colors_and_type.css` file is the **official Orvexa design-system token file** ported from the production app — use these exact values (don't approximate).

---

## Fidelity

**High-fidelity.** Every color, font size, weight, spacing value, border radius, shadow, and piece of copy in the HTML reference is intentional and final. Recreate pixel-perfectly. The only exceptions are:

- The phone/QR mockup in the hero is a **CSS illustration** — replace with a real product screenshot when available.
- The logo mark is an inline SVG circle motif — the production mark file is `orvexa-mark.svg`.

---

## Sections / Views

The page is a single scrolling document. Section order:

| # | ID | Section |
|---|---|---|
| 1 | — | Sticky navigation bar |
| 2 | — | Hero |
| 3 | — | Stats bar |
| 4 | `#comment` | How it works |
| 5 | `#fonctionnalites` | Features |
| 6 | `#tarifs` | Pricing |
| 7 | `#faq` | FAQ |
| 8 | — | Final CTA |
| 9 | — | Footer |

---

### 1. Sticky Navigation

**Layout:** `position: sticky; top: 0; z-index: 100`. Full-width bar, 64px height.  
Inner content: `max-width: 1160px`, horizontal flex, `padding: 0 40px`.

**Left:** Logo mark (26×26 SVG) + wordmark `Orvexa` (Geist 600, 17px, `letter-spacing: -0.4px`) with a trailing italic saffron `.` (Newsreader italic, `color: #D97A2C`).

**Center:** Nav links — hidden on mobile (`< 960px`). Links: `Comment ça marche`, `Fonctionnalités`, `Tarifs`, `FAQ`. Style: 14px, weight 500, `color: rgba(25,20,14,0.62)`, pill hover `background: #F2EFE8`.

**Right:** `Connexion` ghost link + primary CTA button `Essayer 14 jours gratuit`.

**Background:** `rgba(250,248,244,0.94)` + `backdrop-filter: blur(18px) saturate(1.4)`. Border-bottom `rgba(25,20,14,0.08)`.

---

### 2. Hero

**Background:** `#19140E` (ink/dark). Two radial saffron glow pseudo-elements (decorative, `pointer-events: none`).  
**Padding:** `96px 0 80px`.  
**Grid:** `1fr 320px`, `gap: 64px`, vertically centered. Right column (phone mockup) hidden on mobile.

**Eyebrow:** Geist Mono, 11px, `letter-spacing: 1.8px`, uppercase, `color: #D97A2C`. Preceded by an 18px saffron rule. Text: `Menu digital · Commandes · Cuisine · Multi-zones`.

**H1:** `font-size: clamp(46px, 5.8vw, 70px)`, weight 500, `letter-spacing: -2.8px`, `line-height: 1.01`, `color: #F5EFE6`.  
Text: `Votre restaurant, géré ` + `en un scan.` (italic, Newsreader, `color: #D97A2C`).

**Lede paragraph:** 17px, `line-height: 1.65`, `color: rgba(245,239,230,0.65)`, `max-width: 48ch`. Bold spans use `color: #F5EFE6`, weight 500.

**CTA row:** Two buttons side by side with `gap: 10px`, `flex-wrap: wrap`.
- Primary button `Essayer 14 jours gratuit` — large variant (15px, `padding: 13px 28px`)
- Ghost button `Comment ça marche →` — `color: rgba(245,239,230,0.72)`, pill border `rgba(245,239,230,0.18)`

**Trust line:** Geist Mono 10.5px, `color: rgba(245,239,230,0.38)`. Three items separated by 3px dot dividers: `Sans carte bancaire` · `Sans engagement` · `Arabe · Français · Anglais`.

**Right column — phone mockup:** CSS illustration of a mobile phone showing a QR menu. Replace with a real product screenshot at 248px wide. Two floating badges animate with `@keyframes float` (translateY 0→-7px, 3s ease-in-out infinite): a QR code tile (bottom-left) and a "Nouvelle commande / Table 12" notification card (bottom-right of phone).

---

### 3. Stats Bar

**Background:** `#FFFFFF`. Border-bottom `rgba(25,20,14,0.08)`.  
**Layout:** 4-column CSS grid, each cell `border-right: 1px solid rgba(25,20,14,0.08)`. Collapses to 2×2 at `< 960px`.  
**Padding per cell:** `28px 32px`.

| Stat | Label |
|---|---|
| `30s` | Mise à jour du menu en temps réel |
| `0` | Application à installer pour le client |
| `3` | Langues — Arabe, Français, Anglais |
| `14j` | Essai gratuit sans engagement ni carte |

**Number:** Newsreader italic 400, 40px, `letter-spacing: -1.5px`, `color: #D97A2C`.  
**Label:** 13px, `color: rgba(25,20,14,0.62)`. Bold spans use `color: #19140E`, weight 600.

---

### 4. How It Works (`#comment`)

**Background:** `#FAF8F4`. **Padding:** `96px 0`.

**Section heading:** eyebrow `Comment ça marche` + H2 `Trois gestes. ` + `Zéro application.` (italic saffron) + body copy.

**Steps:** 3-column grid, `gap: 16px`. Collapses to 1-column at `< 960px`.

Each step card:
- Background `#FFFFFF`, border `rgba(25,20,14,0.08)`, `border-radius: 24px`, `padding: 32px 28px`
- Step number: Newsreader italic, 76px, `color: #D97A2C`, `opacity: 0.75`, `letter-spacing: -3px`
- H3: 21px, weight 600, `letter-spacing: -0.3px`
- Body: 14px, `line-height: 1.65`, `color: rgba(25,20,14,0.62)`. Italic spans use Newsreader italic, `color: #7C3F12`
- Arrow connector badge between steps 1→2 and 2→3: 24px circle, centered on right edge of card. Hidden on mobile.

| Step | Title | Purpose |
|---|---|---|
| 1 | Scannez | Client scans QR, no app needed |
| 2 | Commandez | Client browses, adds to cart, sends order *(Plus, Pro, Premium)* |
| 3 | Gérez | Staff receives alert, kitchen prepares, analytics update |

---

### 5. Features (`#fonctionnalites`)

**Background:** `#F2EFE8` (sunken). **Padding:** `96px 0`.

**Layout:** 2-column grid with a full-width spanning card. `gap: 16px`.

#### Feature cards (standard)

`background: #FFFFFF`, `border: 1px solid rgba(25,20,14,0.08)`, `border-radius: 24px`, `padding: 32px`. Hover: `box-shadow: var(--shadow-md)`.

**Icon container:** 46×46px, `border-radius: 12px`, `background: #FBEED9`, `border: 1px solid rgba(217,122,44,0.15)`. Icon: 21×21px stroke SVG, `stroke: #7C3F12`, `stroke-width: 1.75`.

**H3:** 19px, weight 600, `letter-spacing: -0.3px`. Italic part uses Newsreader italic, `color: #D97A2C`.

**Body:** 14px, `line-height: 1.65`, `color: rgba(25,20,14,0.62)`.

**Checklist:** `gap: 7px`. Each item: 13px. Check icon: 16×16px circle, `background: #FBEED9`, SVG checkmark `stroke: #7C3F12`.

| Card | Title | Key checklist items |
|---|---|---|
| Menu digital QR | Catégories illimitées, photos, masquer épuisés, lien Instagram | — |
| Commande à table | Appeler serveur, WhatsApp, accepter/refuser, 20 tables incluses | — |
| Écran cuisine (KDS) — wide | KDS status flow, application serveur | Plan Pro badge |
| Multi-zones hôtels | Facturation chambre, dashboard multi-zones | — |
| Analytics temps réel | CA quotidien, top produits, scans QR | — |

#### KDS + Serveur card (full-width, dark)

`grid-column: span 2`. `background: #19140E`, `border-color: #19140E`. 2-column inner grid.  
Text colors: H3 `#F5EFE6`, body `rgba(245,239,230,0.6)`. Icon bg `rgba(217,122,44,0.14)`, icon stroke `#F59A4D`. Checklist text `rgba(245,239,230,0.62)`. Check icon circle `rgba(217,122,44,0.14)`, SVG stroke `#F59A4D`.  
**Plan badge** (top-right): saffron pill `Plan Pro`, `background: #D97A2C`, white text, Geist Mono 9px.

**KDS flow pills** (below KDS copy): `En attente → En préparation → Prêt → Servi` in pill chips, saffron-tinted active state (`background: rgba(217,122,44,0.18)`, `color: #F59A4D`). Arrows between: 10px SVG.

---

### 6. Pricing (`#tarifs`)

**Background:** `#FAF8F4`. **Padding:** `96px 0`.

**Toggle (Monthly / Annual):** Inline-flex pill, background `#F2EFE8`, `border-radius: 999px`, `padding: 4px`. Active tab: `background: #FFFFFF`, box-shadow, weight 500. Annual label has `−17%` in saffron mono.

**Plans grid:** 4-column, `gap: 14px`. Collapses to 2-column at `< 960px`, 1-column at `< 600px`.

| Plan | Monthly | Annual | Audience |
|---|---|---|---|
| Essentiel | 19 TND | 190 TND | Cafés, fast-foods, commerces |
| Plus | 79 TND | 790 TND | Cafés avec service à table |
| Pro *(featured)* | 149 TND | 1 490 TND | Restaurants professionnels |
| Premium | 499+ TND | Sur devis | Hôtels, resorts |

**Standard plan card:** `background: #FFFFFF`, `border: 1px solid rgba(25,20,14,0.08)`, `border-radius: 24px`, `padding: 26px 22px`. Hover: lift + shadow.

**Pro card (featured):** `background: #19140E`. "Le plus populaire" badge above the card, centered, `background: #D97A2C`. All text inverted to warm-paper tones. CTA: primary saffron button.

**Premium card:** extra `border: 1.5px solid rgba(217,122,44,0.28)`.

**Plan name:** Newsreader italic, 28px, `color: #D97A2C` (light) / `#F59A4D` (dark).  
**Price number:** Geist 500, 36px, `letter-spacing: -1.5px`. Unit `TND/mois` in mono 11px, opacity 0.48.  
**CTA buttons:** `btn-outline` for light plans, `btn-primary` for Pro.

**Pricing note** (below grid): `text-align: center`, 12.5px, `color: rgba(25,20,14,0.42)`. Mentions add-on pricing: +10 TND/mois per pack of 10 tables; +50 TND/mois for extra KDS screen.

**Toggle JS behavior:** Swap `.pval` text content between `data-m` and `data-y` attributes. Swap unit labels between `TND/mois` and `TND/an`. Swap `.psub` text between `data-m` and `data-y`.

---

### 7. FAQ (`#faq`)

**Background:** `#F2EFE8`. **Padding:** `96px 0`.

**Layout:** 2-column grid, `gap: 0 72px`. Collapses to 1-column at `< 960px`.

Each FAQ item: `padding: 20px 0`, `border-bottom: 1px solid rgba(25,20,14,0.08)`. First item in each column has top border too.

**Question:** 15.5px, weight 600, `letter-spacing: -0.2px`. Italic part: Newsreader italic, `color: #D97A2C`.  
**Answer:** 13.5px, `line-height: 1.65`, `color: rgba(25,20,14,0.62)`. Bold spans: `color: #19140E`, weight 600.

**8 questions total (4 per column):**

| Q | A (summary) |
|---|---|
| Mes clients ont-ils besoin d'une application ? | Non — navigateur uniquement, aucune app. |
| Puis-je changer de plan à tout moment ? | Oui, données préservées. |
| Comment fonctionne l'essai gratuit ? | 14 jours, sans carte, sans engagement. |
| Orvexa fonctionne-t-il en arabe ? | Oui — arabe, français, anglais. |
| Comment ajouter plus de tables ? | Packs de 10 tables à +10 TND/mois. |
| Puis-je recevoir les commandes sur WhatsApp ? | Oui, à partir du plan Plus. |
| Qu'est-ce que le KDS ? | Écran cuisine temps réel, dès le plan Pro. |
| Est-ce adapté aux hôtels et resorts ? | Oui — plan Premium, multi-zones indépendants. |

---

### 8. Final CTA

**Background:** `#19140E`. Centered radial saffron glow (decorative). **Padding:** `104px 0`, `text-align: center`.

**Eyebrow:** `Prêt à démarrer ?`  
**H2:** `Lancez votre menu digital ` + `aujourd'hui.` (italic saffron). `max-width: 20ch`. `font-size: clamp(36px, 4.5vw, 54px)`.  
**Lede:** `14 jours gratuits. Sans carte bancaire. Sans engagement.`  
**CTA row:** Primary button `Commencer gratuitement` + ghost button `Voir une démo →`.

**Contact pills** (below CTAs, `margin-top: 44px`): Three frosted pills with icon + text.
- `+216 96 830 161` (WhatsApp icon)
- `contact@orvexa.tn` (email icon)
- `@orvexa.tn` (Instagram icon)

Pill style: `background: rgba(245,239,230,0.07)`, `border: 1px solid rgba(245,239,230,0.13)`, `color: #F5EFE6`, Geist Mono 12px, `border-radius: 999px`, `padding: 10px 18px`. Icon `stroke: #F59A4D`.

---

### 9. Footer

**Background:** `#19140E`. **Border-top:** `rgba(245,239,230,0.07)`. **Padding:** `36px 0`.

Three items in a horizontal flex, `flex-wrap: wrap`:
- **Logo + wordmark** (same as nav, inverted colors — mark has light outer ring)
- **Nav links:** `Fonctionnalités`, `Tarifs`, `FAQ`, `Connexion`, `Politique de confidentialité`. 13px, `color: rgba(245,239,230,0.42)`, hover `rgba(245,239,230,0.78)`.
- **Copyright:** Geist Mono 10px, `color: rgba(245,239,230,0.30)`. Text: `© 2026 Orvexa · Tunisie`.

---

## Interactions & Behavior

### Scroll reveal animation
Elements with class `.reveal` animate from `opacity: 0; translateY(18px)` to visible as they enter the viewport. JS adds `.js-hidden` only to elements below the fold on load, then adds `.in` via `IntersectionObserver`. Stagger delays: `.reveal-d2` = 80ms, `.reveal-d3` = 160ms. `transition: 0.6s cubic-bezier(0.2, 0.7, 0.3, 1)`. Respect `prefers-reduced-motion`.

### Pricing toggle
Switches between monthly and annual pricing. No page reload — JS swaps text content from `data-m` / `data-y` attributes.

### Smooth scroll
All `<a href="#section">` links use `scrollIntoView({ behavior: 'smooth', block: 'start' })`.

### Hero floating badges
Two cards animate infinitely with a gentle float (`translateY 0 → -7px`, 3s and 3.6s periods, offset by 0.6s). Decorative only.

### Button hover states
- Primary button: `filter: brightness(1.07)`, `transform: translateY(-1px)`
- Plan cards: `transform: translateY(-2px)`, shadow increase. Pro card: `translateY(-4px)`.

---

## Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `< 960px` | Nav links hidden; hero single-column (phone mockup hidden); stats 2×2; steps 1-col; feature cards 1-col; plans 2×2; FAQ 1-col |
| `< 600px` | Container padding → 20px; plans 1-col; section padding → 72px |

---

## Design Tokens

All tokens are in `colors_and_type.css`. Key values:

### Colors
| Token | Value | Usage |
|---|---|---|
| `--paper` | `#FAF8F4` | App/page background |
| `--paper-warm` | `#F5EFE6` | Text on dark surfaces |
| `--surface` | `#FFFFFF` | Cards |
| `--sunken` | `#F2EFE8` | Alternate section bg, chips |
| `--ink` | `#19140E` | Primary text, dark bg |
| `--ink-muted` | `rgba(25,20,14,0.62)` | Secondary text |
| `--ink-faint` | `rgba(25,20,14,0.42)` | Tertiary text, meta |
| `--accent` | `#D97A2C` | Saffron — CTAs, highlights |
| `--accent-ink` | `#7C3F12` | Deep saffron on light bg |
| `--accent-bg` | `#FBEED9` | Faint saffron tint |
| `--dark-accent` | `#F59A4D` | Warmed saffron on dark bg |
| `--line` | `rgba(25,20,14,0.08)` | Borders, dividers |

### Typography
| Font | Variable | Usage |
|---|---|---|
| Geist | `--font-sans` | All UI text, headings |
| Newsreader (italic only) | `--font-display` | Headline italic flourishes |
| Geist Mono | `--font-mono` | Eyebrows, prices, tags, meta |
| IBM Plex Sans Arabic | `--font-arabic` | Arabic locale (`dir="rtl"`) |

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Newsreader:opsz,ital,wght@6..72,1,400;6..72,1,500;6..72,1,600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap
```

### Spacing (4px base)
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72px`

### Radii
`8 / 12 / 16 / 24px` + `999px` for pills

### Shadows
```
--shadow-xs:  0 1px 2px rgba(36,28,20,0.04)
--shadow-sm:  0 1px 3px rgba(36,28,20,0.06), 0 1px 2px rgba(36,28,20,0.04)
--shadow-md:  0 2px 4px rgba(36,28,20,0.04), 0 8px 24px rgba(36,28,20,0.08)
--shadow-lg:  0 4px 8px rgba(36,28,20,0.05), 0 16px 48px rgba(36,28,20,0.12)
--shadow-xl:  0 8px 16px rgba(36,28,20,0.06), 0 32px 80px rgba(36,28,20,0.16)
--shadow-saffron: 0 1px 2px rgba(217,122,44,0.32), 0 8px 24px rgba(217,122,44,0.24)
```

### Motion
```
--ease-out:   cubic-bezier(0.2, 0.7, 0.3, 1)
--motion-fast:  180ms var(--ease-out)
--motion-base:  240ms var(--ease-out)
```

---

## Assets

| File | Usage |
|---|---|
| `orvexa-mark.svg` | Logo mark (concentric circles: outer `#19140E`, middle `#FBEED9`, inner `#D97A2C`). Use at 22–26px in nav/footer, larger in hero. |
| `colors_and_type.css` | Full design system token file — link or import directly |
| `orvexa-landing.html` | Complete reference prototype |

**No product screenshots were used** — the hero phone illustration is a CSS placeholder. Replace with actual app screenshots when available.

---

## Files

```
design_handoff_landing_page/
├── README.md                  ← This file
├── orvexa-landing.html        ← Full hi-fi reference (open in browser)
├── colors_and_type.css        ← Orvexa design system tokens (link/import this)
└── orvexa-mark.svg            ← Logo mark SVG
```

Open `orvexa-landing.html` in any modern browser to see the full interactive reference. All sections, hover states, the pricing toggle, and scroll animations are live.

---

## Notes for Claude Code

- **Don't ship the HTML directly** — recreate in your framework of choice.
- **Import `colors_and_type.css`** (or copy the `:root` tokens into your global stylesheet / Tailwind config) — they're the canonical Orvexa token contract.
- The **bilingual italic pattern** (Geist for text, Newsreader italic for flourishes) is the core brand moment — preserve it in every headline.
- The logo wordmark trailing `.` is always Newsreader italic in `--accent` color — don't make it plain text.
- When adding Arabic support, add `dir="rtl"` and switch to `--font-arabic` (IBM Plex Sans Arabic).
- The saffron glow pseudo-elements in the hero and final CTA are `pointer-events: none` decorative blobs — a `radial-gradient` on an absolutely-positioned `::before`/`::after` is the simplest implementation.
