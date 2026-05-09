// moodboards.jsx — three directional options as artboards
// Editorial / Tech-Crisp / Hospitality-Soft (the chosen Saffron is a refinement of #3)

const MoodEditorial = () => (
  <div className="tf" style={{ width: '100%', height: '100%', background: '#F4EFE6', color: '#1A1410', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '40px 40px 0', display: 'flex', justifyContent: 'space-between' }}>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(26,20,16,0.5)' }}>Direction A</div>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(26,20,16,0.5)' }}>Editorial · warm-minimal</div>
    </div>
    <div style={{ padding: '24px 40px', flex: 1 }}>
      <div className="display" style={{ fontSize: 76, fontStyle: 'italic', fontWeight: 400, lineHeight: 0.96, letterSpacing: -2.6, marginBottom: 20 }}>
        A menu,<br/>printed in light.
      </div>
      <div style={{ fontSize: 14, color: 'rgba(26,20,16,0.6)', maxWidth: 360, lineHeight: 1.5, marginBottom: 32 }}>
        Serif display, generous tracking, paper tones. Restraint as the point of view. Reads like a Michelin-guide insert, not a SaaS dashboard.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[['Display', '"Newsreader" italic'], ['Body', 'Geist · 15/24'], ['Accent', '#A8561A clay'], ['Density', 'Spacious — 32 grid']].map(([k, v]) => (
          <div key={k} style={{ paddingTop: 12, borderTop: '1px solid rgba(26,20,16,0.15)' }}>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(26,20,16,0.5)' }}>{k}</div>
            <div style={{ fontSize: 14, marginTop: 4, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'inline-flex', gap: 10, padding: 10, background: '#EBE3D2', borderRadius: 32 }}>
        {[['#F4EFE6','Paper'], ['#E8DFCC','Sand'], ['#A8561A','Clay'], ['#1A1410','Ink']].map(([c, n]) => (
          <div key={c} title={n} style={{ width: 44, height: 44, borderRadius: 22, background: c, boxShadow: 'inset 0 0 0 1px rgba(26,20,16,0.18)' }} />
        ))}
      </div>
    </div>
    <div style={{ padding: '20px 40px', borderTop: '1px solid rgba(26,20,16,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontStyle: 'italic' }} className="display">Slow food, slow design.</span>
      <span className="tf-mono" style={{ fontSize: 11, color: 'rgba(26,20,16,0.5)' }}>01 / 03</span>
    </div>
  </div>
);

const MoodTech = () => (
  <div className="tf" style={{ width: '100%', height: '100%', background: '#0E0E10', color: '#F4F4F5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '40px 40px 0', display: 'flex', justifyContent: 'space-between' }}>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(244,244,245,0.45)' }}>Direction B</div>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(244,244,245,0.45)' }}>Tech-crisp · linear-coded</div>
    </div>
    <div style={{ padding: '24px 40px', flex: 1 }}>
      <div style={{ fontSize: 64, fontWeight: 500, lineHeight: 1, letterSpacing: -2, marginBottom: 20 }}>
        Restaurant ops,<br/><span style={{ color: '#A6F562' }}>shipped weekly.</span>
      </div>
      <div style={{ fontSize: 14, color: 'rgba(244,244,245,0.6)', maxWidth: 360, lineHeight: 1.5, marginBottom: 32 }}>
        Geometric sans, near-black surfaces, sharp grid. Operator-coded. Could pass for a developer tool — which is the point on Kitchen + Admin.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[['Display', 'Geist · 64/56'], ['Mono', 'Geist Mono'], ['Accent', '#A6F562 lime'], ['Density', 'Tight — 8/12 grid']].map(([k, v]) => (
          <div key={k} style={{ paddingTop: 12, borderTop: '1px solid rgba(244,244,245,0.1)' }}>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(244,244,245,0.45)' }}>{k}</div>
            <div style={{ fontSize: 14, marginTop: 4, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'inline-flex', gap: 10, padding: 10, background: '#1A1A1D', borderRadius: 12 }}>
        {[['#0E0E10','Pitch'], ['#1F1F22','Slate'], ['#A6F562','Lime'], ['#F4F4F5','Bone']].map(([c, n]) => (
          <div key={c} title={n} style={{ width: 44, height: 44, borderRadius: 6, background: c, boxShadow: 'inset 0 0 0 1px rgba(244,244,245,0.18)' }} />
        ))}
      </div>
    </div>
    <div style={{ padding: '20px 40px', borderTop: '1px solid rgba(244,244,245,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="tf-mono" style={{ fontSize: 11, color: 'rgba(244,244,245,0.45)' }}>v1.0.0 · main · 2026.04</span>
      <span className="tf-mono" style={{ fontSize: 11, color: 'rgba(244,244,245,0.45)' }}>02 / 03</span>
    </div>
  </div>
);

const MoodHospitality = () => (
  <div className="tf" style={{ width: '100%', height: '100%', background: '#FAF8F4', color: '#19140E', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 16, right: 16, padding: '4px 10px', background: '#19140E', color: '#FAF8F4', borderRadius: 999, fontSize: 10, fontWeight: 500, letterSpacing: 1.2 }} className="tf-mono">SELECTED</div>
    <div style={{ padding: '40px 40px 0', display: 'flex', justifyContent: 'space-between' }}>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>Direction C</div>
      <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>Saffron · hospitality-soft</div>
    </div>
    <div style={{ padding: '24px 40px', flex: 1 }}>
      <div style={{ fontSize: 60, fontWeight: 500, lineHeight: 1, letterSpacing: -2, marginBottom: 6 }}>
        The good kind of <span className="display" style={{ fontStyle: 'italic', color: '#D97A2C', fontWeight: 400 }}>quick.</span>
      </div>
      <div style={{ fontSize: 14, color: 'rgba(25,20,14,0.6)', maxWidth: 380, lineHeight: 1.5, marginTop: 18, marginBottom: 32 }}>
        Warm-paper neutrals, italic serif accents, one confident saffron. Software-precise where it counts; hospitable everywhere else. Works for diners and operators without two visual systems.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[['Display', 'Newsreader italic'], ['Body', 'Geist 15/24'], ['Accent', '#D97A2C saffron'], ['Density', 'Modular — 4/8/16']].map(([k, v]) => (
          <div key={k} style={{ paddingTop: 12, borderTop: '1px solid rgba(25,20,14,0.12)' }}>
            <div className="tf-mono" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(25,20,14,0.5)' }}>{k}</div>
            <div style={{ fontSize: 14, marginTop: 4, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'inline-flex', gap: 10, padding: 10, background: '#EBE5DA', borderRadius: 16 }}>
        {[['#FAF8F4','Paper'], ['#F2EFE8','Linen'], ['#D97A2C','Saffron'], ['#19140E','Ink']].map(([c, n]) => (
          <div key={c} title={n} style={{ width: 44, height: 44, borderRadius: 10, background: c, boxShadow: 'inset 0 0 0 1px rgba(25,20,14,0.16)' }} />
        ))}
      </div>
    </div>
    <div style={{ padding: '20px 40px', borderTop: '1px solid rgba(25,20,14,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13 }}>Tunisian. Not literal about it.</span>
      <span className="tf-mono" style={{ fontSize: 11, color: 'rgba(25,20,14,0.5)' }}>03 / 03</span>
    </div>
  </div>
);

Object.assign(window, { MoodEditorial, MoodTech, MoodHospitality });
