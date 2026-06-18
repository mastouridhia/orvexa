# Handoff: Restaurant Menu — Customer-facing QR menu app

## Overview
A mobile-first customer menu web app for a Tunisian restaurant. Customers scan a QR code at their table and get a full interactive menu: browse by category, search, add items to cart, and place an order. The design is built on the **Orvexa Design System** ("Saffron-Hospitality" direction).

## About the Design Files
The files in this bundle are **HTML design references** — high-fidelity prototypes showing the intended look, layout, and interactive behavior. They are **not** production code to ship directly.

Your task is to **recreate this design in your target codebase** (React, Vue, Next.js, native app, etc.) using its established patterns, routing, and component libraries — matching the visual output as closely as possible.

`menu.html` — the full interactive prototype (open in any browser)  
`colors_and_type.css` — the complete Orvexa token set (CSS custom properties for colors, type, spacing, radius, shadow, motion)

---

## Fidelity
**High-fidelity.** Colors, typography, spacing, radius, shadows, and interactions are all final and should be matched pixel-precisely. Use `colors_and_type.css` as the design-token source of truth.

---

## Screens / Views

### 1. Menu Screen (main)

**Purpose:** The primary screen. Shows restaurant name, search, category filter tabs, and scrollable menu items.

**Overall layout:**
- `max-width: 480px`, centered, full-height
- Background: `var(--paper)` — `#FAF8F4`
- Three sticky layers: header → category tabs → content scrolls beneath

---

#### Header (sticky, `top: 0`, `z-index: 100`)
- Background: `rgba(250,248,244,0.9)` + `backdrop-filter: blur(16px)`
- Border-bottom: `1px solid var(--line)`
- Padding: `10px 16px`
- Layout: `display:flex; align-items:center; gap:8px`

**Table badge** (left)
- Font: `var(--font-mono)`, `11px`, `letter-spacing: 1.4px`, uppercase
- Color: `var(--ink-muted)`
- Border: `1px solid var(--line)`, `border-radius: var(--radius-pill)`
- Padding: `4px 11px`
- Background: `var(--surface)` — `#FFFFFF`
- Content: `TABLE Z`

**Status pill** (next to badge)
- Background: `var(--success-bg)` — `#E6F4EC`
- Color: `var(--success-ink)` — `#1F6B43`
- Font: `var(--font-mono)`, `11px`, uppercase, tracked
- Padding: `4px 10px`, `border-radius: var(--radius-pill)`
- Animated green dot (6×6px, `var(--success)`, pulse opacity 1→0.3 over 2.4s ease-in-out)
- Content: `● OUVERTE`

**Icon buttons** (right, after spacer)
- 36×36px circle, `border-radius: var(--radius-pill)`
- Color: `var(--ink-muted)` → hover `var(--ink)`, bg hover `var(--sunken)`
- Two icons: info (ⓘ) opens Infos sheet; gear opens settings
- Stroke: `1.75`, `stroke-linecap: round`

---

#### Hero
- Padding: `28px 20px 16px`
- **Restaurant name:** `font-family: var(--font-sans)`, `font-size: 40px`, `font-weight: 500`, `letter-spacing: -1px`
  - The italic word uses `var(--font-display)` (Newsreader Italic), `font-weight: 400`, color `var(--accent)` — `#D97A2C`
  - Example: `café` in Geist 500 + `test` in Newsreader italic saffron
- **Tagline:** `var(--font-mono)`, `11px`, `letter-spacing: 1.4px`, uppercase, color `var(--ink-faint)` — `rgba(25,20,14,0.42)`
  - Content: `CUISINE MAISON · TUNIS`

---

#### Search bar
- Padding: `0 16px 18px`
- Input: `width: 100%`, `height: 44px`, `border-radius: var(--radius-md)` — `12px`
- Border: `1px solid var(--line)`, bg `var(--surface)`, `box-shadow: var(--shadow-xs)`
- Padding-left: `42px` (for icon), padding-right: `16px`
- Font: `var(--font-sans)`, `var(--fs-body)` — `15px`
- Placeholder color: `var(--ink-faint)`
- **Focus state:** border `var(--accent)`, box-shadow `0 0 0 3px var(--accent-glow)` — `rgba(217,122,44,0.32)`
- Search icon (magnifier SVG) absolutely positioned at `left: 30px, top: 13px`, color `var(--ink-faint)`

---

#### Category tabs (sticky, `top: 57px` = header height)
- Background: `rgba(250,248,244,0.92)` + `backdrop-filter: blur(12px)`
- Border-bottom: `1px solid var(--line)`
- Padding-bottom: `12px`
- Horizontal scroll row (`overflow-x: auto`, `scrollbar-width: none`), `gap: 6px`, `padding: 0 16px`

**Each tab:**
- `padding: 6px 14px`, `border-radius: var(--radius-pill)`
- Border: `1px solid var(--line)`, bg `var(--surface)`, `box-shadow: var(--shadow-xs)`
- Font: `var(--font-sans)`, `13px`, `font-weight: 500`, color `var(--ink-muted)`
- **Active state:** bg `var(--accent)`, border `var(--accent)`, color `var(--paper-warm)` — `#F5EFE6`, `font-weight: 600`, `box-shadow: var(--shadow-saffron)`
- **Hover (inactive):** border-color `var(--accent)`, color `var(--accent-ink)` — `#7C3F12`
- Tabs: `Tout`, then one per menu category

---

#### Menu sections (scrollable body, `padding: 4px 16px 140px`)

**Section heading row:**
- Font: `var(--fs-h3)` — `20px`, `font-weight: 500`, `letter-spacing: -0.2px`
- Border-bottom: `1px solid var(--line)`, `padding-bottom: 10px`, `margin-bottom: 10px`
- Right: item count in `var(--font-mono)`, `11px`, uppercase, `var(--ink-faint)`

**Item card:**
- `display: flex; align-items: center; gap: 12px`
- `background: var(--surface)`, `border-radius: var(--radius-lg)` — `16px`
- `padding: 14px`, `margin-bottom: 8px`
- `box-shadow: var(--shadow-sm)`, `border: 1px solid var(--line-soft)`
- Active press: `transform: scale(0.99)`

  **Item info (flex: 1):**
  - Name: `15px`, `font-weight: 600`, `letter-spacing: -0.1px`, color `var(--ink)`
  - Description: `var(--fs-caption)` — `12px`, color `var(--ink-muted)`, 2-line clamp
  - Price chip: `var(--font-mono)`, `13px`, `font-weight: 600`, color `var(--accent-ink)`, bg `var(--accent-bg)` — `#FBEED9`, `border-radius: var(--radius-pill)`, `padding: 2px 8px`

  **Thumbnail (72×72px):**
  - `border-radius: var(--radius-md)`, bg `var(--sunken)`, `border: 1px solid var(--line-soft)`
  - Replace with real food photo; use diagonal stripe SVG as placeholder

  **Add button (qty = 0):**
  - 32×32px circle, bg `var(--accent)`, color `var(--paper-warm)`
  - `font-size: 20px`, `font-weight: 300`
  - `box-shadow: var(--shadow-saffron)`
  - Hover: bg `var(--accent-700)` — `#A8561A`
  - Active: `transform: scale(0.88)`

  **Quantity stepper (qty > 0):**
  - `display: flex; align-items: center; gap: 6px`
  - `−` / `+` buttons: 28×28px circle, `border: 1px solid var(--line)`, bg `var(--surface)`, `box-shadow: var(--shadow-xs)`
    - Hover: border + color → `var(--accent)`
  - Count: `var(--font-mono)`, `14px`, `font-weight: 600`, `min-width: 16px`, centered

---

### 2. Cart Bar (fixed bottom, visible when cart > 0)

- `position: fixed; bottom: 0`, `max-width: 480px`, centered
- Padding: `10px 16px` + `env(safe-area-inset-bottom)`
- Background: `linear-gradient(to top, var(--paper) 55%, transparent)`
- Opacity: `0` hidden → `1` visible, `transition: opacity 240ms`

**Cart pill button:**
- `width: 100%`, `height: 54px`, `border-radius: var(--radius-xl)` — `24px`
- Background: `var(--ink)` — `#19140E`, color `var(--paper-warm)`
- `box-shadow: var(--shadow-ink)`
- Layout: space-between — left group (icon + label + badge count) / right (total)
- Badge: `var(--accent)` bg, `var(--font-mono)`, `11px bold`, `border-radius: var(--radius-pill)`
- Total: `var(--font-mono)`, `13px`, opacity `0.65`
- Hover: bg `var(--accent-900)` — `#3D1E08`

---

### 3. Cart Drawer (bottom sheet)

**Overlay:** `rgba(25,20,14,0.48)` + `backdrop-filter: blur(4px)`

**Sheet:**
- `border-radius: 24px 24px 0 0`, bg `var(--surface)`
- `transform: translateY(100%)` → `translateY(0)`, `transition: transform 520ms cubic-bezier(0.34,1.36,0.64,1)` (spring)
- `max-height: 82dvh`, flex column

**Handle:** 36×4px, `var(--line)`, centered, `margin-top: 12px`

**Header:** `padding: 14px 20px 12px`, border-bottom `var(--line-soft)`
- Title: `var(--fs-h3)`, `font-weight: 500` with Newsreader italic accent word in `var(--accent)`
- Close button: same icon-btn style

**Body (scrollable):**
- Cart rows: `display: flex; align-items: center; gap: 10px`, `padding: 11px 0`, `border-bottom: 1px solid var(--line-soft)`
  - Qty stepper (same style as item card)
  - Name: `14px`, `font-weight: 500`
  - Price: `var(--font-mono)`, `13px bold`, `var(--accent-ink)`

**Footer:** `padding: 14px 20px` + safe-area, border-top `var(--line-soft)`
- Total row: label in eyebrow style (`var(--ink-faint)`) + amount in `var(--font-mono) 22px 600`
- **Commander button:** `width: 100%`, `height: 52px`, `border-radius: var(--radius-lg)`, bg `var(--accent)`, color `var(--paper-warm)`, `box-shadow: var(--shadow-saffron)`

---

### 4. Infos Pratiques Sheet (bottom sheet)

Same sheet pattern as cart. `max-height: 75dvh`.

**Info rows:** `display: flex; align-items: flex-start; gap: 14px`, `padding: 14px 0`, `border-bottom: 1px solid var(--line-soft)`
- Icon wrap: 36×36px, bg `var(--accent-bg)`, `border-radius: var(--radius-sm)` — `8px`, color `var(--accent-ink)`
- Label: `var(--font-mono)`, `11px`, uppercase, tracked, `var(--ink-faint)`
- Value: `14px`, `font-weight: 500`
- Sub-value: `var(--fs-caption)`, `var(--ink-muted)`

Items: Horaires, Adresse, Téléphone, Wi-Fi

---

## Interactions & Behavior

| Interaction | Behavior |
|---|---|
| Tap category tab | Filters menu to that category instantly; tab gets saffron active state |
| Type in search | Filters items by name + description across all categories |
| Tap `+` on item | Replaces add button with qty stepper `− N +`; cart bar fades in |
| Tap `−` to zero | Stepper replaced back by `+` button; cart bar hides if cart empty |
| Tap cart bar pill | Opens cart drawer (spring slide-up animation) |
| Tap overlay or ✕ | Closes sheet; body overflow restored |
| Tap ⓘ in header | Opens Infos pratiques sheet |
| Change qty in cart | Updates stepper in menu + total in real time |

**Animations:**
- Sheet open: `transform: translateY(0)`, `transition: 520ms cubic-bezier(0.34,1.36,0.64,1)`
- Sheet close: `transform: translateY(100%)`, same duration
- Cart bar: `opacity` toggle, `240ms var(--ease-out)` — `cubic-bezier(0.2,0.7,0.3,1)`
- Status dot: `opacity 1→0.3→1`, `2.4s ease-in-out infinite`
- Hover/active transitions: `180ms var(--ease-out)` for color/bg, `80ms` for transforms

---

## State Management

```
cart: { [itemId: number]: quantity: number }
activeCat: string  // 'Tout' | category name
searchQ: string    // live search query
```

- Cart is client-side only (until Commander is tapped — wire to your order API)
- `changeQty(id, delta)` is the single mutation: clamps to 0, deletes key at 0, re-renders both menu and cart
- Tabs and search both re-filter the same `menuData` array — no server calls needed for filtering

---

## Design Tokens (from `colors_and_type.css`)

All values are CSS custom properties — import or replicate `colors_and_type.css`.

| Token | Value | Usage |
|---|---|---|
| `--paper` | `#FAF8F4` | App background |
| `--paper-warm` | `#F5EFE6` | Text on dark/saffron surfaces |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--sunken` | `#F2EFE8` | Inputs, chips at rest, thumbnail bg |
| `--line` | `rgba(25,20,14,0.08)` | Borders |
| `--line-soft` | `rgba(25,20,14,0.05)` | Subtle dividers |
| `--ink` | `#19140E` | Primary text |
| `--ink-muted` | `rgba(25,20,14,0.62)` | Secondary text |
| `--ink-faint` | `rgba(25,20,14,0.42)` | Labels, placeholders |
| `--accent` | `#D97A2C` | Saffron — THE brand accent |
| `--accent-ink` | `#7C3F12` | Saffron text on light bg |
| `--accent-bg` | `#FBEED9` | Faint saffron tint |
| `--accent-glow` | `rgba(217,122,44,0.32)` | Focus ring |
| `--accent-700` | `#A8561A` | Saffron hover |
| `--accent-900` | `#3D1E08` | Deep saffron (cart hover) |
| `--success` | `#2E8B57` | Open status dot |
| `--success-bg` | `#E6F4EC` | Status pill background |
| `--success-ink` | `#1F6B43` | Status pill text |
| `--shadow-xs` | `0 1px 2px rgba(36,28,20,0.04)` | Subtle lift |
| `--shadow-sm` | `0 1px 3px …0.06, 0 1px 2px …0.04` | Item cards |
| `--shadow-saffron` | `0 1px 2px rgba(217,122,44,0.32), 0 8px 24px rgba(217,122,44,0.24)` | Saffron CTAs |
| `--shadow-ink` | `0 1px 2px rgba(25,20,14,0.20), 0 8px 24px rgba(25,20,14,0.16)` | Ink cart button |
| `--radius-sm` | `8px` | Icon wrap |
| `--radius-md` | `12px` | Thumbnails, search input |
| `--radius-lg` | `16px` | Item cards, order button |
| `--radius-xl` | `24px` | Bottom sheets, cart pill |
| `--radius-pill` | `999px` | Tabs, badges, add button |
| `--font-sans` | `'Geist'` | All UI text |
| `--font-display` | `'Newsreader'` (italic) | Restaurant name accent, sheet title italic word |
| `--font-mono` | `'Geist Mono'` | Prices, counts, eyebrows, table badge |
| `--motion-fast` | `180ms cubic-bezier(0.2,0.7,0.3,1)` | Hover states |
| `--motion-base` | `240ms cubic-bezier(0.2,0.7,0.3,1)` | Cart fade |
| `--motion-spring` | `520ms cubic-bezier(0.34,1.36,0.64,1)` | Sheet slide |

---

## Assets

- **Food photos:** Replace the diagonal-stripe SVG placeholders (72×72px) with real food images, `border-radius: var(--radius-md)`, `object-fit: cover`
- **Icons:** All inline SVG, `stroke-width: 1.75`, `stroke-linecap: round`, `stroke-linejoin: round`, `currentColor` — no fill
- **Fonts:** Load from Google Fonts — `Newsreader` (ital 400/500/600, opsz 6–72), `Geist` (300–700), `Geist Mono` (400–600), `IBM Plex Sans Arabic` (for Arabic RTL support if needed)

---

## Files in this bundle

| File | Purpose |
|---|---|
| `menu.html` | Full interactive prototype — open in browser to see design + interactions |
| `colors_and_type.css` | Orvexa design token source — import into your project |
| `README.md` | This document |

---

## Notes for Claude Code

- Wire `changeQty` to your real cart/order state (Redux, Zustand, Context, etc.)
- Replace `menuData` array with your API response — shape: `{ cat, items: [{ id, name, desc, price }] }`
- `TABLE Z` and `OUVERTE` should come from the session/table context
- The "Commander →" button should call your order submission endpoint
- Safe-area insets (`env(safe-area-inset-bottom)`) are important — keep them for notched phones
- The menu is RTL-ready: swap `font-family` to `var(--font-arabic)` and add `dir="rtl"` for Arabic
