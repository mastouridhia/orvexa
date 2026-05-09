// system-screens.jsx — Design system showcase artboards
// Tokens · Type · Color · Spacing/Radius/Shadow · Motion · Components

const SYS_BG = '#FAF8F4';
const SYS_INK = '#19140E';
const SYS_MUT = 'rgba(25,20,14,0.6)';
const SYS_FAINT = 'rgba(25,20,14,0.4)';
const SYS_LINE = 'rgba(36,28,20,0.08)';

function SysFrame({ children, eyebrow, title, sub }) {
  return (
    <div className="tf" style={{ width: '100%', height: '100%', background: SYS_BG, color: SYS_INK, padding: 56, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: SYS_FAINT, textTransform: 'uppercase', marginBottom: 14 }}>{eyebrow}</div>
          <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: -1.2, lineHeight: 1.05 }}>
            {title}
          </div>
          {sub && <div style={{ fontSize: 16, color: SYS_MUT, marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>{sub}</div>}
        </div>
        <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: SYS_FAINT, textTransform: 'uppercase' }}>
          DMOS · v0.1
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function SysCover() {
  return (
    <div className="tf" style={{ width: '100%', height: '100%', background: '#19140E', color: '#F5EFE6', padding: 56, position: 'relative', overflow: 'hidden' }}>
      <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: 'rgba(245,239,230,0.5)', textTransform: 'uppercase', marginBottom: 24 }}>
        TableFlow / DMOS · 2026 redesign
      </div>
      <div style={{ position: 'absolute', top: 56, right: 56, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(245,239,230,0.5)' }} className="tf-mono">
        <span style={{ width: 6, height: 6, borderRadius: 3, background: '#D97A2C' }} />
        DRAFT
      </div>

      <div style={{ position: 'absolute', left: 56, bottom: 56, right: 56 }}>
        <div className="display" style={{ fontSize: 180, fontWeight: 400, lineHeight: 0.9, letterSpacing: -6, marginBottom: 8 }}>
          Table<span style={{ color: '#D97A2C' }}>flow</span>.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(245,239,230,0.12)' }}>
          <div style={{ fontSize: 18, color: 'rgba(245,239,230,0.7)', maxWidth: 480, lineHeight: 1.45, letterSpacing: -0.2 }}>
            A QR-first ordering platform for Tunisian restaurants. Five surfaces, one design system, no shortcuts.
          </div>
          <div className="tf-mono" style={{ fontSize: 11, color: 'rgba(245,239,230,0.5)', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'right' }}>
            Design system<br/>+ Customer app prototype
          </div>
        </div>
      </div>

      {/* corner index marks */}
      <div className="tf-mono" style={{ position: 'absolute', top: 56, right: 200, fontSize: 11, letterSpacing: 1.4, color: 'rgba(245,239,230,0.4)', textTransform: 'uppercase' }}>
        00 · cover
      </div>
    </div>
  );
}

// ── Color tokens ────────────────────────────────────────────────────────────
function SysColor() {
  const swatches = [
    { name: 'paper', hex: '#FAF8F4', role: 'app bg', ink: '#19140E' },
    { name: 'surface', hex: '#FFFFFF', role: 'cards', ink: '#19140E' },
    { name: 'sunken', hex: '#F2EFE8', role: 'sections', ink: '#19140E' },
    { name: 'ink', hex: '#19140E', role: 'text', ink: '#FAF8F4' },
    { name: 'muted', hex: '#7A6E60', role: 'secondary', ink: '#FAF8F4' },
    { name: 'line', hex: '#E8E2D7', role: 'borders', ink: '#19140E' },
  ];
  const accent = [
    { name: 'accent / 50', hex: '#FBEED9', ink: '#7C3F12' },
    { name: 'accent / 200', hex: '#F2C994', ink: '#7C3F12' },
    { name: 'accent / 500', hex: '#D97A2C', ink: '#FFFFFF' },
    { name: 'accent / 700', hex: '#A8561A', ink: '#FFFFFF' },
    { name: 'accent / 900', hex: '#3D1E08', ink: '#FBEED9' },
  ];
  const status = [
    { name: 'success', hex: '#2E8B57', ink: '#fff' },
    { name: 'warn', hex: '#C97A2C', ink: '#fff' },
    { name: 'danger', hex: '#C8392E', ink: '#fff' },
    { name: 'info', hex: '#3D6E8C', ink: '#fff' },
  ];

  const dark = [
    { name: 'bg', hex: '#15110D' },
    { name: 'surface', hex: '#1D1814' },
    { name: 'sunken', hex: '#221C17' },
    { name: 'ink', hex: '#F5EFE6' },
    { name: 'accent', hex: '#F59A4D' },
  ];

  const Swatch = ({ s, big = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        height: big ? 120 : 80, borderRadius: 12, background: s.hex,
        boxShadow: 'inset 0 0 0 1px rgba(25,20,14,0.14)',
        position: 'relative', overflow: 'hidden',
      }}>
        {s.role && <span style={{ position: 'absolute', bottom: 10, left: 12, color: s.ink, fontSize: 11, opacity: 0.7 }} className="tf-mono">{s.role}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{s.name}</span>
        <span className="tf-mono" style={{ color: SYS_FAINT }}>{s.hex.toUpperCase()}</span>
      </div>
    </div>
  );

  return (
    <SysFrame eyebrow="01 · Color" title={<>One confident accent. <span className="display" style={{ fontStyle: 'italic', color: '#D97A2C' }}>Saffron.</span></>} sub="Saffron-amber, food-coded but not literal. North-African sunlight without the cliché terracotta. Warm-paper neutrals replace stock white; warm graphite replaces black.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 24, marginBottom: 32 }}>
        {swatches.map((s) => <Swatch key={s.name} s={s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 32 }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: SYS_FAINT, textTransform: 'uppercase', marginBottom: 14 }}>Accent · saffron</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {accent.map((s) => <Swatch key={s.name} s={s} />)}
          </div>
        </div>
        <div>
          <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: SYS_FAINT, textTransform: 'uppercase', marginBottom: 14 }}>Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {status.map((s) => <Swatch key={s.name} s={s} />)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 24, background: '#15110D', borderRadius: 16, color: '#F5EFE6' }}>
        <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, color: 'rgba(245,239,230,0.5)', textTransform: 'uppercase', marginBottom: 14 }}>Dark · operator surfaces</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {dark.map((s) => (
            <div key={s.name}>
              <div style={{ height: 56, borderRadius: 10, background: s.hex, border: '1px solid rgba(255,240,220,0.06)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
                <span>{s.name}</span>
                <span className="tf-mono" style={{ color: 'rgba(245,239,230,0.5)' }}>{s.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SysFrame>
  );
}

// ── Type ────────────────────────────────────────────────────────────────────
function SysType() {
  const rows = [
    { name: 'Display / 56', size: 56, lh: 1.04, weight: 500, track: -1.6, sample: 'Hospitality is a system.', display: true },
    { name: 'H1 / 40', size: 40, lh: 1.08, weight: 500, track: -1.0, sample: 'Five surfaces, one rhythm.' },
    { name: 'H2 / 28', size: 28, lh: 1.18, weight: 500, track: -0.4, sample: 'A menu is not a list.' },
    { name: 'H3 / 20', size: 20, lh: 1.30, weight: 500, track: -0.2, sample: 'Section header — Mains' },
    { name: 'Body L / 17', size: 17, lh: 1.55, weight: 400, track: -0.1, sample: 'Slow-cooked lamb shoulder, harissa, preserved lemon, almond couscous. Ready in 30–35 min.' },
    { name: 'Body / 15', size: 15, lh: 1.55, weight: 400, track: 0, sample: 'A confident default. Reads well from 1m on the kitchen display, comfortable on a phone in the dim of a candle-lit table.' },
    { name: 'Caption / 12', size: 12, lh: 1.4, weight: 500, track: 0.2, sample: 'TABLE 14 · ORDER #2406-A', mono: true },
  ];
  return (
    <SysFrame eyebrow="02 · Type" title={<><span className="display" style={{ fontStyle: 'italic' }}>Newsreader</span> + Geist.</>} sub={<>One italic serif for editorial moments — section openers, prices, restaurant names. One precise sans for the rest. Arabic localizes to <em>IBM Plex Sans Arabic</em>; Latin numerals retained for prices.</>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {rows.map((r) => (
          <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 32, alignItems: 'baseline', paddingBottom: 18, borderBottom: `1px solid ${SYS_LINE}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
              <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, marginTop: 4 }}>
                {r.weight} · {r.track > 0 ? '+' : ''}{r.track}px · {r.lh}
              </div>
            </div>
            <div className={r.mono ? 'tf-mono' : (r.display ? 'display' : '')}
              style={{ fontSize: r.size, lineHeight: r.lh, fontWeight: r.weight, letterSpacing: r.track, fontStyle: r.display ? 'italic' : 'normal' }}>
              {r.sample}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: 20, background: '#F2EFE8', borderRadius: 12, display: 'flex', gap: 32, alignItems: 'center' }}>
        <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4 }}>Numerals</div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums' }}>42.500</div>
            <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, marginTop: 2 }}>tabular · prices</div>
          </div>
          <div>
            <div className="display" style={{ fontSize: 36, fontStyle: 'italic', fontWeight: 500, letterSpacing: -0.4 }}>42.500</div>
            <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, marginTop: 2 }}>editorial · totals</div>
          </div>
          <div>
            <div className="tf-mono" style={{ fontSize: 28, fontWeight: 500 }}>#2406-A</div>
            <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, marginTop: 2 }}>mono · order ids</div>
          </div>
        </div>
      </div>
    </SysFrame>
  );
}

// ── Spacing / Radius / Shadow ───────────────────────────────────────────────
function SysSpace() {
  const space = [4, 8, 12, 16, 20, 24, 32, 40, 56, 72];
  const radii = [
    { n: 'sm', v: 8 }, { n: 'md', v: 12 }, { n: 'lg', v: 16 }, { n: 'xl', v: 24 }, { n: 'pill', v: 999 },
  ];
  const shadows = [
    { n: 'sm', s: '0 1px 3px rgba(36,28,20,0.06), 0 1px 2px rgba(36,28,20,0.04)' },
    { n: 'md', s: '0 2px 4px rgba(36,28,20,0.04), 0 8px 24px rgba(36,28,20,0.08)' },
    { n: 'lg', s: '0 4px 8px rgba(36,28,20,0.05), 0 16px 48px rgba(36,28,20,0.12)' },
    { n: 'xl', s: '0 8px 16px rgba(36,28,20,0.06), 0 32px 80px rgba(36,28,20,0.16)' },
  ];
  return (
    <SysFrame eyebrow="03 · Spacing · Radius · Shadow" title="Soft depth. No harsh borders." sub="A 4px base. Three radii do most work — 12 (controls), 16 (cards), 24 (sheets/modals). Shadows always layered: a tight 1px keyline + a wide diffuse halo.">
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 40 }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Spacing scale · 4px base</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {space.map((v) => (
              <div key={v} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16, alignItems: 'center' }}>
                <span className="tf-mono" style={{ fontSize: 12, color: SYS_MUT }}>{v}px</span>
                <div style={{ height: 14, width: v * 4, background: '#D97A2C', borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Radii</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
            {radii.map((r) => (
              <div key={r.n} style={{ textAlign: 'center' }}>
                <div style={{ height: 64, background: '#F2EFE8', border: `1px solid ${SYS_LINE}`, borderRadius: r.v }} />
                <div style={{ fontSize: 12, marginTop: 6, fontWeight: 500 }}>{r.n}</div>
                <div className="tf-mono" style={{ fontSize: 10, color: SYS_FAINT }}>{r.v === 999 ? '∞' : r.v + 'px'}</div>
              </div>
            ))}
          </div>

          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Shadows</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {shadows.map((sh) => (
              <div key={sh.n} style={{ textAlign: 'center' }}>
                <div style={{ height: 64, background: '#fff', borderRadius: 12, boxShadow: sh.s }} />
                <div style={{ fontSize: 12, marginTop: 10, fontWeight: 500 }}>{sh.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Motion tokens</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { n: 'fast', t: '180ms', use: 'hover, focus, micro' },
            { n: 'base', t: '240ms', use: 'sheet open, list reorder' },
            { n: 'slow', t: '420ms', use: 'page transitions' },
            { n: 'spring', t: '520ms', use: 'cart slide-up only' },
          ].map((m) => (
            <div key={m.n} style={{ padding: 16, background: '#F2EFE8', borderRadius: 12 }}>
              <div className="tf-mono" style={{ fontSize: 24, fontWeight: 500 }}>{m.t}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{m.n}</div>
              <div style={{ fontSize: 12, color: SYS_MUT, marginTop: 2 }}>{m.use}</div>
            </div>
          ))}
        </div>
      </div>
    </SysFrame>
  );
}

// ── Components ──────────────────────────────────────────────────────────────
function SysComponents() {
  return (
    <SysFrame eyebrow="04 · Components" title="Twelve primitives." sub="Built on Radix + shadcn conventions, restyled to the system. Every primitive ships light + dark, and a 44px hit-target floor on touch surfaces.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {/* Buttons */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 16, border: `1px solid ${SYS_LINE}` }}>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Button</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <TFButton><Icon name="bag" size={16} color="#fff" /> Add to order — 24.000</TFButton>
            <TFButton variant="secondary"><Icon name="bell" size={16} /> Call waiter</TFButton>
            <TFButton variant="ghost">Cancel</TFButton>
            <TFButton size="sm" variant="secondary">Small</TFButton>
          </div>
        </div>

        {/* Badges */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 16, border: `1px solid ${SYS_LINE}` }}>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Badge</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <TFBadge>Vegetarian</TFBadge>
            <TFBadge tone="accent" dot>Chef's pick</TFBadge>
            <TFBadge tone="warn">Spicy</TFBadge>
            <TFBadge tone="success" dot>Ready</TFBadge>
            <TFBadge tone="danger">Out</TFBadge>
          </div>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, marginTop: 22, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 }}>Status pills · operator</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <TFBadge tone="default" dot>Received</TFBadge>
            <TFBadge tone="warn" dot>Preparing</TFBadge>
            <TFBadge tone="success" dot>Ready</TFBadge>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 16, border: `1px solid ${SYS_LINE}` }}>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Input</div>
          <TFInput value="" onChange={() => {}} placeholder="Search the menu" leading={<Icon name="search" size={16} />} />
          <div style={{ height: 10 }} />
          <TFInput value="harissa" onChange={() => {}} leading={<Icon name="search" size={16} />} />
        </div>

        {/* Card */}
        <div style={{ padding: 20, background: '#F2EFE8', borderRadius: 16, gridColumn: 'span 2' }}>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Menu card</div>
          <TFCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 500 }}>Lamb tagine</span>
                  <TFBadge tone="accent" dot>Chef's pick</TFBadge>
                </div>
                <div style={{ fontSize: 14, color: SYS_MUT, lineHeight: 1.5 }}>Slow-cooked, harissa, preserved lemon, almond couscous</div>
                <div style={{ fontVariantNumeric: 'tabular-nums', marginTop: 12, fontSize: 16, fontWeight: 500 }}>32.500 <span style={{ color: SYS_FAINT, fontWeight: 400, fontSize: 13 }}>TND</span></div>
              </div>
              <div style={{ width: 92, height: 92, borderRadius: 12, background: 'linear-gradient(135deg,#F2C994,#D97A2C)', flexShrink: 0 }} />
            </div>
          </TFCard>
        </div>

        {/* Empty state */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 16, border: `1px solid ${SYS_LINE}`, textAlign: 'center' }}>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 16, textAlign: 'left' }}>Empty state</div>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#F2EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px auto', color: SYS_MUT }}>
            <Icon name="bag" size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Your order is empty</div>
          <div style={{ fontSize: 13, color: SYS_MUT, marginTop: 6 }}>Browse the menu to start.</div>
        </div>

        {/* Toast */}
        <div style={{ padding: 20, background: '#19140E', borderRadius: 16, color: '#F5EFE6' }}>
          <div className="tf-mono" style={{ fontSize: 11, color: 'rgba(245,239,230,0.5)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Toast</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(245,239,230,0.06)', borderRadius: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Waiter on the way</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Yassine acknowledged · 14s</div>
            </div>
          </div>
        </div>

        {/* Skeleton */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 16, border: `1px solid ${SYS_LINE}` }}>
          <div className="tf-mono" style={{ fontSize: 11, color: SYS_FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>Skeleton</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(90deg,#EFEAE0,#F8F4EB,#EFEAE0)', backgroundSize: '400px 100%', animation: 'tf-shimmer 1.6s linear infinite' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
              <div style={{ height: 12, borderRadius: 6, background: 'linear-gradient(90deg,#EFEAE0,#F8F4EB,#EFEAE0)', backgroundSize: '400px 100%', animation: 'tf-shimmer 1.6s linear infinite', width: '60%' }} />
              <div style={{ height: 10, borderRadius: 5, background: 'linear-gradient(90deg,#EFEAE0,#F8F4EB,#EFEAE0)', backgroundSize: '400px 100%', animation: 'tf-shimmer 1.6s linear infinite' }} />
              <div style={{ height: 10, borderRadius: 5, background: 'linear-gradient(90deg,#EFEAE0,#F8F4EB,#EFEAE0)', backgroundSize: '400px 100%', animation: 'tf-shimmer 1.6s linear infinite', width: '40%' }} />
            </div>
          </div>
        </div>
      </div>
    </SysFrame>
  );
}

Object.assign(window, { SysCover, SysColor, SysType, SysSpace, SysComponents });
