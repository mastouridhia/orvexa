# Orvexa — Higgsfield Launch Prompt Package (B2B)

> **Audience:** restaurant owners/managers (the buyer).
> **Languages:** French (primary) + Arabic (Tunisia).
> **Formats:** 9:16 hero reel · 16:9 landing loop · 60–90s brand/demo film.
> **Rule we agreed:** Higgsfield generates the *footage only*. No AI voiceover, no
> AI-rendered logo or readable phone UI (it mangles text/logos). The Orvexa logo,
> captions, and music are added as a final overlay layer in any editor.

---

## 0. How Higgsfield actually delivers this
Each Higgsfield generation = **one short clip (~5–10s)**. A "reel" or "demo" is
several clips **stitched in Higgsfield's editor (or CapCut/Premiere/Remotion)**,
then captions + logo + music on top. So below you get **individual shot prompts**,
then an **assembly order** that turns them into each of the 3 deliverables.

For the hero shots we do **image-to-video**: first generate a still (Soul / Nano
Banana), then animate it with a camera-control model (DOP / Veo 3 / Kling 3). This
keeps the look identical across every clip — the #1 thing that makes an AI reel
look pro instead of random.

---

## 1. Message (B2B)
**Tagline:** *Ton resto, sans le chaos.* (Your restaurant, without the chaos.)
**Promise to the owner:**
- Les clients scannent et commandent — toi tu sers. *(Guests scan & order — you just serve.)*
- Les commandes arrivent en direct en cuisine. *(Orders land live in the kitchen.)*
- Plus de tables qui tournent, moins d'attente. *(More table turnover, less waiting.)*
- Installé en une journée. *(Set up in a day.)*
- **CTA:** orvexa.tn

---

## 2. GLOBAL STYLE BIBLE — prepend this to EVERY prompt
Paste this block at the top of every image and video prompt so all clips match.

```
STYLE: Cinematic, premium, authentic Tunisian café-restaurant interior, late
afternoon. Materials: aged warm-wood tables, hand-painted geometric zellige tiles
in deep teal and ochre, brushed brass, woven rattan, terracotta, linen. Golden-hour
sunlight through large windows, soft volumetric light beams, gentle warm dust motes.
COLOR GRADE: warm filmic, low overall saturation with confident saffron-orange pops
(#D97A2C), near-black warm shadows (#19140E), creamy warm highlights (#FAF8F4).
LENS/FILM: 35mm, shallow depth of field, natural soft bokeh, fine film grain, subtle
halation on highlights, gentle anamorphic feel. MOOD: calm, effortless, confident,
high-end but local. MOTION: smooth, slow-to-medium, deliberate, rock-steady — no
jitter, no morphing. Faces never in sharp focus; background people are softly blurred.
```

### Universal NEGATIVE prompt (paste into every clip)
```
text, words, letters, captions, numbers, logos, watermark, signage, brand names,
readable phone screen, app interface, UI, buttons, icons, distorted hands, extra
fingers, deformed fingers, warped or melting faces, plastic skin, uncanny eyes,
oversaturated, neon, HDR glow, cartoon, 3D render look, lowres, blurry, noisy,
jitter, flicker, morphing, fast-food aesthetic, Western diner, plastic cups,
disposable packaging, Coca-Cola, visible competitor branding
```

---

## 3. THE SHOTS
Each shot: purpose · model · aspect/duration · the image prompt (if image-to-video)
· the motion/camera prompt · caption overlay (FR + AR) added in post.

> AR captions are MSA-clean for on-screen text. **Please sanity-check the Arabic
> wording** before publishing — you're the native speaker and I'd rather you catch a
> nuance now than after render.

---

### SHOT 01 — HOOK · "the QR on the table"
- **Purpose:** stop the scroll; establish the café + the product in 2s.
- **Model:** still → Soul/Nano Banana, then **Higgsfield DOP (crash zoom)**.
- **Aspect/Duration:** 9:16 · 4s (also render a 16:9 version for the loop).
- **IMAGE PROMPT:**
```
[STYLE BIBLE] A small elegant table-top QR card holder standing on a warm wooden
café table, shallow focus. Beside it a glass of Tunisian mint tea with rising steam,
a folded linen napkin, a sprig of mint. Soft golden window light from the left,
saffron warmth. Background: a softly blurred full café, out-of-focus warm bokeh.
Card surface is blank cream (no text). Composition leaves empty space in the upper
third for a headline.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] Slow cinematic crash-zoom pushing in toward the QR card, steam drifting
upward, dust motes floating in the light beam, gentle rack focus settling on the card.
Rock-steady, smooth deceleration. 4 seconds. [NEGATIVE]
```
- **Caption (FR):** *Et si ton resto tournait presque tout seul ?*
- **Caption (AR):** ‏وكأن مطعمك يدير نفسه؟

---

### SHOT 02 — SCAN · "guest lifts the phone"
- **Purpose:** show the single action the guest does.
- **Model:** **Veo 3** (realistic hands/motion) or Kling 3.0.
- **Aspect/Duration:** 9:16 · 5s.
- **IMAGE PROMPT:**
```
[STYLE BIBLE] Macro side view: a hand holding a smartphone above the QR card on the
warm café table, phone seen edge-on so the screen is NOT visible to camera, a soft
saffron glow spilling from the screen onto the fingers and the card. Steam and warm
bokeh behind. Extremely shallow depth of field.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] The hand calmly lowers the phone toward the QR card; a soft saffron
light blooms from the phone over the card as it "reads"; subtle parallax, steam
drifting. Natural, unhurried hand motion. 5 seconds. Keep the screen turned away,
never readable. [NEGATIVE]
```
- **Caption (FR):** *Le client scanne. C'est tout.*
- **Caption (AR):** ‏الزبون يمسح الكود. هذا كل شيء.

---

### SHOT 03 — ORDER FLOW · "it goes straight to the kitchen" (abstract)
- **Purpose:** the magic — order travels to kitchen. Abstract so we never fake UI.
- **Model:** **Seedance** or Kling 3.0 (stylised motion).
- **Aspect/Duration:** 9:16 · 5s.
- **IMAGE PROMPT:**
```
[STYLE BIBLE] Abstract elegant motion concept: warm saffron-glowing light particles
and soft blank paper-like order tickets streaming gracefully through the air across a
dim warm café interior, flowing from foreground toward a glowing kitchen pass in the
background. Cinematic, dreamy, premium. Tickets are blank (no text). Lots of warm
negative space.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] Smooth tracking shot following a ribbon of saffron light and floating
blank tickets as they flow from the dining room toward a warm glowing kitchen pass,
gentle motion blur on the particles, the kitchen light pulsing warmly as they arrive.
Graceful, continuous, 5 seconds. [NEGATIVE]
```
- **Caption (FR):** *La commande file direct en cuisine.*
- **Caption (AR):** ‏الطلب يصل المطبخ مباشرة.

---

### SHOT 04 — SPEED · "you serve faster"
- **Purpose:** owner benefit = throughput. Show energy, not chaos.
- **Model:** **Veo 3** (food/steam realism).
- **Aspect/Duration:** 9:16 · 5s.
- **IMAGE PROMPT:**
```
[STYLE BIBLE] Close-up at a warm kitchen pass under a soft heat lamp: a beautifully
plated Tunisian dish (e.g. ojja or grilled fish with herbs) steaming, a chef's hands
(blurred, no face) placing a final garnish, brass and warm light, fast confident
energy frozen mid-motion. Shallow focus on the plate.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] The chef's hands swiftly finish plating and slide the steaming dish
forward onto the pass; steam rises; a quick subtle dolly-in on the finished plate.
Crisp, energetic but elegant, 5 seconds. Hands realistic, no visible face. [NEGATIVE]
```
- **Caption (FR):** *Tu sers plus vite.*
- **Caption (AR):** ‏تقدّم الطلبات أسرع.

---

### SHOT 05 — FULL HOUSE · "more tables turning"
- **Purpose:** the dream — a packed, smoothly-running room. The B2B money shot.
- **Model:** **Veo 3** or Kling 3.0; camera via DOP (crane/pull-back).
- **Aspect/Duration:** 9:16 · 5s (also 16:9 for loop + film).
- **IMAGE PROMPT:**
```
[STYLE BIBLE] Wide elevated view of a full, lively Tunisian café-restaurant at golden
hour: every table occupied, softly blurred guests and waiters mid-service, warm
glowing lamps, saffron sunlight, brass and zellige. Energetic yet calm, prosperous.
No sharp faces. Cinematic establishing shot with depth.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] Slow smooth crane pull-back and slight rise revealing the whole busy
dining room, gentle ambient movement of blurred staff and guests, warm light flares.
Majestic, steady, 5 seconds. [NEGATIVE]
```
- **Caption (FR):** *Plus de tables qui tournent. Moins d'attente.*
- **Caption (AR):** ‏طاولات أكثر، انتظار أقل.

---

### SHOT 06 — LOGO / CTA plate
- **Purpose:** clean end card for logo + CTA overlay.
- **Model:** **DOP** image-to-video (slow drift).
- **Aspect/Duration:** 9:16 · 4s (+ 16:9).
- **IMAGE PROMPT:**
```
[STYLE BIBLE] Minimal premium end-frame: a dark warm surface (near-black #19140E)
with a single soft saffron light beam and faint warm bokeh, large empty negative
space in the centre for a logo. Subtle floating dust motes. Quiet, confident, luxury.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] Very slow drift across the dark warm surface, the saffron light gently
breathing brighter, dust motes floating. Calm, 4 seconds, ends on a stable frame for
a logo lockup. [NEGATIVE]
```
- **Overlay (added in post):** Orvexa logo + *orvexa.tn* + *Installé en une journée.* / ‏جاهز في يوم واحد.

---

### SHOT 07 — "BEFORE" (problem) · only for the 60–90s film
- **Purpose:** set up problem→solution in the longer cut.
- **Model:** **Kling 3.0**.
- **Aspect/Duration:** 16:9 · 5s.
- **IMAGE PROMPT:**
```
[STYLE BIBLE] but COOLER, slightly desaturated, tense: a cluttered café service
station at a busy moment — a messy stack of handwritten paper order tickets, a
scribbled paper menu, a waiter's blurred hand reaching, slightly harsher light, a
faint sense of pressure. Still tasteful, not ugly.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] desaturated tense grade. Handheld-feel slow push toward the messy pile
of paper tickets, one slips and drifts down. Subtle unease. 5 seconds. [NEGATIVE]
```
- **Caption (FR):** *Avant : les bouts de papier, l'attente, les erreurs.*
- **Caption (AR):** ‏قبل: أوراق، انتظار، أخطاء.

---

### SHOT 08 — OWNER POV · only for the 60–90s film
- **Purpose:** put the buyer in frame emotionally.
- **Model:** **Veo 3**.
- **Aspect/Duration:** 16:9 · 5s.
- **IMAGE PROMPT:**
```
[STYLE BIBLE] First-person-ish view: an owner's hand resting calmly on a warm wooden
counter, a glass of tea beside it, looking out over a full, smoothly running dining
room softly blurred ahead. Pride, calm, control. Warm saffron light.
```
- **MOTION PROMPT:**
```
[STYLE BIBLE] Slow gentle dolly forward past the resting hand into the warm busy room
beyond, shallow focus shifting to the full tables. Calm, proud, 5 seconds. [NEGATIVE]
```
- **Caption (FR):** *Toi, tu gardes le contrôle.*
- **Caption (AR):** ‏وأنت تبقى مسيطراً على كل شيء.

---

## 4. ASSEMBLY — turn clips into the 3 deliverables

### A) HERO REEL — 9:16, ~24s (IG / TikTok / Facebook)
Order: **01 → 02 → 03 → 04 → 05 → 06**
- Hard, punchy cuts on the beat; total ~24–27s.
- Caption per shot (FR primary). Export a **second version with AR captions**.
- Logo lockup only on Shot 06.

### B) LANDING HERO LOOP — 16:9, ~8s, silent, seamless
- Use **Shot 01 (16:9)** + **Shot 05 (16:9)** OR a single 8s render of Shot 01.
- No captions, no logo (the page already has them). Must loop cleanly — pick a clip
  whose first and last frame nearly match (Shot 01 crash-zoom held, or Shot 06 drift).
- Embed muted + autoplay + loop on orvexa.tn hero.

### C) BRAND / DEMO FILM — 16:9, 60–90s (sales, onboarding, YouTube)
Order: **07 (before) → 08 (owner) → 01 → 02 → 03 → 04 → 05 → 06**, each held longer,
with 1–2 extra establishing renders if you want more length. Add a calm FR voice-over
script (record a human, not AI) — see below — plus AR-subtitled version.

**VO script (FR, ~70s):**
> Chaque service, c'est la même course. Les papiers, l'attente, les erreurs.
> Et si c'était simple ? Le client scanne. Il commande. La commande arrive direct
> en cuisine. Toi, tu sers — plus vite, sans stress. Plus de tables qui tournent,
> moins d'attente, des clients contents. Orvexa. Installé en une journée. orvexa.tn

---

## 5. MUSIC & SOUND
- **Mood:** warm, modern, light percussion + oud/acoustic guitar hybrid → builds to an
  uplifting hit on Shot 05 (full house). Tunisian-modern, not generic EDM.
- **Reel:** one rising track, ~24s, accent hit on the "full house" reveal and the logo.
- **Loop:** silent (landing autoplay is muted anyway).
- **Film:** softer intro under "before", lifts at the scan, peaks at full house, resolves
  on the logo.
- Use a licensed track (Epidemic Sound / Artlist) — keep the receipt for ads usage.

---

## 6. MODEL CHEAT-SHEET (which Higgsfield model per job)
| Need | Use |
|---|---|
| Hero still to animate (consistent look) | **Soul** / **Nano Banana** |
| Specific camera move (crash zoom, dolly, crane, FPV) | **DOP / Camera Control** |
| Realistic food, steam, hands, ambient people | **Veo 3** |
| Long, clean realistic motion | **Kling 3.0** |
| Stylised abstract motion (the order-flow shot) | **Seedance** |

**Workflow per shot:** generate the still → image-to-video with the chosen camera
model → review → regenerate the 1–2 weak clips (not the whole set) → export at
highest res → assemble → overlay logo/captions/music.

---

## 7. CREDIT-SAVING ORDER OF OPERATIONS
1. Generate **Shot 01 still** first and lock the café "world" look you like.
2. Reuse that still's style/seed as the base for 02, 04, 05, 08 so the place is consistent.
3. Animate only after you're happy with the stills (video gens cost more than stills).
4. Make the **9:16 reel first** (the highest-ROI asset), ship it, then derive the loop
   and the long film from the same renders.
```
```
