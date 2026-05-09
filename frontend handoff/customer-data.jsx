// customer-data.jsx — TableFlow customer app menu data + helpers

const TF_MENU = {
  restaurant: {
    name: 'Dar Slah',
    location: 'La Marsa · Tunis',
    table: '14',
    waiter: 'Yassine',
  },
  categories: [
    { id: 'all', name: 'All' },
    { id: 'starters', name: 'Starters' },
    { id: 'mains', name: 'Mains' },
    { id: 'sides', name: 'Sides' },
    { id: 'desserts', name: 'Sweets' },
    { id: 'drinks', name: 'Drinks' },
  ],
  items: [
    { id: 'm1', cat: 'starters', name: 'Brik à l\'œuf', price: 9.500, desc: 'Crisp warqa, runny egg, tuna, capers, parsley.', tags: ['signature'], hero: 'sand' },
    { id: 'm2', cat: 'starters', name: 'Salade méchouia', price: 11.000, desc: 'Charred peppers, tomato, garlic, tuna, olive oil.', tags: ['veg-option'], hero: 'red' },
    { id: 'm3', cat: 'starters', name: 'Harissa & olives', price: 6.000, desc: 'House-made rose harissa, mixed Tunisian olives, country bread.', tags: ['vegan', 'spicy'], hero: 'olive' },

    { id: 'm4', cat: 'mains', name: 'Lamb shoulder tagine', price: 32.500, desc: 'Slow-cooked 6 hours, preserved lemon, almond couscous, mint.', tags: ['chef', 'gf'], hero: 'amber', time: '30 min' },
    { id: 'm5', cat: 'mains', name: 'Loup de mer', price: 38.000, desc: 'Whole grilled sea bass, fennel, charred lemon, salsa verde.', tags: ['fresh'], hero: 'silver', time: '25 min' },
    { id: 'm6', cat: 'mains', name: 'Couscous royal', price: 28.000, desc: 'Lamb, merguez, chicken, seven vegetables, hand-rolled couscous.', tags: ['signature'], hero: 'gold', time: '20 min' },
    { id: 'm7', cat: 'mains', name: 'Ojja merguez', price: 19.500, desc: 'Spiced tomato, sausage, eggs, harissa. Pan to table.', tags: ['spicy'], hero: 'red', time: '15 min' },

    { id: 'm8', cat: 'sides', name: 'Charred zaalouk', price: 8.000, desc: 'Smoked aubergine, tomato, cumin, lemon.', tags: ['vegan'], hero: 'olive' },
    { id: 'm9', cat: 'sides', name: 'Bread & smen butter', price: 4.500, desc: 'Khobz tabouna, fermented butter, sea salt.', tags: ['veg'], hero: 'sand' },

    { id: 'm10', cat: 'desserts', name: 'Orange-blossom mhalbi', price: 9.000, desc: 'Rice cream, pistachios, candied citron, neroli syrup.', tags: ['veg'], hero: 'cream' },
    { id: 'm11', cat: 'desserts', name: 'Date & almond cake', price: 9.500, desc: 'Warm, with smen ice cream.', tags: [], hero: 'amber' },

    { id: 'm12', cat: 'drinks', name: 'Mint citron pressé', price: 6.500, desc: 'Lemon, fresh mint, raw cane sugar.', tags: [], hero: 'green' },
    { id: 'm13', cat: 'drinks', name: 'Sidi Ali · sparkling', price: 4.000, desc: '500ml bottle.', tags: [], hero: 'silver' },
    { id: 'm14', cat: 'drinks', name: 'Carthage rosé', price: 14.000, desc: 'By the glass · Mornag.', tags: [], hero: 'pink' },
  ],
};

// Procedural hero "image" — beautiful enough as a placeholder, no fake photos.
// Each item gets a deterministic gradient + texture layer.
function HeroSurface({ kind = 'amber', style = {}, children }) {
  const palettes = {
    amber:  ['#F2C994', '#D97A2C', '#7C3F12'],
    sand:   ['#F4E8D0', '#E2C99B', '#A8854C'],
    red:    ['#F2A89C', '#C8392E', '#5A1410'],
    olive:  ['#D4D29C', '#8A8A4A', '#3F3E1E'],
    silver: ['#E8E4DC', '#B0AEA6', '#5A584F'],
    gold:   ['#F5DCA0', '#D9A841', '#7A4F12'],
    cream:  ['#F5EDD8', '#E0CFA0', '#9C7E48'],
    green:  ['#CFE3B6', '#7AA858', '#2E5A1E'],
    pink:   ['#F2D5D6', '#D9909A', '#7A3A48'],
  };
  const [a, b, c] = palettes[kind] || palettes.amber;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 90% at 22% 18%, ${a} 0%, ${b} 52%, ${c} 100%)`,
      ...style,
    }}>
      {/* warp dots — adds texture, not decoration */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.18,
        backgroundImage: `radial-gradient(${c} 0.6px, transparent 0.6px)`,
        backgroundSize: '6px 6px',
      }} />
      <div style={{ position: 'absolute', inset: 0,
        background: `linear-gradient(160deg, transparent 40%, ${c}33 100%)`,
      }} />
      {children}
    </div>
  );
}

// Tag chip
function TagChip({ tag, dark = false }) {
  const map = {
    signature: { lbl: 'Signature', tone: { bg: '#FBEED9', fg: '#7C3F12' } },
    chef:      { lbl: 'Chef\'s pick', tone: { bg: '#FBEED9', fg: '#7C3F12' } },
    spicy:     { lbl: 'Spicy', tone: { bg: '#FBE6E3', fg: '#8E2218' } },
    vegan:     { lbl: 'Vegan', tone: { bg: '#E6F4EC', fg: '#1F6B43' } },
    veg:       { lbl: 'Veg', tone: { bg: '#E6F4EC', fg: '#1F6B43' } },
    'veg-option': { lbl: 'Veg option', tone: { bg: '#E6F4EC', fg: '#1F6B43' } },
    gf:        { lbl: 'GF', tone: { bg: '#F2EFE8', fg: '#5A4F40' } },
    fresh:     { lbl: 'Fresh today', tone: { bg: '#E8F0F4', fg: '#2A506E' } },
  };
  const m = map[tag];
  if (!m) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 22,
      padding: '0 8px', borderRadius: 999,
      background: m.tone.bg, color: m.tone.fg,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.1,
    }}>{m.lbl}</span>
  );
}

const fmtTND = (n) => n.toFixed(3);

Object.assign(window, { TF_MENU, HeroSurface, TagChip, fmtTND });
