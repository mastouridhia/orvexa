// kitchen-screens.jsx — TabletKDS + WallDisplay
// Operator surfaces. Dark warm-graphite palette. Aging-color cards.
// Signatures: live timer escalation, course pacing, station load, bump-to-ready, audio cue.

const KDS_BG = '#0E0B07';            // deep warm-black
const KDS_SURFACE = '#171210';       // card
const KDS_SUNKEN = '#0B0805';        // chrome/sunken
const KDS_LINE = 'rgba(245,239,230,0.07)';
const KDS_LINE_BOLD = 'rgba(245,239,230,0.14)';
const KDS_INK = '#F5EFE6';
const KDS_MUT = 'rgba(245,239,230,0.62)';
const KDS_FAINT = 'rgba(245,239,230,0.36)';
const KDS_ACCENT = '#F59A4D';        // saffron
const KDS_LIME = '#A6F562';

// ─── Audio cue (Web Audio, no asset needed) ─────────────────────────────────
function dingNew() {
  try {
    const ctx = window.__kdsAudio || (window.__kdsAudio = new (window.AudioContext || window.webkitAudioContext)());
    const t = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.value = 0; g.gain.linearRampToValueAtTime(0.06, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.24);
    });
  } catch (_) {}
}

// ─── Simulation hook: ticks fired-time and advances state ───────────────────
function useKDSSimulation({ playing = true, tempo = 1, soundOn = true } = {}) {
  const [tickets, setTickets] = React.useState(() => KDS_INITIAL.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) })));
  const [now, setNow] = React.useState(0);
  const seenRef = React.useRef(new Set(KDS_INITIAL.filter(t => t.state !== 'new').map(t => t.id)));

  // age tick
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setNow(n => n + 1);
      setTickets(prev => prev.map(t => {
        if (t.state === 'ready' || t.state === 'cleared') return t;
        return { ...t, fired: t.fired - tempo };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [playing, tempo]);

  // promote 'new' → 'cooking' after 6s on board (simulated chef glance)
  React.useEffect(() => {
    if (!playing) return;
    setTickets(prev => prev.map(t => {
      if (t.state === 'new' && Math.abs(t.fired) > 30) return { ...t, state: 'cooking' };
      return t;
    }));
  }, [now, playing]);

  // audio when a brand-new ticket appears
  React.useEffect(() => {
    if (!soundOn) return;
    tickets.forEach(t => {
      if (!seenRef.current.has(t.id)) {
        seenRef.current.add(t.id);
        if (Math.abs(t.fired) < 30) dingNew();
      }
    });
  }, [tickets, soundOn]);

  // periodically inject a new ticket so the board stays alive
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTickets(prev => {
        if (prev.filter(t => t.state !== 'ready' && t.state !== 'cleared').length >= 7) return prev;
        const n = Math.floor(Math.random() * 1000);
        const newId = `24${12 + (n % 30)}-${String.fromCharCode(71 + (n % 6))}`;
        if (prev.some(t => t.id === newId)) return prev;
        const samples = ['salade', 'brik', 'shak', 'mech', 'loup', 'tab', 'cafe', 'oct'];
        const count = 2 + (n % 3);
        const items = [];
        for (let i = 0; i < count; i++) items.push({ ref: samples[(n + i) % samples.length], qty: 1, done: false, notes: '' });
        return [...prev, { id: newId, table: 5 + (n % 25), server: ['Yassine','Inès','Karim'][n % 3], covers: 2 + (n % 3), fired: 0, state: 'new', items }];
      });
    }, 18000 / Math.max(tempo, 0.5));
    return () => clearInterval(id);
  }, [playing, tempo]);

  const toggleItem = (tid, idx) => setTickets(prev => prev.map(t => t.id === tid ? { ...t, items: t.items.map((i, j) => j === idx ? { ...i, done: !i.done } : i) } : t));
  const bumpTicket = (tid) => setTickets(prev => prev.map(t => t.id === tid ? { ...t, state: 'ready', readyAt: Date.now() } : t));
  const clearTicket = (tid) => setTickets(prev => prev.filter(t => t.id !== tid));

  return { tickets, toggleItem, bumpTicket, clearTicket, now };
}

// ─── Station load chips ─────────────────────────────────────────────────────
function StationLoad({ tickets }) {
  const counts = { cold: 0, hot: 0, pass: 0 };
  tickets.forEach(t => {
    if (t.state === 'ready' || t.state === 'cleared') return;
    t.items.forEach(it => { if (!it.done) counts[KDS_ITEMS[it.ref].station] += it.qty; });
  });
  const max = Math.max(...Object.values(counts), 6);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {Object.values(KDS_STATIONS).map(s => {
        const c = counts[s.id];
        const load = c / max;
        const hot = load > 0.7;
        return (
          <div key={s.id} style={{
            minWidth: 130, padding: '10px 14px', background: KDS_SUNKEN, borderRadius: 12,
            border: `1px solid ${hot ? 'rgba(245,154,77,0.4)' : KDS_LINE}`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${Math.min(100, load * 100)}%`, background: hot ? KDS_ACCENT : KDS_LIME, transition: 'width 320ms ease-out' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.icon} size={13} color={s.color} />
              </span>
              <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: KDS_FAINT }}>{s.name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 26, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.6, color: KDS_INK }}>{c}</div>
              <div className="tf-mono" style={{ fontSize: 10, color: hot ? KDS_ACCENT : KDS_FAINT, letterSpacing: 1.2 }}>{hot ? 'HOT' : 'OK'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ticket card ─────────────────────────────────────────────────────────────
function TicketCard({ t, onToggle, onBump, large = false }) {
  const bucket = ageBucket(t.fired);
  const meta = KDS_AGE[bucket];
  const allDone = t.items.every(i => i.done);
  const isNew = t.state === 'new';
  const isReady = t.state === 'ready';

  // bump-to-ready: press-and-hold for 600ms
  const [holdPct, setHoldPct] = React.useState(0);
  const holdRef = React.useRef(null);
  const startHold = () => {
    if (!allDone) return;
    const start = performance.now();
    holdRef.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / 600);
      setHoldPct(p);
      if (p >= 1) { clearInterval(holdRef.current); setHoldPct(0); onBump(); dingNew(); }
    }, 16);
  };
  const endHold = () => { clearInterval(holdRef.current); setHoldPct(0); };

  // course groups
  const grouped = { starter: [], main: [], dessert: [] };
  t.items.forEach((it, idx) => grouped[KDS_ITEMS[it.ref].course].push({ ...it, idx }));

  const cardBg = bucket === 'late' ? '#2A1411' : bucket === 'pushing' ? '#211814' : KDS_SURFACE;

  return (
    <div style={{
      background: cardBg, borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${bucket === 'late' ? 'rgba(232,76,68,0.4)' : KDS_LINE}`,
      boxShadow: bucket === 'late' ? '0 0 0 1px rgba(232,76,68,0.16), 0 12px 32px rgba(232,76,68,0.18)' : '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.24)',
      animation: isNew ? 'tf-new-pop 360ms cubic-bezier(0.34,1.36,0.64,1)' : (bucket === 'late' ? 'tf-late-throb 1.6s ease-in-out infinite' : 'none'),
      display: 'flex', flexDirection: 'column',
      opacity: isReady ? 0.55 : 1,
      transition: 'opacity 320ms',
    }}>
      {/* Header strip — color reflects age bucket */}
      <div style={{
        background: meta.color, color: meta.ink,
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {isNew && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'tf-sweep 1.4s ease-out 2' }} />}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, position: 'relative' }}>
          <span className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.7 }}>T-{t.table}</span>
          <span style={{ fontSize: large ? 22 : 18, fontWeight: 600, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>#{t.id}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.7 }}>{meta.label}</span>
          <span className="tf-mono" style={{ fontSize: large ? 22 : 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtMMSS(t.fired)}</span>
        </div>
      </div>

      {/* meta row */}
      <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${KDS_LINE}`, fontSize: 12, color: KDS_MUT }}>
        <span><Icon name="user" size={12} color={KDS_FAINT} /> <span style={{ marginLeft: 4 }}>{t.server} · {t.covers} pax</span></span>
        <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.2, color: KDS_FAINT }}>FIRED {fmtMMSS(t.fired)} ago</span>
      </div>

      {/* Course-grouped items */}
      <div style={{ padding: '8px 8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {KDS_COURSES.filter(c => grouped[c].length).map((c, ci) => (
          <div key={c}>
            <div className="tf-mono" style={{ fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: KDS_FAINT, padding: '2px 8px 4px' }}>
              {ci + 1} · {c === 'starter' ? 'Entrées' : c === 'main' ? 'Plats' : 'Desserts'}
            </div>
            {grouped[c].map(it => {
              const item = KDS_ITEMS[it.ref];
              const station = KDS_STATIONS[item.station];
              return (
                <button key={it.idx} onClick={() => onToggle(it.idx)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 10px', background: it.done ? 'rgba(166,245,98,0.06)' : 'transparent',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                    transition: 'background 160ms',
                  }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                    background: it.done ? KDS_LIME : 'transparent',
                    border: `1.5px solid ${it.done ? KDS_LIME : KDS_LINE_BOLD}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 180ms',
                  }}>
                    {it.done && <Icon name="check" size={14} color="#0E0B07" strokeWidth={2.5} />}
                  </span>
                  <span style={{
                    flexShrink: 0, width: 24, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                    fontSize: large ? 18 : 16, fontWeight: 600, color: KDS_INK,
                  }}>{it.qty}×</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: large ? 17 : 15, fontWeight: 500, color: it.done ? KDS_FAINT : KDS_INK, textDecoration: it.done ? 'line-through' : 'none', letterSpacing: -0.1 }}>
                      {item.fr}
                    </div>
                    <div dir="rtl" style={{ fontSize: 12, color: KDS_FAINT, marginTop: 1, fontFamily: 'system-ui' }}>{item.ar}</div>
                    {it.notes && (
                      <div style={{ marginTop: 4, fontSize: 12, color: KDS_ACCENT, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="info" size={11} color={KDS_ACCENT} /> {it.notes}
                      </div>
                    )}
                  </span>
                  <span style={{ flexShrink: 0, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name={station.icon} size={11} color={station.color} />
                    <span className="tf-mono" style={{ fontSize: 9, letterSpacing: 1.2, color: station.color, textTransform: 'uppercase' }}>{station.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bump bar */}
      <div style={{ padding: '8px 10px 10px', borderTop: `1px solid ${KDS_LINE}`, marginTop: 'auto' }}>
        {isReady ? (
          <div style={{ height: 44, borderRadius: 10, background: 'rgba(166,245,98,0.16)', border: `1px solid ${KDS_LIME}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: KDS_LIME, fontSize: 13, fontWeight: 600 }}>
            <Icon name="check" size={16} color={KDS_LIME} strokeWidth={2.5} /> READY · pass to {t.server}
          </div>
        ) : (
          <button
            onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
            onTouchStart={startHold} onTouchEnd={endHold}
            disabled={!allDone}
            style={{
              width: '100%', height: 44, borderRadius: 10, border: 'none',
              background: allDone ? KDS_LIME : 'rgba(245,239,230,0.04)',
              color: allDone ? '#0E0B07' : KDS_FAINT,
              fontSize: 13, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
              cursor: allDone ? 'pointer' : 'not-allowed',
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {holdPct > 0 && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${holdPct * 100}%`, background: 'rgba(14,11,7,0.2)' }} />}
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="bolt" size={14} color={allDone ? '#0E0B07' : KDS_FAINT} />
              {allDone ? (holdPct > 0 ? `Hold… ${Math.round(holdPct * 100)}%` : 'Hold to bump') : `${t.items.filter(i => !i.done).length} left`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tablet KDS (main artboard) ─────────────────────────────────────────────
function TabletKDS({ width = 1366, height = 1024 }) {
  const [playing, setPlaying] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const sim = useKDSSimulation({ playing, tempo: 1, soundOn });

  const visible = sim.tickets.filter(t => t.state !== 'cleared').filter(t => {
    if (filter === 'all') return true;
    if (filter === 'late') return ageBucket(t.fired) === 'late' || ageBucket(t.fired) === 'pushing';
    if (filter === 'ready') return t.state === 'ready';
    return t.items.some(i => KDS_ITEMS[i.ref].station === filter && !i.done);
  });

  const lateCount = sim.tickets.filter(t => ageBucket(t.fired) === 'late' && t.state !== 'ready').length;

  return (
    <div className="tf" style={{ width, height, background: KDS_BG, color: KDS_INK, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top chrome */}
      <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${KDS_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="display" style={{ fontStyle: 'italic', fontSize: 22, fontWeight: 400 }}>TableFlow</span>
            <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: KDS_FAINT, textTransform: 'uppercase' }}>Kitchen · Dar Souika</span>
          </div>
          <span style={{ width: 1, height: 18, background: KDS_LINE_BOLD }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: playing ? KDS_LIME : KDS_FAINT, animation: playing ? 'tf-pulse 1.6s ease-in-out infinite' : 'none' }} />
            <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: KDS_MUT, textTransform: 'uppercase' }}>{playing ? 'Live · synced' : 'Paused'}</span>
          </div>
        </div>
        <StationLoad tickets={sim.tickets} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSoundOn(s => !s)} title="Audio cue" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${KDS_LINE_BOLD}`, background: soundOn ? 'rgba(166,245,98,0.12)' : KDS_SUNKEN, color: soundOn ? KDS_LIME : KDS_MUT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="bell" size={16} color="currentColor" />
          </button>
          <button onClick={() => setPlaying(p => !p)} title="Play/pause sim" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${KDS_LINE_BOLD}`, background: KDS_SUNKEN, color: KDS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name={playing ? 'pause' : 'play'} size={16} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: `1px solid ${KDS_LINE}` }}>
        {[
          { id: 'all',  label: 'All open',  count: sim.tickets.filter(t => t.state !== 'ready').length },
          { id: 'late', label: 'Pushing / Late', count: sim.tickets.filter(t => ['pushing','late'].includes(ageBucket(t.fired)) && t.state !== 'ready').length, urgent: lateCount > 0 },
          { id: 'cold', label: 'Cold',  count: null, color: KDS_STATIONS.cold.color, icon: 'snow' },
          { id: 'hot',  label: 'Hot',   count: null, color: KDS_STATIONS.hot.color,  icon: 'pan' },
          { id: 'pass', label: 'Pass',  count: null, color: KDS_STATIONS.pass.color, icon: 'pass' },
          { id: 'ready', label: 'Ready · pass', count: sim.tickets.filter(t => t.state === 'ready').length },
        ].map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                height: 34, padding: '0 14px', borderRadius: 17,
                background: on ? KDS_INK : 'transparent',
                color: on ? KDS_BG : KDS_MUT,
                border: `1px solid ${on ? KDS_INK : KDS_LINE_BOLD}`,
                fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
                display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                ...(f.urgent ? { animation: 'tf-late-throb 1.6s ease-in-out infinite' } : {}),
              }}>
              {f.icon && <Icon name={f.icon} size={12} color={on ? KDS_BG : f.color} />}
              {f.label}
              {f.count != null && (
                <span className="tf-mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: on ? 'rgba(14,11,7,0.18)' : 'rgba(245,239,230,0.06)', color: on ? KDS_BG : KDS_MUT, fontVariantNumeric: 'tabular-nums' }}>{f.count}</span>
              )}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <span className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, color: KDS_FAINT, textTransform: 'uppercase' }}>
          Avg cook · 14:32 · best 11:08 today
        </span>
      </div>

      {/* Ticket grid */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 18, background: KDS_BG }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
          {visible.map(t => (
            <TicketCard key={t.id} t={t}
              onToggle={(idx) => sim.toggleItem(t.id, idx)}
              onBump={() => sim.bumpTicket(t.id)} />
          ))}
        </div>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: KDS_FAINT }}>
            <div style={{ fontSize: 22 }} className="display"><em>All clear.</em></div>
            <div className="tf-mono" style={{ fontSize: 11, letterSpacing: 1.4, marginTop: 8 }}>NO TICKETS MATCH FILTER</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wall Display (16:9 — high-glance, no chrome) ───────────────────────────
function WallDisplay({ width = 1920, height = 1080 }) {
  const sim = useKDSSimulation({ playing: true, soundOn: false });
  const open = sim.tickets.filter(t => t.state !== 'cleared').slice(0, 6);
  const sortedByAge = [...open].sort((a, b) => Math.abs(b.fired) - Math.abs(a.fired));

  return (
    <div className="tf" style={{ width, height, background: KDS_BG, color: KDS_INK, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '24px 36px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${KDS_LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span className="display" style={{ fontStyle: 'italic', fontSize: 32, fontWeight: 400 }}>Pass</span>
          <span className="tf-mono" style={{ fontSize: 12, letterSpacing: 1.6, color: KDS_FAINT, textTransform: 'uppercase' }}>Dar Souika · Wall display</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Stat label="Open" value={open.filter(t => t.state !== 'ready').length} />
          <Stat label="Ready" value={open.filter(t => t.state === 'ready').length} color={KDS_LIME} />
          <Stat label="Late" value={open.filter(t => ageBucket(t.fired) === 'late').length} color="#E84C44" />
          <Stat label="Avg cook" value="14:32" mono />
          <span className="tf-mono" style={{ fontSize: 13, letterSpacing: 1.4, color: KDS_INK }}>13:42 · {new Date().toDateString().slice(0, 10)}</span>
        </div>
      </div>
      <div style={{ flex: 1, padding: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '1fr', gap: 18, alignItems: 'stretch' }}>
        {sortedByAge.map(t => (
          <TicketCard key={t.id} t={t} onToggle={() => {}} onBump={() => sim.bumpTicket(t.id)} large />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color = KDS_INK, mono = false }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="tf-mono" style={{ fontSize: 9, letterSpacing: 1.6, color: KDS_FAINT, textTransform: 'uppercase' }}>{label}</div>
      <div className={mono ? 'tf-mono' : ''} style={{ fontSize: mono ? 24 : 28, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { TabletKDS, WallDisplay, useKDSSimulation, dingNew });
