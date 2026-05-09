// states.jsx — Empty / error / loading variants for engineer handoff.
// These are the states real apps live or die in. Each is a static screen the
// engineer can drop in when the API is loading, empty, or has failed.

const ST_BG = '#FAF8F4';
const ST_INK = '#19140E';
const ST_SURFACE = '#FFFFFF';
const ST_SUNKEN = '#F2EFE8';
const ST_LINE = 'rgba(25,20,14,0.08)';
const ST_MUT = 'rgba(25,20,14,0.6)';
const ST_FAINT = 'rgba(25,20,14,0.42)';
const ST_ACCENT = 'var(--tf-accent, #D97A2C)';
const ST_DANGER = '#C8392E';
const ST_OK = '#2E8B57';

// ── Skeleton primitive ──────────────────────────────────────────────────────
function Skel({ w, h, r = 6, style }) {
  return (
    <span style={{
      display: 'inline-block',
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, rgba(25,20,14,0.06) 0%, rgba(25,20,14,0.10) 50%, rgba(25,20,14,0.06) 100%)',
      backgroundSize: '200% 100%',
      animation: 'tf-skel 1.6s ease-in-out infinite',
      ...style,
    }} />
  );
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('tf-skel-kf')) {
  const s = document.createElement('style');
  s.id = 'tf-skel-kf';
  s.textContent = `@keyframes tf-skel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(s);
}

// ── Generic state shell ─────────────────────────────────────────────────────
function StateShell({ icon, title, body, action, secondary, danger, mode = 'phone' }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: ST_BG, color: ST_INK,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: mode === 'phone' ? '60px 32px' : '80px 64px', textAlign: 'center', gap: 14,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 36,
        background: danger ? '#FBE6E3' : ST_SURFACE,
        border: `1px solid ${danger ? 'rgba(200,57,46,0.3)' : ST_LINE}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 6,
      }}>
        <Icon name={icon} size={28} color={danger ? ST_DANGER : ST_INK} strokeWidth={1.5} />
      </div>
      <div className="display" style={{ fontStyle: 'italic', fontSize: 28, fontWeight: 400, letterSpacing: -0.6, lineHeight: 1.1, maxWidth: 320 }}>{title}</div>
      <div style={{ fontSize: 14, color: ST_MUT, lineHeight: 1.55, maxWidth: 280, textWrap: 'pretty' }}>{body}</div>
      {(action || secondary) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexDirection: 'column', alignItems: 'stretch', minWidth: 220 }}>
          {action && (
            <button style={{ height: 46, padding: '0 22px', borderRadius: 23, border: 'none', background: ST_INK, color: ST_BG, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{action}</button>
          )}
          {secondary && (
            <button style={{ height: 46, padding: '0 22px', borderRadius: 23, border: `1px solid ${ST_LINE}`, background: 'transparent', color: ST_INK, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{secondary}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── CUSTOMER STATES ─────────────────────────────────────────────────────────

// Loading the menu — skeleton cards that mirror the real layout
function CustomerMenuLoading() {
  return (
    <div style={{ width: '100%', height: '100%', background: ST_BG, padding: '60px 0 0', overflow: 'hidden', position: 'relative' }}>
      <WStatus />
      <div style={{ padding: '20px 20px 14px' }}>
        <Skel w={120} h={11} r={2} style={{ marginBottom: 10 }} />
        <Skel w={220} h={32} r={4} style={{ marginBottom: 16 }} />
        <Skel w="100%" h={42} r={21} />
      </div>
      <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8, overflow: 'hidden' }}>
        {[0,1,2,3].map(i => <Skel key={i} w={88} h={32} r={16} />)}
      </div>
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: 14, background: ST_SURFACE, borderRadius: 14, border: `1px solid ${ST_LINE}` }}>
            <Skel w={84} h={84} r={10} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <Skel w="70%" h={16} r={3} />
              <Skel w="90%" h={11} r={3} />
              <Skel w="50%" h={11} r={3} />
              <Skel w={56} h={14} r={3} style={{ marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerEmptyCart() {
  return <StateShell icon="utensils" title="Your basket is empty." body="Add a dish or two from the menu — we'll fire it to the kitchen the moment you're ready." action="Browse menu" />;
}

function CustomerNetworkError() {
  return <StateShell danger icon="bell_ring" title="We lost the kitchen for a moment." body="Your connection dropped. Your order is safe — tap to try again." action="Retry" secondary="Call your waiter instead" />;
}

function CustomerPaymentFailed() {
  return <StateShell danger icon="receipt" title="Payment didn't go through." body="The card was declined. Try another method, or settle the bill with your waiter." action="Try another card" secondary="Pay with waiter" />;
}

function CustomerOrderConfirmedFull() {
  return (
    <div style={{ width: '100%', height: '100%', background: ST_BG, color: ST_INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative', overflow: 'hidden' }}>
      <WStatus />
      {/* concentric ripple */}
      {[0,1,2].map(i => (
        <span key={i} style={{
          position: 'absolute', width: 240, height: 240, borderRadius: 120,
          border: `1px solid ${ST_ACCENT}`, opacity: 0.15 - i * 0.04,
          transform: `scale(${1 + i * 0.4})`,
        }} />
      ))}
      <div style={{ width: 72, height: 72, borderRadius: 36, background: ST_ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 12px 32px rgba(217,122,44,0.32)' }}>
        <Icon name="check" size={32} color="#fff" strokeWidth={2.2} />
      </div>
      <div className="display" style={{ fontSize: 32, fontStyle: 'italic', fontWeight: 400, letterSpacing: -0.8, marginBottom: 4 }}>Sent to the kitchen.</div>
      <div style={{ fontSize: 14, color: ST_MUT, marginBottom: 24, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
        Five items, three courses. Selma's on starters first.
      </div>
      <div style={{ width: '100%', maxWidth: 320, padding: 16, background: ST_SURFACE, border: `1px solid ${ST_LINE}`, borderRadius: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: ST_FAINT, textTransform: 'uppercase' }}>Order #2406-A</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>Table 14</div>
        </div>
        <span className="tf-mono" style={{ fontSize: 12, color: ST_OK, letterSpacing: 1.2 }}>RECEIVED</span>
      </div>
      <button style={{ height: 46, padding: '0 28px', borderRadius: 23, background: ST_INK, color: ST_BG, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Track your order →</button>
    </div>
  );
}

// ── KITCHEN STATES ──────────────────────────────────────────────────────────

const K_BG = '#0E0B07';
const K_INK = '#F5F0E6';
const K_LINE = 'rgba(245,240,230,0.1)';
const K_MUT = 'rgba(245,240,230,0.6)';

function KitchenEmptyQueue() {
  return (
    <div style={{ width: '100%', height: '100%', background: K_BG, color: K_INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16, fontFamily: '"Geist", system-ui, sans-serif' }}>
      <div style={{ width: 96, height: 96, borderRadius: 48, background: 'rgba(245,240,230,0.04)', border: `1px solid ${K_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="leaf" size={40} color={ST_ACCENT} strokeWidth={1.3} />
      </div>
      <div className="display" style={{ fontStyle: 'italic', fontSize: 44, fontWeight: 400, letterSpacing: -1, lineHeight: 1, marginTop: 12 }}>All caught up.</div>
      <div style={{ fontSize: 17, color: K_MUT, maxWidth: 480, textAlign: 'center', lineHeight: 1.5 }}>
        No tickets on the rail. Last service: 38 covers, average 14m ticket time.
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button style={{ height: 48, padding: '0 22px', borderRadius: 24, border: `1px solid ${K_LINE}`, background: 'transparent', color: K_INK, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Prep checklist</button>
        <button style={{ height: 48, padding: '0 22px', borderRadius: 24, border: 'none', background: ST_ACCENT, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>End of service report</button>
      </div>
    </div>
  );
}

function KitchenOffline() {
  return (
    <div style={{ width: '100%', height: '100%', background: K_BG, color: K_INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16, fontFamily: '"Geist", system-ui, sans-serif' }}>
      <div style={{ width: 96, height: 96, borderRadius: 48, background: 'rgba(200,57,46,0.12)', border: `1px solid rgba(200,57,46,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bell_ring" size={40} color={ST_DANGER} strokeWidth={1.5} />
      </div>
      <div className="display" style={{ fontStyle: 'italic', fontSize: 44, fontWeight: 400, letterSpacing: -1, lineHeight: 1, marginTop: 12 }}>Lost the floor.</div>
      <div style={{ fontSize: 17, color: K_MUT, maxWidth: 520, textAlign: 'center', lineHeight: 1.5 }}>
        Can't reach the network — new tickets won't come through. Your printed copies are still good. Reconnecting in <span className="tf-mono" style={{ color: ST_ACCENT }}>00:08</span>…
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: ST_DANGER, animation: 'tf-late-throb 1.4s ease-in-out infinite' }} />
        <span className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.6, color: K_MUT, textTransform: 'uppercase' }}>OFFLINE · queueing tickets locally</span>
      </div>
    </div>
  );
}

// ── WAITER STATES ───────────────────────────────────────────────────────────

function WaiterEmptyCalls() {
  return (
    <div style={{ width: '100%', height: '100%', background: ST_BG, position: 'relative', overflow: 'hidden' }}>
      <WStatus />
      <div style={{ padding: '60px 20px 12px' }}>
        <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: ST_FAINT, textTransform: 'uppercase' }}>Queue</div>
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.7, margin: '2px 0 0' }}>
          Nothing waiting. <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>Breathe.</span>
        </h1>
      </div>
      <div style={{ padding: 60, textAlign: 'center', color: ST_FAINT, marginTop: 40 }}>
        <div style={{ width: 96, height: 96, borderRadius: 48, background: ST_SURFACE, border: `1px solid ${ST_LINE}`, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={36} color={ST_OK} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 14, color: ST_MUT, lineHeight: 1.55, maxWidth: 240, margin: '0 auto' }}>You're caught up. The board will buzz when someone needs you.</div>
        <div className="tf-mono" style={{ marginTop: 24, fontSize: 10, letterSpacing: 1.6, color: ST_FAINT, textTransform: 'uppercase' }}>Last 4 hours</div>
        <div style={{ marginTop: 12, padding: 16, background: ST_SURFACE, borderRadius: 12, border: `1px solid ${ST_LINE}`, textAlign: 'left' }}>
          {[
            ['Calls answered', '14', '/ 14'],
            ['Avg response', '47s', null],
            ['Late calls', '0', null],
          ].map(([k, v, sub], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${ST_LINE}` }}>
              <span style={{ fontSize: 13, color: ST_MUT }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: ST_INK, fontVariantNumeric: 'tabular-nums' }}>
                {v}{sub && <span style={{ color: ST_FAINT, fontWeight: 400 }}>{sub}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaiterShiftStart() {
  return (
    <div style={{ width: '100%', height: '100%', background: ST_BG, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32, overflow: 'hidden' }}>
      <WStatus />
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: ST_FAINT, textTransform: 'uppercase' }}>Wednesday · 11:30</div>
      <h1 style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1, margin: '6px 0 12px' }}>
        Welcome back, <span className="display" style={{ fontStyle: 'italic', fontWeight: 400 }}>Yassine</span>.
      </h1>
      <div style={{ fontSize: 14, color: ST_MUT, lineHeight: 1.6, marginBottom: 24 }}>
        You're on Terrace + Bar today. Inès is covering Inside. Service starts at noon.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          ['Sections', 'Terrace · Bar'],
          ['Your tables', '12'],
          ['Reservations', '4 booked'],
          ['Specials', '3 today'],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: 14, background: ST_SURFACE, borderRadius: 12, border: `1px solid ${ST_LINE}` }}>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: ST_FAINT, textTransform: 'uppercase' }}>{k}</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <button style={{ height: 52, borderRadius: 26, border: 'none', background: ST_INK, color: ST_BG, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Clock in →</button>
    </div>
  );
}

// ── ADMIN STATES ────────────────────────────────────────────────────────────

function AdminLoading() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: ST_BG, fontFamily: '"Geist", system-ui, sans-serif' }}>
      <div style={{ width: 220, padding: '32px 16px', background: ST_SUNKEN, borderRight: `1px solid ${ST_LINE}` }}>
        <Skel w={140} h={20} r={3} style={{ marginBottom: 6 }} />
        <Skel w={100} h={10} r={2} style={{ marginBottom: 28 }} />
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 12px' }}>
            <Skel w={15} h={15} r={3} /><Skel w={70} h={11} r={3} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 32 }}>
        <Skel w={160} h={11} r={2} style={{ marginBottom: 8 }} />
        <Skel w={280} h={28} r={4} style={{ marginBottom: 28 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ padding: 24, background: ST_SURFACE, border: `1px solid ${ST_LINE}`, borderRadius: 14 }}>
              <Skel w={100} h={10} r={2} style={{ marginBottom: 12 }} />
              <Skel w={140} h={36} r={4} style={{ marginBottom: 10 }} />
              <Skel w={120} h={10} r={2} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ padding: 24, background: ST_SURFACE, border: `1px solid ${ST_LINE}`, borderRadius: 14, height: 380 }}>
            <Skel w={200} h={10} r={2} style={{ marginBottom: 8 }} />
            <Skel w={320} h={24} r={4} style={{ marginBottom: 28 }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180 }}>
              {Array.from({length: 60}).map((_, i) => <Skel key={i} w="100%" h={Math.random() * 160 + 20} r={2} style={{ flex: 1 }} />)}
            </div>
          </div>
          <div style={{ padding: 24, background: ST_INK, border: `1px solid ${ST_LINE}`, borderRadius: 14, height: 380 }}>
            <Skel w={100} h={10} r={2} style={{ marginBottom: 18 }} />
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(245,240,230,0.08)' }}>
                <Skel w="80%" h={12} r={3} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminEmptyDay() {
  return (
    <div style={{ width: '100%', height: '100%', background: ST_BG, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, textAlign: 'center', gap: 16 }}>
      <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.6, color: ST_FAINT, textTransform: 'uppercase' }}>Monday · Closed</div>
      <div className="display" style={{ fontStyle: 'italic', fontSize: 56, fontWeight: 400, letterSpacing: -1.6, lineHeight: 1, maxWidth: 700 }}>
        The kitchen is dark today.
      </div>
      <div style={{ fontSize: 16, color: ST_MUT, maxWidth: 500, lineHeight: 1.6, marginTop: 4 }}>
        No service. Use the quiet — review last week, plan specials, message your team.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button style={{ height: 44, padding: '0 22px', borderRadius: 22, border: `1px solid ${ST_LINE}`, background: ST_SURFACE, color: ST_INK, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Last week's report</button>
        <button style={{ height: 44, padding: '0 22px', borderRadius: 22, border: 'none', background: ST_INK, color: ST_BG, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Edit menu</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  Skel, StateShell,
  CustomerMenuLoading, CustomerEmptyCart, CustomerNetworkError, CustomerPaymentFailed, CustomerOrderConfirmedFull,
  KitchenEmptyQueue, KitchenOffline,
  WaiterEmptyCalls, WaiterShiftStart,
  AdminLoading, AdminEmptyDay,
});
