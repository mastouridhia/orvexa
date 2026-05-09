// kitchen-data.jsx — sample tickets for the KDS demo
// Bilingual (FR primary, AR secondary), with course + station routing.

const KDS_STATIONS = {
  cold:  { id: 'cold',  name: 'Cold',  ar: 'بارد',   color: '#7AC4F5', icon: 'snow' },
  hot:   { id: 'hot',   name: 'Hot',   ar: 'ساخن',   color: '#F59A4D', icon: 'pan' },
  pass:  { id: 'pass',  name: 'Pass',  ar: 'تمرير',  color: '#A6F562', icon: 'pass' },
};

const KDS_COURSES = ['starter', 'main', 'dessert'];

// Item bank (lifted from customer menu, abridged)
const KDS_ITEMS = {
  brik:    { fr: 'Brik à l\'œuf', ar: 'بريك بالبيض', station: 'hot',  course: 'starter', prep: 7 },
  salade:  { fr: 'Salade méchouia', ar: 'سلاطة مشوية', station: 'cold', course: 'starter', prep: 3 },
  oct:     { fr: 'Poulpe grillé', ar: 'أخطبوط مشوي', station: 'hot',  course: 'starter', prep: 12 },
  shak:    { fr: 'Chakchouka', ar: 'شكشوكة', station: 'hot',  course: 'main', prep: 14 },
  lamb:    { fr: 'Épaule d\'agneau', ar: 'كتف الخروف', station: 'hot',  course: 'main', prep: 32 },
  loup:    { fr: 'Loup de mer', ar: 'سمك الذئب', station: 'hot',  course: 'main', prep: 18 },
  mech:    { fr: 'Couscous merguez', ar: 'كسكسي مرقاز', station: 'hot',  course: 'main', prep: 16 },
  tab:     { fr: 'Taboulé citron', ar: 'تبولة بالليمون', station: 'cold', course: 'starter', prep: 4 },
  bambo:   { fr: 'Bambalouni', ar: 'بمبلوني', station: 'pass', course: 'dessert', prep: 6 },
  yog:     { fr: 'Yaourt miel', ar: 'لبن وعسل', station: 'cold', course: 'dessert', prep: 2 },
  cafe:    { fr: 'Café Turc', ar: 'قهوة تركية', station: 'pass', course: 'dessert', prep: 3 },
};

// Generate a starting set of tickets at varied ages, so the board feels alive
// the moment it loads. Times are seconds since fired.
const KDS_INITIAL = [
  {
    id: '2406-A', table: 14, server: 'Yassine', covers: 2, fired: -180, // 3min ago
    state: 'cooking',
    items: [
      { ref: 'salade', qty: 1, done: true,  notes: '' },
      { ref: 'brik',   qty: 1, done: false, notes: 'Bien cuit' },
      { ref: 'lamb',   qty: 1, done: false, notes: '' },
      { ref: 'loup',   qty: 1, done: false, notes: 'Sans coriandre' },
    ],
  },
  {
    id: '2407-B', table: 7,  server: 'Inès',    covers: 4, fired: -540, // 9min — pushing on lamb
    state: 'cooking',
    items: [
      { ref: 'oct',    qty: 2, done: true,  notes: '' },
      { ref: 'tab',    qty: 1, done: true,  notes: '' },
      { ref: 'lamb',   qty: 2, done: false, notes: 'Saignant ×1, à point ×1' },
      { ref: 'shak',   qty: 1, done: false, notes: 'Épicé +' },
      { ref: 'mech',   qty: 1, done: false, notes: '' },
    ],
  },
  {
    id: '2408-C', table: 22, server: 'Karim',  covers: 2, fired: -22, // 22sec — fresh
    state: 'new',
    items: [
      { ref: 'salade', qty: 1, done: false, notes: '' },
      { ref: 'brik',   qty: 1, done: false, notes: '' },
      { ref: 'shak',   qty: 1, done: false, notes: 'Sans piment' },
      { ref: 'cafe',   qty: 2, done: false, notes: '— sucré' },
    ],
  },
  {
    id: '2409-D', table: 3,  server: 'Inès',    covers: 3, fired: -380,
    state: 'cooking',
    items: [
      { ref: 'tab',    qty: 1, done: true,  notes: '' },
      { ref: 'oct',    qty: 1, done: true,  notes: '' },
      { ref: 'mech',   qty: 2, done: false, notes: 'Allergie arachides' },
      { ref: 'loup',   qty: 1, done: false, notes: '' },
    ],
  },
  {
    id: '2410-E', table: 11, server: 'Yassine', covers: 2, fired: -60,
    state: 'cooking',
    items: [
      { ref: 'salade', qty: 2, done: false, notes: '' },
      { ref: 'shak',   qty: 1, done: false, notes: '' },
      { ref: 'mech',   qty: 1, done: false, notes: '' },
    ],
  },
  {
    id: '2411-F', table: 18, server: 'Karim',  covers: 4, fired: -720, // 12min — late on board
    state: 'cooking',
    items: [
      { ref: 'brik',   qty: 2, done: true,  notes: '' },
      { ref: 'oct',    qty: 1, done: true,  notes: '' },
      { ref: 'lamb',   qty: 3, done: false, notes: 'Table VIP' },
      { ref: 'bambo',  qty: 4, done: false, notes: 'Servir avec mains' },
    ],
  },
];

// Aging thresholds (seconds since fired) → status for each ticket
// fresh: < 2min, normal: 2–6min, pushing: 6–10min, late: 10min+
const KDS_AGE = {
  fresh:   { max: 120,  label: 'Fresh',   color: '#A6F562', ink: '#1A2410' },
  normal:  { max: 360,  label: 'Cooking', color: '#F5EFE6', ink: '#1A1410' },
  pushing: { max: 600,  label: 'Pushing', color: '#F59A4D', ink: '#1A1410' },
  late:    { max: 9999, label: 'Late',    color: '#E84C44', ink: '#FFFFFF' },
};

const ageBucket = (sec) => {
  const s = Math.abs(sec);
  if (s < KDS_AGE.fresh.max)   return 'fresh';
  if (s < KDS_AGE.normal.max)  return 'normal';
  if (s < KDS_AGE.pushing.max) return 'pushing';
  return 'late';
};

const fmtMMSS = (s) => {
  const m = Math.floor(Math.abs(s) / 60);
  const r = Math.floor(Math.abs(s) % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

Object.assign(window, { KDS_STATIONS, KDS_COURSES, KDS_ITEMS, KDS_INITIAL, KDS_AGE, ageBucket, fmtMMSS });
