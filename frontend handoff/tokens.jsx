// tokens.jsx — TableFlow design system: tokens + primitives
// "Saffron-Hospitality" direction. Warm neutrals, single saffron accent,
// type-forward, soft layered shadows, modern radii.

const TF_TOKENS = {
  // ── Color: warm neutrals + single saffron accent ─────────────────────────
  // Light surfaces are warm-paper, not pure white. Dark uses graphite, not
  // black, to sit better with the warm accent.
  light: {
    bg:        '#FAF8F4',  // warm paper
    surface:   '#FFFFFF',
    sunken:    '#F2EFE8',  // section bg / chip
    line:      'rgba(36,28,20,0.08)',
    lineSoft:  'rgba(36,28,20,0.05)',
    text:      '#19140E',  // near-black warm
    textMuted: 'rgba(25,20,14,0.62)',
    textFaint: 'rgba(25,20,14,0.42)',
    accent:    '#D97A2C',  // saffron
    accentInk: '#7C3F12',
    accentBg:  '#FBEED9',
    success:   '#2E8B57',
    warn:      '#C97A2C',
    danger:    '#C8392E',
  },
  dark: {
    bg:        '#15110D',
    surface:   '#1D1814',
    sunken:    '#221C17',
    line:      'rgba(255,240,220,0.08)',
    lineSoft:  'rgba(255,240,220,0.04)',
    text:      '#F5EFE6',
    textMuted: 'rgba(245,239,230,0.62)',
    textFaint: 'rgba(245,239,230,0.38)',
    accent:    '#F59A4D',
    accentInk: '#FBEED9',
    accentBg:  'rgba(217,122,44,0.16)',
    success:   '#5EBE85',
    warn:      '#E8A964',
    danger:    '#E66258',
  },
  // ── Type ─────────────────────────────────────────────────────────────────
  // Display: Fraunces is overused — using "Newsreader" (modern serif) for
  // editorial moments + "Geist" as the neutral sans. Both have strong
  // Arabic-friendly fallbacks (Noto/IBM Plex Sans Arabic) when localized.
  font: {
    display: '"Newsreader", "GT Sera", "Times New Roman", serif',
    sans:    '"Geist", "Inter Tight", -apple-system, system-ui, sans-serif',
    mono:    '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  },
  // Type scale — generous, optical
  type: {
    display: { size: 56, lh: 1.04, weight: 500, track: -1.6 },
    h1:      { size: 40, lh: 1.08, weight: 500, track: -1.0 },
    h2:      { size: 28, lh: 1.18, weight: 500, track: -0.4 },
    h3:      { size: 20, lh: 1.30, weight: 500, track: -0.2 },
    h4:      { size: 16, lh: 1.40, weight: 600, track: -0.1 },
    body:    { size: 15, lh: 1.55, weight: 400, track: 0 },
    bodyL:   { size: 17, lh: 1.55, weight: 400, track: -0.1 },
    caption: { size: 12, lh: 1.40, weight: 500, track: 0.2 },
    mono:    { size: 12, lh: 1.40, weight: 500, track: 0 },
  },
  // ── Spacing / Radius / Shadow ────────────────────────────────────────────
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  shadow: {
    // soft, layered — never harsh
    xs: '0 1px 2px rgba(36,28,20,0.04)',
    sm: '0 1px 3px rgba(36,28,20,0.06), 0 1px 2px rgba(36,28,20,0.04)',
    md: '0 2px 4px rgba(36,28,20,0.04), 0 8px 24px rgba(36,28,20,0.08)',
    lg: '0 4px 8px rgba(36,28,20,0.05), 0 16px 48px rgba(36,28,20,0.12)',
    xl: '0 8px 16px rgba(36,28,20,0.06), 0 32px 80px rgba(36,28,20,0.16)',
    inset: 'inset 0 0 0 1px rgba(36,28,20,0.06)',
  },
  // ── Motion ───────────────────────────────────────────────────────────────
  motion: {
    instant: '80ms cubic-bezier(0.2,0.7,0.3,1)',
    fast:    '180ms cubic-bezier(0.2,0.7,0.3,1)',
    base:    '240ms cubic-bezier(0.2,0.7,0.3,1)',
    slow:    '420ms cubic-bezier(0.2,0.7,0.3,1)',
    spring:  '520ms cubic-bezier(0.34,1.36,0.64,1)',  // overshoot, for cart slide
    ease: {
      out:    'cubic-bezier(0.2,0.7,0.3,1)',
      inOut:  'cubic-bezier(0.5,0,0.2,1)',
      spring: 'cubic-bezier(0.34,1.36,0.64,1)',
    },
  },
};

// Helper: resolve current theme tokens
const useTheme = (dark) => dark ? TF_TOKENS.dark : TF_TOKENS.light;

// ── Inject base font + reset ────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('tf-fonts')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';
  link.id = 'tf-fonts';
  document.head.appendChild(link);

  const s = document.createElement('style');
  s.textContent = `
    :root {
      --tf-accent: #D97A2C;
      --tf-accent-ink: #7C3F12;
      --tf-accent-bg: #FBEED9;
      --tf-accent-glow: rgba(217,122,44,0.32);
    }
    .tf * { box-sizing: border-box; }
    .tf { font-family: ${TF_TOKENS.font.sans}; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-feature-settings: "ss01", "cv11"; }
    .tf .display { font-family: ${TF_TOKENS.font.display}; font-style: italic; }
    .tf-mono { font-family: ${TF_TOKENS.font.mono}; }
    .tf button { font-family: inherit; }
    .tf input, .tf textarea { font-family: inherit; }
    @keyframes tf-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
    @keyframes tf-pulse-ring { 0% { transform: scale(0.9); opacity: 0.7 } 100% { transform: scale(2.2); opacity: 0 } }
    @keyframes tf-shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
    @keyframes tf-sheet-up { 0% { transform: translateY(110%) } 100% { transform: translateY(0) } }
    @keyframes tf-fade { 0% { opacity: 0 } 100% { opacity: 1 } }
    @keyframes tf-rise { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
    @keyframes tf-tick-fill { 0% { stroke-dashoffset: 24 } 100% { stroke-dashoffset: 0 } }
    @keyframes tf-bump-flash { 0% { background: rgba(166,245,98,0.0) } 30% { background: rgba(166,245,98,0.35) } 100% { background: rgba(166,245,98,0) } }
    @keyframes tf-new-pop { 0% { transform: scale(0.94); opacity: 0 } 60% { transform: scale(1.02); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
    @keyframes tf-late-throb { 0%,100% { box-shadow: 0 0 0 0 rgba(232,76,68,0) } 50% { box-shadow: 0 0 0 6px rgba(232,76,68,0.18) } }
    @keyframes tf-sweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
    @keyframes tf-stagger-in { 0% { opacity: 0; transform: translateY(12px) } 100% { opacity: 1; transform: translateY(0) } }
    @keyframes tf-scale-in { 0% { opacity: 0; transform: scale(0.96) } 100% { opacity: 1; transform: scale(1) } }
    @keyframes tf-slide-r { 0% { opacity: 0; transform: translateX(-12px) } 100% { opacity: 1; transform: translateX(0) } }
    @keyframes tf-slide-l { 0% { opacity: 0; transform: translateX(12px) } 100% { opacity: 1; transform: translateX(0) } }
    @keyframes tf-bar-grow { 0% { transform: scaleY(0); transform-origin: bottom } 100% { transform: scaleY(1); transform-origin: bottom } }
    @keyframes tf-progress-grow { 0% { transform: scaleX(0); transform-origin: left } 100% { transform: scaleX(1); transform-origin: left } }
    @keyframes tf-glow-pulse { 0%,100% { box-shadow: 0 0 0 0 var(--tf-accent-glow) } 50% { box-shadow: 0 0 0 8px transparent } }
    @keyframes tf-spin-slow { 0% { transform: rotate(0) } 100% { transform: rotate(360deg) } }
    @keyframes tf-ripple { 0% { transform: scale(1); opacity: 0.4 } 100% { transform: scale(2.4); opacity: 0 } }
    @keyframes tf-count-up { 0% { opacity: 0; filter: blur(4px); transform: translateY(6px) } 100% { opacity: 1; filter: blur(0); transform: translateY(0) } }
    @keyframes tf-tab-ind { 0% { transform: scaleX(0) } 100% { transform: scaleX(1) } }
    .tf [data-stagger] > * { opacity: 0; animation: tf-stagger-in 480ms cubic-bezier(0.2,0.7,0.3,1) forwards; }
    .tf [data-stagger] > *:nth-child(1) { animation-delay: 40ms }
    .tf [data-stagger] > *:nth-child(2) { animation-delay: 90ms }
    .tf [data-stagger] > *:nth-child(3) { animation-delay: 140ms }
    .tf [data-stagger] > *:nth-child(4) { animation-delay: 190ms }
    .tf [data-stagger] > *:nth-child(5) { animation-delay: 240ms }
    .tf [data-stagger] > *:nth-child(6) { animation-delay: 290ms }
    .tf [data-stagger] > *:nth-child(7) { animation-delay: 340ms }
    .tf [data-stagger] > *:nth-child(8) { animation-delay: 390ms }
    .tf [data-hover-lift] { transition: transform 220ms cubic-bezier(0.2,0.7,0.3,1), box-shadow 220ms cubic-bezier(0.2,0.7,0.3,1) }
    .tf [data-hover-lift]:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(36,28,20,0.10), 0 2px 6px rgba(36,28,20,0.06) }
    .tf [data-press]:active { transform: scale(0.97); transition: transform 80ms }
    @media (prefers-reduced-motion: reduce) {
      .tf *, .tf *::before, .tf *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(s);
}

// ── Primitives ──────────────────────────────────────────────────────────────

function TFButton({ children, variant = 'primary', size = 'md', dark = false, onClick, style = {}, leading, trailing, full = false }) {
  const t = useTheme(dark);
  const sizes = {
    sm: { h: 32, px: 12, fs: 13 },
    md: { h: 44, px: 18, fs: 15 },
    lg: { h: 52, px: 22, fs: 16 },
  };
  const s = sizes[size];
  const variants = {
    primary: { bg: t.accent, fg: '#FFFFFF', bd: t.accent, sh: '0 1px 2px rgba(217,122,44,0.32), 0 4px 12px rgba(217,122,44,0.20)' },
    secondary: { bg: t.surface, fg: t.text, bd: t.line, sh: TF_TOKENS.shadow.sm },
    ghost: { bg: 'transparent', fg: t.text, bd: 'transparent', sh: 'none' },
    danger: { bg: t.surface, fg: t.danger, bd: t.line, sh: TF_TOKENS.shadow.sm },
  };
  const v = variants[variant];
  return (
    <button onClick={onClick}
      style={{
        height: s.h, padding: `0 ${s.px}px`, borderRadius: TF_TOKENS.radius.md,
        background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
        boxShadow: v.sh, fontSize: s.fs, fontWeight: 500, letterSpacing: -0.1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', transition: `all ${TF_TOKENS.motion.fast}`,
        width: full ? '100%' : undefined,
        ...style,
      }}>
      {leading}{children}{trailing}
    </button>
  );
}

function TFBadge({ children, tone = 'default', dark = false, dot = false, style = {} }) {
  const t = useTheme(dark);
  const tones = {
    default: { bg: t.sunken, fg: t.textMuted },
    accent:  { bg: t.accentBg, fg: t.accentInk },
    success: { bg: dark ? 'rgba(94,190,133,0.16)' : '#E6F4EC', fg: dark ? '#5EBE85' : '#1F6B43' },
    warn:    { bg: dark ? 'rgba(232,169,100,0.16)' : '#FBEED9', fg: dark ? '#E8A964' : '#7C3F12' },
    danger:  { bg: dark ? 'rgba(230,98,88,0.16)' : '#FBE6E3', fg: dark ? '#E66258' : '#8E2218' },
  };
  const c = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: TF_TOKENS.radius.pill,
      background: c.bg, color: c.fg,
      fontSize: 12, fontWeight: 500, letterSpacing: 0.1,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: c.fg }} />}
      {children}
    </span>
  );
}

function TFCard({ children, dark = false, style = {}, padded = true, onClick }) {
  const t = useTheme(dark);
  return (
    <div onClick={onClick} style={{
      background: t.surface, borderRadius: TF_TOKENS.radius.lg,
      border: `1px solid ${t.line}`, boxShadow: TF_TOKENS.shadow.sm,
      padding: padded ? 20 : 0, ...style,
    }}>{children}</div>
  );
}

function TFInput({ value, onChange, placeholder, dark = false, leading, style = {} }) {
  const t = useTheme(dark);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      height: 44, padding: '0 14px',
      background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: TF_TOKENS.radius.md, ...style,
    }}>
      {leading && <span style={{ color: t.textMuted, display: 'flex' }}>{leading}</span>}
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
          color: t.text, fontSize: 15, letterSpacing: -0.1 }} />
    </div>
  );
}

// Lucide-ish line icons (we don't have lucide-react; trace stroke icons)
function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }) {
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const I = {
    qr:        <><rect x="3" y="3" width="7" height="7" {...p}/><rect x="14" y="3" width="7" height="7" {...p}/><rect x="3" y="14" width="7" height="7" {...p}/><path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" {...p}/></>,
    plus:      <><path d="M12 5v14M5 12h14" {...p}/></>,
    minus:     <><path d="M5 12h14" {...p}/></>,
    chevron:   <><path d="M9 6l6 6-6 6" {...p}/></>,
    chevronL:  <><path d="M15 6l-6 6 6 6" {...p}/></>,
    chevronD:  <><path d="M6 9l6 6 6-6" {...p}/></>,
    bag:       <><path d="M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8zM9 8V6a3 3 0 0 1 6 0v2" {...p}/></>,
    bell:      <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0" {...p}/></>,
    bell_ring: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0M22 4l-2 2M2 4l2 2" {...p}/></>,
    receipt:   <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" {...p}/></>,
    search:    <><circle cx="11" cy="11" r="7" {...p}/><path d="M20 20l-3.5-3.5" {...p}/></>,
    leaf:      <><path d="M11 20A7 7 0 0 1 9.8 6.1C15 5 17 4 19 2c1 6 0 17-8 18zM2 22s.6-3 6-7" {...p}/></>,
    flame:     <><path d="M8 14a4 4 0 0 0 8 0c0-3-2-3-2-7 0 0-4 1-4 5-1 0-2-1-2-2-1 1-2 2-2 4a4 4 0 0 0 2 4z" {...p}/></>,
    clock:     <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 7v5l3 2" {...p}/></>,
    check:     <><path d="M5 12l5 5L20 7" {...p}/></>,
    user:      <><circle cx="12" cy="8" r="4" {...p}/><path d="M4 21a8 8 0 0 1 16 0" {...p}/></>,
    map:       <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16" {...p}/></>,
    arrow_r:   <><path d="M5 12h14M13 6l6 6-6 6" {...p}/></>,
    arrow_dr:  <><path d="M7 7l10 10M7 17V7h10" {...p}/></>,
    sparkles:  <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" {...p}/></>,
    table:     <><rect x="3" y="5" width="18" height="14" rx="2" {...p}/><path d="M3 10h18M9 5v14" {...p}/></>,
    waiter:    <><circle cx="12" cy="6" r="3" {...p}/><path d="M5 21l2-7h10l2 7M9 14V11h6v3" {...p}/></>,
    star:      <><path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14 3 9.5 9.5 9z" {...p}/></>,
    info:      <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 8v.5M12 11v5" {...p}/></>,
    lang:      <><circle cx="12" cy="12" r="9" {...p}/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" {...p}/></>,
    snow:      <><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" {...p}/></>,
    pan:       <><path d="M3 10h14a3 3 0 0 1 0 6h-2l-1 5H6l-1-5H4a3 3 0 0 1 0-6zM20 7c1 1 1 2 0 3" {...p}/></>,
    pass:      <><path d="M4 12h16M4 8h16M4 16h10" {...p}/></>,
    timer:     <><circle cx="12" cy="13" r="8" {...p}/><path d="M12 9v4l2 1M9 2h6" {...p}/></>,
    mic:       <><rect x="9" y="3" width="6" height="12" rx="3" {...p}/><path d="M5 12a7 7 0 0 0 14 0M12 19v3" {...p}/></>,
    grip:      <><circle cx="9" cy="6" r="1" fill={color}/><circle cx="9" cy="12" r="1" fill={color}/><circle cx="9" cy="18" r="1" fill={color}/><circle cx="15" cy="6" r="1" fill={color}/><circle cx="15" cy="12" r="1" fill={color}/><circle cx="15" cy="18" r="1" fill={color}/></>,
    play:      <><path d="M7 4l13 8-13 8z" {...p}/></>,
    pause:     <><path d="M7 4v16M17 4v16" {...p}/></>,
    refresh:   <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4" {...p}/></>,
    bolt:      <><path d="M13 2L3 14h7l-1 8 10-12h-7z" {...p}/></>,
    hash:      <><path d="M5 9h14M5 15h14M9 4l-2 16M17 4l-2 16" {...p}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>{I[name]}</svg>;
}

Object.assign(window, { TF_TOKENS, useTheme, TFButton, TFBadge, TFCard, TFInput, Icon });
