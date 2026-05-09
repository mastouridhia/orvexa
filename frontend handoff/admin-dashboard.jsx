// admin-dashboard.jsx — Owner dashboard. Desktop, 1440×900.
// Leila checks this twice a day: morning prep, end of service.
// One screen, four zones: today's pulse + service health + menu + people.

const A_BG = '#FAF8F4';
const A_INK = '#19140E';
const A_SURFACE = '#FFFFFF';
const A_SUNKEN = '#F2EFE8';
const A_LINE = 'rgba(25,20,14,0.08)';
const A_LINE_SOFT = 'rgba(25,20,14,0.05)';
const A_MUT = 'rgba(25,20,14,0.6)';
const A_FAINT = 'rgba(25,20,14,0.42)';
const A_ACCENT = '#D97A2C';
const A_ACCENT_INK = '#7C3F12';
const A_ACCENT_BG = '#FBEED9';
const A_OK = '#2E8B57';
const A_DANGER = '#C8392E';
const A_GOLD = '#B89645';

// ── Service pulse — minute-by-minute through the day ────────────────────────
// Each value is "covers active in that minute". The shape tells the story:
// quiet morning → noon spike (lunch rush) → afternoon dip → dinner build.
// We're showing 09:00 → now (13:47), so 287 minutes of data, sampled to 96 bars.
function makePulseData() {
  const out = [];
  for (let i = 0; i < 96; i++) {
    const hour = 9 + (i / 96) * 4.78;
    let v;
    if (hour < 11) v = 2 + Math.sin(i * 0.2) * 1.5 + Math.random() * 2;
    else if (hour < 12) v = 6 + (hour - 11) * 12 + Math.random() * 4;
    else if (hour < 13.2) v = 38 + Math.sin((hour - 12) * 4) * 4 + Math.random() * 5;
    else v = 42 - (hour - 13.2) * 6 + Math.random() * 3;
    out.push({ idx: i, v: Math.max(0, v), hour });
  }
  return out;
}
const A_PULSE = makePulseData();

// ── Top selling — margin × velocity ─────────────────────────────────────────
const A_TOP_ITEMS = [
  { name: 'Couscous merguez',  ar: 'كسكسي مرقاز',  sold: 42, revenue: 798.0,  margin: 0.62, trend: +0.12, score: 96 },
  { name: 'Brik à l\'œuf',     ar: 'بريك بالبيض',  sold: 68, revenue: 408.0,  margin: 0.74, trend: +0.04, score: 92 },
  { name: 'Loup de mer grillé', ar: 'سمك الذئب',    sold: 18, revenue: 540.0,  margin: 0.48, trend: -0.06, score: 78 },
  { name: 'Salade méchouia',   ar: 'سلاطة مشوية',  sold: 51, revenue: 357.0,  margin: 0.81, trend: +0.18, score: 88 },
  { name: 'Café Turc',         ar: 'قهوة تركية',   sold: 94, revenue: 282.0,  margin: 0.86, trend: +0.02, score: 84 },
  { name: 'Pastilla aux fruits de mer', ar: 'بسطيلة', sold: 9,  revenue: 270.0,  margin: 0.41, trend: -0.22, score: 52 },
];

// ── Staff today ─────────────────────────────────────────────────────────────
const A_STAFF = [
  { name: 'Yassine', role: 'Server',  tables: 8, covers: 23, sales: 612.5, tips: 89.0,  rating: 4.9, avatar: 'Y', status: 'on' },
  { name: 'Inès',    role: 'Server',  tables: 6, covers: 18, sales: 488.0, tips: 64.5,  rating: 4.7, avatar: 'I', status: 'on' },
  { name: 'Karim',   role: 'Server',  tables: 5, covers: 22, sales: 720.0, tips: 102.0, rating: 4.8, avatar: 'K', status: 'on' },
  { name: 'Selma',   role: 'Kitchen', tables: 0, covers: 63, sales: null,  tips: null,  rating: null, avatar: 'S', status: 'on' },
  { name: 'Rami',    role: 'Bar',     tables: 0, covers: 48, sales: 198.0, tips: 22.0,  rating: null, avatar: 'R', status: 'break' },
];

// ── Right-now feed ──────────────────────────────────────────────────────────
const A_NOW = [
  { type: 'call',    table: 16, msg: 'Asked for the bill',         age: '2m', sev: 'high' },
  { type: 'ready',   table: 4,  msg: 'Mains ready to pass',         age: '1m', sev: 'mid' },
  { type: 'cooking', table: 18, msg: 'Pastilla running long',       age: '28m', sev: 'high' },
  { type: 'seated',  table: 9,  msg: 'New party · 2 covers',        age: '4m', sev: 'low' },
  { type: 'paid',    table: 6,  msg: '€38.00 · 18% tip',             age: '6m', sev: 'low' },
  { type: 'review',  table: 3,  msg: 'Review submitted · ★★★★★',   age: '12m', sev: 'low' },
];

// ── KPI primitive ───────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [v, setV] = React.useState(0);
  const numericTarget = typeof target === 'number' ? target : parseFloat(String(target).replace(/[^\d.-]/g, '')) || 0;
  React.useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(numericTarget * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [numericTarget]);
  return v;
}

function KPI({ label, value, unit, delta, deltaLabel, big }) {
  const up = delta > 0;
  // parse a display value, count up the number, preserve formatting (€, k separators, decimals)
  const match = String(value).match(/^([^\d-]*)([-\d,\.]+)([^\d]*)$/);
  const prefix = match ? match[1] : '';
  const numStr = match ? match[2] : '0';
  const suffix = match ? match[3] : '';
  const target = parseFloat(numStr.replace(/,/g, '')) || 0;
  const decimals = (numStr.split('.')[1] || '').length;
  const v = useCountUp(target, 1100);
  const formatted = v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <div data-hover-lift style={{ padding: big ? 24 : 18, background: A_SURFACE, border: `1px solid ${A_LINE}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: big ? 10 : 6, animation: 'tf-stagger-in 520ms cubic-bezier(0.2,0.7,0.3,1) both' }}>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: A_FAINT, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: big ? 44 : 32, fontWeight: 500, letterSpacing: -1.2, color: A_INK, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{prefix}{formatted}{suffix}</span>
        {unit && <span style={{ fontSize: big ? 16 : 13, color: A_FAINT, fontWeight: 500 }}>{unit}</span>}
      </div>
      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: up ? A_OK : A_DANGER, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{up ? '↗' : '↘'} {Math.abs(delta * 100).toFixed(0)}%</span>
          <span style={{ color: A_FAINT }}>{deltaLabel || 'vs yesterday'}</span>
        </div>
      )}
    </div>
  );
}

// ── Service pulse chart ─────────────────────────────────────────────────────
function ServicePulse() {
  const max = Math.max(...A_PULSE.map(p => p.v));
  const nowIdx = A_PULSE.length - 1;
  return (
    <div style={{ padding: 24, background: A_SURFACE, border: `1px solid ${A_LINE}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 16, animation: 'tf-rise 560ms cubic-bezier(0.2,0.7,0.3,1) 120ms both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: A_FAINT, textTransform: 'uppercase' }}>Service pulse · today</div>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.6, marginTop: 4 }}>
            Lunch rush <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>peaked at 12:48</span>
          </div>
          <div style={{ fontSize: 13, color: A_MUT, marginTop: 2 }}>42 covers in 6 minutes — your highest 6-min in two weeks.</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['1H', '6H', 'TODAY', '7D', '30D'].map((t, i) => (
            <button key={t} style={{ height: 30, padding: '0 12px', borderRadius: 15, border: `1px solid ${i === 2 ? A_INK : A_LINE}`, background: i === 2 ? A_INK : 'transparent', color: i === 2 ? A_BG : A_INK, fontSize: 11, fontWeight: 500, letterSpacing: 0.6, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
        {/* y-axis tick lines */}
        {[0.25, 0.5, 0.75, 1].map(p => (
          <div key={p} style={{ position: 'absolute', left: 0, right: 0, bottom: `${p * 100}%`, height: 1, background: A_LINE_SOFT, pointerEvents: 'none' }} />
        ))}
        {A_PULSE.map((p, i) => {
          const h = (p.v / max) * 170;
          const isNow = i === nowIdx;
          const isPeak = p.v > max * 0.9;
          return (
            <div key={i} style={{
              flex: 1,
              height: h,
              background: isNow ? A_INK : isPeak ? A_ACCENT : (p.v < 8 ? '#E5DFD2' : '#C9C0AB'),
              borderRadius: 1.5,
              transition: 'all 200ms',
              minHeight: 2,
              transformOrigin: 'bottom',
              animation: `tf-bar-grow 720ms cubic-bezier(0.2,0.7,0.3,1) ${i * 8}ms both`,
            }} />
          );
        })}
        {/* now marker */}
        <div style={{ position: 'absolute', right: '0%', bottom: 0, top: 0, width: 1, background: A_INK, opacity: 0.3 }} />
        <div className="tf-mono" style={{ position: 'absolute', right: -2, top: -18, fontSize: 9, letterSpacing: 1.2, color: A_INK, background: A_BG, padding: '1px 4px', textTransform: 'uppercase' }}>NOW · 13:47</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: A_FAINT }} className="tf-mono">
        <span>09:00</span><span>10:30</span><span>12:00</span><span>13:30</span>
      </div>

      <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: `1px solid ${A_LINE}` }}>
        {[
          ['Covers',   '142', '+12% '],
          ['Avg ticket', '€26.40', '+€2.10'],
          ['Revenue', '€3,748', '+€420'],
          ['Avg dwell', '47m', '−3m'],
        ].map(([k, v, d]) => (
          <div key={k} style={{ flex: 1 }}>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: A_FAINT, textTransform: 'uppercase' }}>{k}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.4, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            <div style={{ fontSize: 11, color: d.startsWith('-') || d.startsWith('−') ? A_DANGER : A_OK, marginTop: 2 }}>{d} vs yesterday</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Menu performance ────────────────────────────────────────────────────────
function MenuPerf() {
  const sorted = [...A_TOP_ITEMS].sort((a, b) => b.score - a.score);
  return (
    <div style={{ padding: 24, background: A_SURFACE, border: `1px solid ${A_LINE}`, borderRadius: 14, animation: 'tf-rise 600ms cubic-bezier(0.2,0.7,0.3,1) 240ms both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: A_FAINT, textTransform: 'uppercase' }}>Menu · ranked by margin × velocity</div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.4, marginTop: 4 }}>
            Brik is <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>moving</span>. Pastilla is not.
          </div>
        </div>
        <button style={{ height: 30, padding: '0 14px', borderRadius: 15, border: `1px solid ${A_LINE}`, background: 'transparent', fontSize: 12, fontWeight: 500, color: A_INK, cursor: 'pointer' }}>Edit menu →</button>
      </div>
      <div data-stagger>
        {sorted.map((it, i) => (
          <div key={it.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 64px 80px 70px 100px', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${A_LINE_SOFT}` }}>
            <span className="tf-mono" style={{ fontSize: 11, color: A_FAINT, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.4 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: A_INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
              <div dir="rtl" style={{ fontSize: 11, color: A_FAINT, fontFamily: 'system-ui', marginTop: 1 }}>{it.ar}</div>
            </span>
            <span className="tf-mono" style={{ fontSize: 13, color: A_INK, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{it.sold}×</span>
            <span className="tf-mono" style={{ fontSize: 13, color: A_INK, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>€{it.revenue.toFixed(0)}</span>
            <span style={{ fontSize: 12, color: it.trend > 0 ? A_OK : A_DANGER, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {it.trend > 0 ? '↗' : '↘'} {Math.abs(it.trend * 100).toFixed(0)}%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: A_SUNKEN, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${it.score}%`, height: '100%', background: it.score > 80 ? A_OK : it.score > 60 ? A_ACCENT : A_DANGER, borderRadius: 2, animation: `tf-progress-grow 900ms cubic-bezier(0.2,0.7,0.3,1) ${300 + i * 60}ms both` }} />
              </div>
              <span className="tf-mono" style={{ fontSize: 11, color: A_MUT, fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'right' }}>{it.score}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right-now sidebar ───────────────────────────────────────────────────────
function RightNow() {
  return (
    <div style={{ padding: 20, background: A_INK, color: A_BG, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, animation: 'tf-slide-l 600ms cubic-bezier(0.2,0.7,0.3,1) 180ms both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.6 }}>Right now</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: A_OK, animation: 'tf-late-throb 1.6s ease-in-out infinite' }} />
          <span className="tf-mono" style={{ letterSpacing: 1.2, opacity: 0.7 }}>LIVE</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          ['On floor', '14', '/22'],
          ['Calls', '2', null],
          ['Ready', '1', null],
        ].map(([k, v, sub]) => (
          <div key={k} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <div className="tf-mono" style={{ fontSize: 9, letterSpacing: 1.4, opacity: 0.5, textTransform: 'uppercase' }}>{k}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.4, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {v}{sub && <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div data-stagger style={{ display: 'flex', flexDirection: 'column' }}>
        {A_NOW.map((n, i) => {
          const dot = n.sev === 'high' ? A_DANGER : n.sev === 'mid' ? A_ACCENT : 'rgba(250,248,244,0.4)';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(250,248,244,0.08)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: dot, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>T-{n.table} <span style={{ opacity: 0.6, fontWeight: 400 }}>· {n.msg}</span></div>
              </span>
              <span className="tf-mono" style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1.2 }}>{n.age}</span>
            </div>
          );
        })}
      </div>

      <button style={{ height: 36, borderRadius: 18, border: '1px solid rgba(250,248,244,0.2)', background: 'transparent', color: A_BG, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Open floor →</button>
    </div>
  );
}

// ── Staff leaderboard ───────────────────────────────────────────────────────
function StaffBoard() {
  const sorted = [...A_STAFF].sort((a, b) => (b.sales || 0) - (a.sales || 0));
  return (
    <div style={{ padding: 24, background: A_SURFACE, border: `1px solid ${A_LINE}`, borderRadius: 14, animation: 'tf-rise 600ms cubic-bezier(0.2,0.7,0.3,1) 320ms both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: A_FAINT, textTransform: 'uppercase' }}>People · today</div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.4, marginTop: 4 }}>5 on shift</div>
        </div>
        <button style={{ height: 30, padding: '0 14px', borderRadius: 15, border: `1px solid ${A_LINE}`, background: 'transparent', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Schedule →</button>
      </div>
      <div data-stagger>{sorted.map((s, i) => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${A_LINE_SOFT}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: i === 0 ? A_GOLD : A_SUNKEN, color: i === 0 ? '#fff' : A_INK, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
            {s.avatar}
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, background: s.status === 'on' ? A_OK : A_ACCENT, border: `2px solid ${A_SURFACE}` }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: A_INK }}>{s.name} <span style={{ color: A_FAINT, fontWeight: 400 }}>· {s.role}</span></div>
            <div style={{ fontSize: 11, color: A_FAINT, marginTop: 1 }}>
              {s.tables > 0 ? `${s.tables} tables · ${s.covers} covers` : `${s.covers} covers`}
            </div>
          </span>
          {s.sales !== null ? (
            <span style={{ textAlign: 'right' }}>
              <div className="tf-mono" style={{ fontSize: 14, color: A_INK, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>€{s.sales.toFixed(0)}</div>
              <div style={{ fontSize: 11, color: A_FAINT, marginTop: 1 }}>+€{s.tips.toFixed(0)} tips</div>
            </span>
          ) : (
            <span style={{ fontSize: 11, color: A_FAINT, textAlign: 'right' }}>—</span>
          )}
          {s.rating && (
            <span style={{ minWidth: 48, padding: '4px 8px', background: A_ACCENT_BG, color: A_ACCENT_INK, fontSize: 11, fontWeight: 600, borderRadius: 8, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>★ {s.rating.toFixed(1)}</span>
          )}
        </div>
      ))}</div>
    </div>
  );
}

// ── Sidebar nav ─────────────────────────────────────────────────────────────
function AdminNav() {
  const items = [
    { id: 'overview', label: 'Overview', icon: 'bolt', active: true },
    { id: 'menu', label: 'Menu', icon: 'utensils' },
    { id: 'orders', label: 'Orders', icon: 'receipt' },
    { id: 'tables', label: 'Tables', icon: 'table' },
    { id: 'people', label: 'People', icon: 'user' },
    { id: 'reviews', label: 'Reviews', icon: 'leaf' },
    { id: 'reports', label: 'Reports', icon: 'map' },
    { id: 'settings', label: 'Settings', icon: 'plus' },
  ];
  return (
    <div style={{ width: 220, flexShrink: 0, padding: '32px 16px', background: A_SUNKEN, display: 'flex', flexDirection: 'column', gap: 4, borderRight: `1px solid ${A_LINE}` }}>
      <div style={{ padding: '0 12px 28px' }}>
        <div className="display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.5, lineHeight: 1, fontStyle: 'italic' }}>TableFlow</div>
        <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: A_FAINT, textTransform: 'uppercase', marginTop: 6 }}>Dar Bahri · La Marsa</div>
      </div>
      <div data-stagger style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{items.map(it => (
        <div key={it.id} data-press style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 12px', borderRadius: 9, background: it.active ? A_SURFACE : 'transparent', color: A_INK, fontSize: 13, fontWeight: it.active ? 500 : 400, cursor: 'pointer', boxShadow: it.active ? '0 1px 2px rgba(36,28,20,0.04)' : 'none', transition: 'background 180ms' }}
          onMouseEnter={e => { if (!it.active) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
          onMouseLeave={e => { if (!it.active) e.currentTarget.style.background = 'transparent'; }}>
          <Icon name={it.icon} size={15} color={it.active ? A_INK : A_MUT} />
          {it.label}
        </div>
      ))}</div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: 12, background: A_SURFACE, borderRadius: 10, border: `1px solid ${A_LINE}`, fontSize: 12, color: A_MUT, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 500, color: A_INK, marginBottom: 4 }}>Leila B.</div>
        Owner · 4 yrs
      </div>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  return (
    <div className="tf" style={{ width: '100%', height: '100%', display: 'flex', background: A_BG, color: A_INK, overflow: 'hidden', fontFamily: '"Geist", system-ui, sans-serif' }}>
      <AdminNav />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top bar */}
        <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${A_LINE}`, background: A_BG, position: 'sticky', top: 0, zIndex: 5 }}>
          <div>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: A_FAINT, textTransform: 'uppercase' }}>Wednesday · 13 March</div>
            <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.7, margin: '2px 0 0' }}>
              Good afternoon, <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>Leila</span>.
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 12px', background: A_SURFACE, border: `1px solid ${A_LINE}`, borderRadius: 999, fontSize: 12 }}>
              <Icon name="leaf" size={12} color={A_OK} /> All systems green
            </span>
            <button style={{ height: 36, padding: '0 16px', borderRadius: 18, border: 'none', background: A_INK, color: A_BG, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ New reservation</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 32, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
          {/* KPI strip */}
          <div style={{ gridColumn: 'span 3' }}><KPI big label="Revenue · today" value="€3,748" delta={0.122} /></div>
          <div style={{ gridColumn: 'span 3' }}><KPI big label="Covers" value="142" delta={0.085} /></div>
          <div style={{ gridColumn: 'span 3' }}><KPI big label="Avg ticket" value="€26.40" delta={0.043} /></div>
          <div style={{ gridColumn: 'span 3' }}><KPI big label="Avg dwell" value="47m" delta={-0.06} /></div>

          {/* Pulse */}
          <div style={{ gridColumn: 'span 8' }}><ServicePulse /></div>
          <div style={{ gridColumn: 'span 4' }}><RightNow /></div>

          {/* Menu + staff */}
          <div style={{ gridColumn: 'span 8' }}><MenuPerf /></div>
          <div style={{ gridColumn: 'span 4' }}><StaffBoard /></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard });
