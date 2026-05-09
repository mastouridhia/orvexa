// waiter-app.jsx — Phone-sized waiter app
// Yassine, 6h shift, 22 tables, headphones in. The app whispers, never shouts.
// Three primary surfaces: Floor (map), Calls (queue), Tables (per-table detail).

const W_BG = '#FAF8F4';
const W_INK = '#19140E';
const W_SURFACE = '#FFFFFF';
const W_SUNKEN = '#F2EFE8';
const W_LINE = 'rgba(25,20,14,0.08)';
const W_MUT = 'rgba(25,20,14,0.6)';
const W_FAINT = 'rgba(25,20,14,0.42)';
const W_ACCENT = '#D97A2C';
const W_ACCENT_INK = '#7C3F12';
const W_ACCENT_BG = '#FBEED9';
const W_OK = '#2E8B57';
const W_DANGER = '#C8392E';

// ── Floor data ──────────────────────────────────────────────────────────────
// 22 tables across 3 zones. Coordinates are normalized (0–1) so the map scales.
// State: open / seated / ordered / cooking / ready / paying / clean / call
const W_TABLES = [
  // Terrace (sunlit, 8 tables) — top
  { n: 1,  z: 'Terrace', x: 0.10, y: 0.10, seats: 2, state: 'seated',   mins: 4,  server: 'Yassine' },
  { n: 2,  z: 'Terrace', x: 0.25, y: 0.10, seats: 2, state: 'ordered',  mins: 9,  server: 'Yassine' },
  { n: 3,  z: 'Terrace', x: 0.40, y: 0.10, seats: 4, state: 'cooking',  mins: 12, server: 'Inès' },
  { n: 4,  z: 'Terrace', x: 0.55, y: 0.10, seats: 4, state: 'ready',    mins: 1,  server: 'Yassine' },
  { n: 5,  z: 'Terrace', x: 0.70, y: 0.10, seats: 2, state: 'open',     mins: 0,  server: null },
  { n: 6,  z: 'Terrace', x: 0.10, y: 0.22, seats: 6, state: 'paying',   mins: 38, server: 'Karim' },
  { n: 7,  z: 'Terrace', x: 0.30, y: 0.22, seats: 4, state: 'call',     mins: 0,  server: 'Yassine', callType: 'water', callAge: 18 },
  { n: 8,  z: 'Terrace', x: 0.50, y: 0.22, seats: 2, state: 'open',     mins: 0,  server: null },

  // Inside (10 tables) — middle
  { n: 9,  z: 'Inside',  x: 0.10, y: 0.42, seats: 2, state: 'seated',   mins: 2,  server: 'Yassine' },
  { n: 10, z: 'Inside',  x: 0.25, y: 0.42, seats: 4, state: 'open',     mins: 0,  server: null },
  { n: 11, z: 'Inside',  x: 0.40, y: 0.42, seats: 2, state: 'cooking',  mins: 6,  server: 'Yassine' },
  { n: 12, z: 'Inside',  x: 0.55, y: 0.42, seats: 4, state: 'clean',    mins: 0,  server: null },
  { n: 13, z: 'Inside',  x: 0.70, y: 0.42, seats: 2, state: 'open',     mins: 0,  server: null },
  { n: 14, z: 'Inside',  x: 0.10, y: 0.55, seats: 2, state: 'cooking',  mins: 8,  server: 'Yassine', highlight: true },
  { n: 15, z: 'Inside',  x: 0.30, y: 0.55, seats: 4, state: 'ordered',  mins: 14, server: 'Inès' },
  { n: 16, z: 'Inside',  x: 0.50, y: 0.55, seats: 2, state: 'call',     mins: 28, server: 'Inès',   callType: 'bill', callAge: 142 },
  { n: 17, z: 'Inside',  x: 0.70, y: 0.55, seats: 4, state: 'open',     mins: 0,  server: null },
  { n: 18, z: 'Inside',  x: 0.85, y: 0.55, seats: 8, state: 'cooking',  mins: 28, server: 'Karim' },

  // Bar / counter (4 stools) — bottom
  { n: 19, z: 'Bar',     x: 0.20, y: 0.80, seats: 1, state: 'seated',   mins: 1,  server: 'Yassine', bar: true },
  { n: 20, z: 'Bar',     x: 0.32, y: 0.80, seats: 1, state: 'ordered',  mins: 5,  server: 'Yassine', bar: true },
  { n: 21, z: 'Bar',     x: 0.44, y: 0.80, seats: 1, state: 'open',     mins: 0,  server: null,      bar: true },
  { n: 22, z: 'Bar',     x: 0.56, y: 0.80, seats: 1, state: 'open',     mins: 0,  server: null,      bar: true },
];

const W_STATE_META = {
  open:    { label: 'Open',     color: 'rgba(25,20,14,0.08)', ink: W_FAINT, ring: 'transparent' },
  seated:  { label: 'Seated',   color: '#FFFFFF',             ink: W_INK,   ring: W_LINE },
  ordered: { label: 'Ordered',  color: '#FBEED9',             ink: '#7C3F12', ring: 'rgba(217,122,44,0.3)' },
  cooking: { label: 'Cooking',  color: '#FBEED9',             ink: '#7C3F12', ring: '#D97A2C' },
  ready:   { label: 'Ready',    color: '#A6F562',             ink: '#1A2410', ring: '#1A2410' },
  paying:  { label: 'Paying',   color: '#19140E',             ink: '#FAF8F4', ring: '#19140E' },
  clean:   { label: 'Clean',    color: 'rgba(46,139,87,0.14)', ink: W_OK,    ring: 'rgba(46,139,87,0.4)' },
  call:    { label: 'Calling',  color: '#C8392E',             ink: '#FFFFFF', ring: '#C8392E' },
};

const W_CALL_META = {
  water:   { label: 'Water',     icon: 'leaf' },
  bill:    { label: 'The bill',  icon: 'receipt' },
  bread:   { label: 'More bread', icon: 'leaf' },
  manager: { label: 'Speak to manager', icon: 'user' },
  generic: { label: 'Needs a hand', icon: 'bell' },
};

// ── Hook: simulated state + call timer ──────────────────────────────────────
function useWaiterSim() {
  const [tables, setTables] = React.useState(W_TABLES);
  const [tab, setTab] = React.useState('floor');
  const [activeTable, setActiveTable] = React.useState(null);

  React.useEffect(() => {
    const id = setInterval(() => {
      setTables(prev => prev.map(t => {
        if (t.state === 'call') return { ...t, callAge: (t.callAge || 0) + 1, mins: t.mins + 1/60 };
        if (['seated','ordered','cooking','paying'].includes(t.state)) return { ...t, mins: t.mins + 1/60 };
        return t;
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const ackCall = (n) => setTables(prev => prev.map(t => t.n === n ? { ...t, state: t.callType === 'bill' ? 'paying' : 'seated', callType: null, callAge: null } : t));
  const advanceTable = (n, to) => setTables(prev => prev.map(t => t.n === n ? { ...t, state: to, mins: to === 'open' ? 0 : 0 } : t));

  return { tables, tab, setTab, activeTable, setActiveTable, ackCall, advanceTable };
}

// ── Top status bar (iOS-style) ──────────────────────────────────────────────
function WStatus() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, zIndex: 20, color: W_INK }}>
      <span className="tf-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>13:47</span>
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        <span style={{ width: 16, height: 10, border: `1.5px solid ${W_INK}`, borderRadius: 2, position: 'relative' }}>
          <span style={{ position: 'absolute', inset: 1, background: W_INK, width: '85%' }} />
        </span>
      </span>
    </div>
  );
}

// ── FLOOR (map view) ────────────────────────────────────────────────────────
function FloorView({ tables, onTable, callQueue }) {
  const me = 'Yassine';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: W_BG }}>
      {/* Header — me + shift summary */}
      <div style={{ padding: '60px 20px 12px', flexShrink: 0 }}>
        <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase' }}>Floor · live</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.7, margin: 0 }}>
            Hey <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>{me}</span>.
          </h1>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '4px 10px', background: W_SURFACE, border: `1px solid ${W_LINE}`, borderRadius: 999, fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: W_OK }} />
            <span className="tf-mono" style={{ letterSpacing: 1.2, color: W_MUT, textTransform: 'uppercase' }}>4h 12m</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 13, color: W_MUT }}>
          <span><b style={{ color: W_INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{tables.filter(t => t.server === me && t.state !== 'open' && t.state !== 'clean').length}</b> tables on you</span>
          <span style={{ color: W_FAINT }}>·</span>
          <span><b style={{ color: callQueue.length > 0 ? W_DANGER : W_INK, fontWeight: 600 }}>{callQueue.length}</b> calls</span>
          <span style={{ color: W_FAINT }}>·</span>
          <span><b style={{ color: W_INK, fontWeight: 600 }}>{tables.filter(t => t.state === 'ready').length}</b> ready to pass</span>
        </div>
      </div>

      {/* Floor map — pannable artboard */}
      <div style={{ flex: 1, padding: '4px 16px 0', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', background: W_SUNKEN, borderRadius: 16, overflow: 'hidden', border: `1px solid ${W_LINE}` }}>
          {/* zone labels */}
          <ZoneBand y="6%"  label="Terrace" />
          <ZoneBand y="38%" label="Inside" />
          <ZoneBand y="76%" label="Bar" />
          {/* zone separators (faint) */}
          <div style={{ position: 'absolute', left: 12, right: 12, top: '34%', height: 1, background: 'rgba(25,20,14,0.06)' }} />
          <div style={{ position: 'absolute', left: 12, right: 12, top: '72%', height: 1, background: 'rgba(25,20,14,0.06)' }} />

          {tables.map(t => {
            const m = W_STATE_META[t.state];
            const calling = t.state === 'call';
            const ready   = t.state === 'ready';
            return (
              <button key={t.n} onClick={() => onTable(t.n)}
                style={{
                  position: 'absolute',
                  left: `calc(${t.x * 100}% )`, top: `calc(${t.y * 100}% )`,
                  transform: 'translate(-50%, -50%)',
                  width: t.bar ? 32 : (t.seats >= 6 ? 56 : t.seats >= 4 ? 48 : 40),
                  height: t.bar ? 32 : (t.seats >= 6 ? 56 : t.seats >= 4 ? 48 : 40),
                  borderRadius: t.bar ? 16 : 10,
                  background: m.color,
                  color: m.ink,
                  border: `1.5px solid ${m.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: t.seats >= 6 ? 16 : 14, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.2,
                  cursor: 'pointer', padding: 0,
                  boxShadow: calling ? '0 0 0 6px rgba(200,57,46,0.18), 0 6px 16px rgba(200,57,46,0.32)' : ready ? '0 0 0 4px rgba(166,245,98,0.4)' : 'none',
                  animation: calling ? 'tf-late-throb 1.4s ease-in-out infinite' : 'none',
                  transition: 'all 240ms cubic-bezier(0.2,0.7,0.3,1)',
                }}>
                {t.n}
                {/* mins badge for active tables */}
                {['ordered','cooking','paying'].includes(t.state) && (
                  <span className="tf-mono" style={{ position: 'absolute', top: -8, right: -8, padding: '1px 5px', background: W_INK, color: W_BG, fontSize: 9, fontWeight: 600, borderRadius: 6, letterSpacing: 0.4, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(t.mins)}m
                  </span>
                )}
                {calling && (
                  <span style={{ position: 'absolute', top: -10, right: -10, width: 18, height: 18, borderRadius: 9, background: W_DANGER, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="bell_ring" size={11} color="#fff" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom legend strip */}
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          ['call', 'Calling'], ['ready', 'Ready'], ['cooking', 'Cooking'],
          ['ordered', 'Ordered'], ['seated', 'Seated'], ['paying', 'Paying'], ['clean', 'Clean'], ['open', 'Open'],
        ].map(([s, label]) => {
          const m = W_STATE_META[s];
          return (
            <span key={s} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', background: W_SURFACE, border: `1px solid ${W_LINE}`, borderRadius: 999, fontSize: 12, color: W_MUT }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: m.color, border: `1px solid ${m.ring}` }} />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ZoneBand({ y, label }) {
  return (
    <div className="tf-mono" style={{ position: 'absolute', left: 14, top: y, fontSize: 9, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase', writingMode: 'horizontal-tb' }}>{label}</div>
  );
}

// ── CALLS view ──────────────────────────────────────────────────────────────
function CallsView({ tables, onAck, onTable }) {
  const calls = tables.filter(t => t.state === 'call').sort((a, b) => (b.callAge || 0) - (a.callAge || 0));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: W_BG }}>
      <div style={{ padding: '60px 20px 12px', flexShrink: 0 }}>
        <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase' }}>Queue</div>
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.7, margin: 0, marginTop: 2 }}>
          {calls.length === 0
            ? <>Nothing waiting. <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>Breathe.</span></>
            : <>{calls.length} call{calls.length > 1 ? 's' : ''}, oldest first.</>}
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {calls.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: W_FAINT }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: W_SURFACE, border: `1px solid ${W_LINE}`, margin: '12px auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={32} color={W_OK} />
            </div>
            <div style={{ fontSize: 14, color: W_MUT, lineHeight: 1.5, maxWidth: 240, margin: '0 auto' }}>You're caught up. The board will buzz when someone needs you.</div>
          </div>
        )}
        {calls.map((t, i) => {
          const meta = W_CALL_META[t.callType] || W_CALL_META.generic;
          const stale = (t.callAge || 0) > 60;
          const old = (t.callAge || 0) > 120;
          return (
            <div key={t.n}
              style={{
                marginBottom: 10, background: old ? '#FBE6E3' : W_SURFACE,
                borderRadius: 16, padding: 16, border: `1px solid ${old ? 'rgba(200,57,46,0.4)' : W_LINE}`,
                display: 'flex', flexDirection: 'column', gap: 12,
                position: 'relative', overflow: 'hidden',
                boxShadow: i === 0 ? '0 1px 2px rgba(36,28,20,0.04), 0 8px 24px rgba(36,28,20,0.08)' : '0 1px 2px rgba(36,28,20,0.04)',
                animation: i === 0 && (t.callAge || 0) < 30 ? 'tf-new-pop 360ms cubic-bezier(0.34,1.36,0.64,1)' : 'none',
              }}>
              {/* age strip */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: old ? W_DANGER : stale ? W_ACCENT : W_OK }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: old ? W_DANGER : W_ACCENT_BG, color: old ? '#fff' : W_ACCENT_INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={meta.icon} size={22} color="currentColor" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="display" style={{ fontStyle: 'italic', fontSize: 22, fontWeight: 400, color: W_INK, lineHeight: 1 }}>Table {t.n}</span>
                    <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: W_FAINT, textTransform: 'uppercase' }}>{t.z} · {t.seats} pax</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 500, marginTop: 4, letterSpacing: -0.2 }}>{meta.label}</div>
                  <div className="tf-mono" style={{ fontSize: 11, marginTop: 4, letterSpacing: 1.2, color: old ? W_DANGER : stale ? W_ACCENT : W_MUT }}>
                    {fmtAge(t.callAge || 0)} · {old ? 'OVERDUE' : stale ? 'GETTING OLD' : 'FRESH'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onTable(t.n)} style={{ flex: 1, height: 44, borderRadius: 22, border: `1px solid ${W_LINE}`, background: 'transparent', fontSize: 14, fontWeight: 500, color: W_INK, cursor: 'pointer' }}>
                  Open table
                </button>
                <button onClick={() => onAck(t.n)} style={{ flex: 1.4, height: 44, borderRadius: 22, border: 'none', background: W_INK, color: W_BG, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                  <Icon name="check" size={14} color={W_BG} strokeWidth={2.5} /> On the way
                </button>
              </div>
            </div>
          );
        })}

        {/* Recent activity (always shown) */}
        <div style={{ marginTop: 16, padding: '0 4px' }}>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase', marginBottom: 8 }}>Earlier</div>
          {[
            { ev: 'T-4 marked ready · pass to you',         time: '1m', dot: '#A6F562' },
            { ev: 'T-6 paid · €38.00 · 18% tip',             time: '4m', dot: W_OK },
            { ev: 'T-2 fired all mains',                     time: '7m', dot: W_ACCENT },
            { ev: 'T-9 seated · 2 covers',                   time: '11m', dot: W_INK },
          ].map((e, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < 3 ? `1px solid ${W_LINE}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: e.dot }} />
              <span style={{ flex: 1, fontSize: 13, color: W_MUT }}>{e.ev}</span>
              <span className="tf-mono" style={{ fontSize: 11, color: W_FAINT, letterSpacing: 1.2 }}>{e.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtAge(s) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2,'0')}s`;
}

// ── TABLE DETAIL ────────────────────────────────────────────────────────────
function TableDetail({ tableN, tables, onClose, onAdvance }) {
  const t = tables.find(x => x.n === tableN);
  if (!t) return null;
  const m = W_STATE_META[t.state];

  // sample order — only meaningful for ordered/cooking/ready/paying
  const order = ['ordered','cooking','ready','paying'].includes(t.state) ? [
    { name: 'Salade méchouia',  ar: 'سلاطة مشوية',  qty: 1, course: 'starter', state: 'ready', mins: 0 },
    { name: 'Brik à l\'œuf',    ar: 'بريك بالبيض',  qty: 2, course: 'starter', state: t.state === 'cooking' ? 'cooking' : 'ready', mins: 4 },
    { name: 'Couscous merguez', ar: 'كسكسي مرقاز',  qty: 1, course: 'main',    state: t.state === 'ready' ? 'ready' : t.state === 'cooking' ? 'cooking' : 'queued', mins: 12 },
    { name: 'Loup de mer',      ar: 'سمك الذئب',    qty: 1, course: 'main',    state: t.state === 'ready' ? 'ready' : t.state === 'cooking' ? 'cooking' : 'queued', mins: 18 },
    { name: 'Café Turc',        ar: 'قهوة تركية',   qty: 2, course: 'dessert', state: 'queued', mins: 0 },
  ] : [];

  return (
    <div style={{ position: 'absolute', inset: 0, background: W_BG, zIndex: 30, display: 'flex', flexDirection: 'column', animation: 'tf-sheet-up 320ms cubic-bezier(0.2,0.7,0.3,1)' }}>
      <WStatus />
      <div style={{ padding: '60px 20px 16px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px 0 8px', borderRadius: 16, border: `1px solid ${W_LINE}`, background: W_SURFACE, fontSize: 13, cursor: 'pointer' }}>
          <Icon name="chevronL" size={14} /> Floor
        </button>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase' }}>{t.z} · {t.seats} {t.seats === 1 ? 'seat' : 'seats'}</div>
            <h1 style={{ fontSize: 38, fontWeight: 500, letterSpacing: -1, margin: '4px 0 0' }}>
              Table <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>{t.n}</span>
            </h1>
          </div>
          <span style={{ padding: '6px 12px', background: m.color, color: m.ink, border: `1px solid ${m.ring}`, borderRadius: 999, fontSize: 12, fontWeight: 500, marginTop: 6 }}>
            {m.label}{t.mins > 0 && ['ordered','cooking','paying'].includes(t.state) ? ` · ${Math.round(t.mins)}m` : ''}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { i: 'plus', l: 'Add item' },
            { i: 'bell', l: 'Call kitchen' },
            { i: 'receipt', l: 'Bill' },
          ].map(a => (
            <button key={a.l} style={{ padding: '12px 8px', background: W_SURFACE, border: `1px solid ${W_LINE}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: W_INK, cursor: 'pointer' }}>
              <Icon name={a.i} size={18} color={W_INK} />{a.l}
            </button>
          ))}
        </div>

        {/* Order block */}
        {order.length > 0 ? (
          <div style={{ background: W_SURFACE, borderRadius: 16, border: `1px solid ${W_LINE}`, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase' }}>Order #2406-A · {order.reduce((s, i) => s + i.qty, 0)} items</span>
              <span className="tf-mono" style={{ fontSize: 11, color: W_MUT, fontVariantNumeric: 'tabular-nums' }}>{Math.round(t.mins)}m elapsed</span>
            </div>
            {['starter','main','dessert'].map((c, ci) => {
              const items = order.filter(o => o.course === c);
              if (!items.length) return null;
              const courseReady = items.every(i => i.state === 'ready');
              const courseCooking = items.some(i => i.state === 'cooking');
              return (
                <div key={c} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px dashed ${W_LINE}`, marginBottom: 8 }}>
                    <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase' }}>{ci + 1} · {c === 'starter' ? 'Entrées' : c === 'main' ? 'Plats' : 'Desserts'}</span>
                    {courseReady ? (
                      <button style={{ padding: '4px 10px', borderRadius: 12, border: 'none', background: '#A6F562', color: '#1A2410', fontSize: 11, fontWeight: 600, letterSpacing: 0.3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="bolt" size={11} color="#1A2410" /> READY · pass now
                      </button>
                    ) : courseCooking ? (
                      <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: W_ACCENT_INK }}>COOKING</span>
                    ) : (
                      <button style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${W_LINE}`, background: 'transparent', fontSize: 11, fontWeight: 500, letterSpacing: 0.3, color: W_INK, cursor: 'pointer' }}>Fire course</button>
                    )}
                  </div>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="tf-mono" style={{ fontSize: 12, color: W_FAINT, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{it.qty}×</span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</span>
                        <span dir="rtl" style={{ fontSize: 12, color: W_FAINT, marginLeft: 8, fontFamily: 'system-ui' }}>{it.ar}</span>
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
                        background: it.state === 'ready' ? '#A6F562' : it.state === 'cooking' ? W_ACCENT_BG : W_SUNKEN,
                        color:      it.state === 'ready' ? '#1A2410' : it.state === 'cooking' ? W_ACCENT_INK : W_FAINT,
                      }}>{it.state}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 32, background: W_SURFACE, border: `1px solid ${W_LINE}`, borderRadius: 16, textAlign: 'center', color: W_MUT, marginBottom: 14 }}>
            <div className="display" style={{ fontStyle: 'italic', fontSize: 22 }}>{t.state === 'open' ? 'Empty.' : t.state === 'clean' ? 'Just cleared.' : 'No order yet.'}</div>
            <div style={{ fontSize: 13, color: W_FAINT, marginTop: 6 }}>{t.state === 'open' ? 'Seat a party here.' : t.state === 'seated' ? 'Take their order to begin.' : 'Reset for the next guests.'}</div>
          </div>
        )}

        {/* History */}
        <div style={{ background: W_SURFACE, border: `1px solid ${W_LINE}`, borderRadius: 16, padding: 16 }}>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase', marginBottom: 8 }}>Timeline</div>
          {[
            ['Seated', '13:31'],
            ['Order placed · 5 items', '13:35'],
            ['Starters fired', '13:36'],
            ['Mains fired', '13:43'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: W_MUT }}>{k}</span>
              <span className="tf-mono" style={{ color: W_FAINT, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={{ padding: '12px 16px 28px', borderTop: `1px solid ${W_LINE}`, background: 'rgba(250,248,244,0.94)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        {t.state === 'ready' && (
          <button onClick={() => onAdvance(t.n, 'paying')} style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: '#A6F562', color: '#1A2410', fontSize: 15, fontWeight: 600, letterSpacing: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <Icon name="bolt" size={16} color="#1A2410" /> Mark passed to table
          </button>
        )}
        {t.state === 'paying' && (
          <button onClick={() => onAdvance(t.n, 'clean')} style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: W_INK, color: W_BG, fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', cursor: 'pointer' }}>
            <span>Settle bill</span>
            <span className="tf-mono" style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>78.500 TND</span>
          </button>
        )}
        {t.state === 'cooking' && (
          <button style={{ width: '100%', height: 52, borderRadius: 26, border: `1px solid ${W_LINE}`, background: W_SURFACE, color: W_INK, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
            Add to order
          </button>
        )}
        {t.state === 'seated' && (
          <button style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: W_ACCENT, color: '#fff', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <Icon name="plus" size={16} color="#fff" /> Take order
          </button>
        )}
        {t.state === 'open' && (
          <button onClick={() => onAdvance(t.n, 'seated')} style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: W_INK, color: W_BG, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Seat party</button>
        )}
        {t.state === 'clean' && (
          <button onClick={() => onAdvance(t.n, 'open')} style={{ width: '100%', height: 52, borderRadius: 26, border: `1px solid ${W_LINE}`, background: W_SURFACE, color: W_INK, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Mark ready for guests</button>
        )}
        {t.state === 'ordered' && (
          <button style={{ width: '100%', height: 52, borderRadius: 26, border: 'none', background: W_ACCENT, color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Fire all to kitchen</button>
        )}
      </div>
    </div>
  );
}

// ── Tab bar ─────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab, callCount }) {
  const tabs = [
    { id: 'floor', label: 'Floor',  icon: 'map' },
    { id: 'calls', label: 'Calls',  icon: 'bell', badge: callCount },
    { id: 'tables', label: 'Tables', icon: 'table' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 16px 28px', background: 'rgba(250,248,244,0.92)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${W_LINE}`, display: 'flex', gap: 4, zIndex: 5 }}>
      {tabs.map(tb => {
        const on = tab === tb.id;
        return (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ flex: 1, height: 56, borderRadius: 14, border: 'none', background: on ? W_INK : 'transparent', color: on ? W_BG : W_INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 11, fontWeight: 500, position: 'relative', cursor: 'pointer' }}>
            <Icon name={tb.icon} size={20} color={on ? W_BG : W_INK} />
            {tb.label}
            {tb.badge > 0 && (
              <span style={{ position: 'absolute', top: 8, right: '32%', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: W_DANGER, color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{tb.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Tables list (alt view) ──────────────────────────────────────────────────
function TablesList({ tables, onTable }) {
  const grouped = { Terrace: [], Inside: [], Bar: [] };
  tables.forEach(t => grouped[t.z].push(t));
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: W_BG }}>
      <div style={{ padding: '60px 20px 12px' }}>
        <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase' }}>All · 22 tables</div>
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.7, margin: 0, marginTop: 2 }}>Tables list</h1>
      </div>
      {Object.entries(grouped).map(([zone, ts]) => (
        <div key={zone} style={{ padding: '8px 16px 16px' }}>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: W_FAINT, textTransform: 'uppercase', padding: '8px 4px' }}>{zone}</div>
          <div style={{ background: W_SURFACE, borderRadius: 14, border: `1px solid ${W_LINE}`, overflow: 'hidden' }}>
            {ts.map((t, i) => {
              const m = W_STATE_META[t.state];
              return (
                <button key={t.n} onClick={() => onTable(t.n)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < ts.length - 1 ? `1px solid ${W_LINE}` : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 8, background: m.color, color: m.ink, border: `1px solid ${m.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{t.n}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Table {t.n} <span style={{ color: W_FAINT, fontWeight: 400 }}>· {t.seats} pax</span></div>
                    <div className="tf-mono" style={{ fontSize: 11, color: W_FAINT, marginTop: 2, letterSpacing: 1.2, textTransform: 'uppercase' }}>{m.label}{t.mins > 0 && ['ordered','cooking','paying'].includes(t.state) ? ` · ${Math.round(t.mins)}m` : ''}</div>
                  </div>
                  <Icon name="chevron" size={14} color={W_FAINT} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
function WaiterApp() {
  const sim = useWaiterSim();
  const callQueue = sim.tables.filter(t => t.state === 'call');
  return (
    <div className="tf" style={{ width: '100%', height: '100%', position: 'relative', background: W_BG, color: W_INK, overflow: 'hidden' }}>
      <WStatus />
      <div style={{ position: 'absolute', inset: 0, paddingBottom: 92 }}>
        {sim.tab === 'floor' && <FloorView tables={sim.tables} onTable={sim.setActiveTable} callQueue={callQueue} />}
        {sim.tab === 'calls' && <CallsView tables={sim.tables} onAck={sim.ackCall} onTable={sim.setActiveTable} />}
        {sim.tab === 'tables' && <TablesList tables={sim.tables} onTable={sim.setActiveTable} />}
      </div>
      <TabBar tab={sim.tab} setTab={sim.setTab} callCount={callQueue.length} />
      {sim.activeTable && (
        <TableDetail tableN={sim.activeTable} tables={sim.tables} onClose={() => sim.setActiveTable(null)} onAdvance={sim.advanceTable} />
      )}
    </div>
  );
}

// Static variant for canvas comparison — no timers, fixed state
function WaiterAppStatic({ tab = 'floor', detailTable = null }) {
  const [activeTable, setActiveTable] = React.useState(detailTable);
  const [tabState, setTab] = React.useState(tab);
  const tables = W_TABLES;
  const callQueue = tables.filter(t => t.state === 'call');
  return (
    <div className="tf" style={{ width: '100%', height: '100%', position: 'relative', background: W_BG, color: W_INK, overflow: 'hidden' }}>
      <WStatus />
      <div style={{ position: 'absolute', inset: 0, paddingBottom: 92 }}>
        {tabState === 'floor' && <FloorView tables={tables} onTable={setActiveTable} callQueue={callQueue} />}
        {tabState === 'calls' && <CallsView tables={tables} onAck={() => {}} onTable={setActiveTable} />}
        {tabState === 'tables' && <TablesList tables={tables} onTable={setActiveTable} />}
      </div>
      <TabBar tab={tabState} setTab={setTab} callCount={callQueue.length} />
      {activeTable && (
        <TableDetail tableN={activeTable} tables={tables} onClose={() => setActiveTable(null)} onAdvance={() => {}} />
      )}
    </div>
  );
}

Object.assign(window, { WaiterApp, WaiterAppStatic, FloorView, CallsView, TableDetail, TablesList, TabBar, W_TABLES, W_STATE_META });
