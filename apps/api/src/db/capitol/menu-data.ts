/**
 * Capitol Park — menu reset 2026-06-13.
 * Sections: Restaurant · Pizzeria · Café.
 * Prices in millimes (1 TND = 1000 millimes).
 */

export type VariantDef = {
  nameAr: string;
  nameFr: string;
  nameEn: string;
  priceDeltaMillimes: number;
};

export type VariantGroupDef = {
  nameAr: string;
  nameFr: string;
  nameEn: string;
  selectionType: 'single' | 'multi';
  required: boolean;
  minChoices: number;
  maxChoices: number;
  variants: VariantDef[];
};

export type DishDef = {
  nameAr: string;
  nameFr: string;
  nameEn: string;
  descriptionFr?: string;
  priceMillimes: number;
  groups?: VariantGroupDef[];
};

export type CategoryDef = {
  nameAr: string;
  nameFr: string;
  nameEn: string;
  dishes: DishDef[];
};

// ══════════════════════════ Helpers ══════════════════════════

function fillingGroup(variants: VariantDef[]): VariantGroupDef {
  return {
    nameAr: 'الحشوة',
    nameFr: 'Garniture',
    nameEn: 'Filling',
    selectionType: 'single',
    required: true,
    minChoices: 1,
    maxChoices: 1,
    variants,
  };
}

function sizeGroupLargeMaxi(large: number, maxi: number): VariantGroupDef {
  return {
    nameAr: 'الحجم',
    nameFr: 'Taille',
    nameEn: 'Size',
    selectionType: 'single',
    required: true,
    minChoices: 1,
    maxChoices: 1,
    variants: [
      { nameAr: 'لارج', nameFr: 'Large', nameEn: 'Large', priceDeltaMillimes: 0 },
      { nameAr: 'ماكسي', nameFr: 'Maxi', nameEn: 'Maxi', priceDeltaMillimes: maxi - large },
    ],
  };
}

function sizeGroupMoyenneMaxi(moyenne: number, maxi: number): VariantGroupDef {
  return {
    nameAr: 'الحجم',
    nameFr: 'Taille',
    nameEn: 'Size',
    selectionType: 'single',
    required: true,
    minChoices: 1,
    maxChoices: 1,
    variants: [
      { nameAr: 'موين', nameFr: 'Moyenne', nameEn: 'Medium', priceDeltaMillimes: 0 },
      { nameAr: 'ماكسي', nameFr: 'Maxi', nameEn: 'Maxi', priceDeltaMillimes: maxi - moyenne },
    ],
  };
}

function sizeGroupWith05m(large: number, maxi: number, half: number): VariantGroupDef {
  return {
    nameAr: 'الحجم',
    nameFr: 'Taille',
    nameEn: 'Size',
    selectionType: 'single',
    required: true,
    minChoices: 1,
    maxChoices: 1,
    variants: [
      { nameAr: 'لارج', nameFr: 'Large', nameEn: 'Large', priceDeltaMillimes: 0 },
      { nameAr: 'ماكسي', nameFr: 'Maxi', nameEn: 'Maxi', priceDeltaMillimes: maxi - large },
      { nameAr: '٠٫٥ م', nameFr: '0.5m', nameEn: '0.5m', priceDeltaMillimes: half - large },
    ],
  };
}

function sizeGroupWith06m(large: number, maxi: number, six: number): VariantGroupDef {
  return {
    nameAr: 'الحجم',
    nameFr: 'Taille',
    nameEn: 'Size',
    selectionType: 'single',
    required: true,
    minChoices: 1,
    maxChoices: 1,
    variants: [
      { nameAr: 'لارج', nameFr: 'Large', nameEn: 'Large', priceDeltaMillimes: 0 },
      { nameAr: 'ماكسي', nameFr: 'Maxi', nameEn: 'Maxi', priceDeltaMillimes: maxi - large },
      { nameAr: '٠٫٦ م', nameFr: '0.6m', nameEn: '0.6m', priceDeltaMillimes: six - large },
    ],
  };
}

// ══════════════════════ Sandwich fillings (new prices) ══════════════════════

// Tabouna base 4,000
const FILLINGS_TABOUNA: VariantDef[] = [
  { nameAr: 'جامبون',         nameFr: 'Jambon',          nameEn: 'Ham',              priceDeltaMillimes: 500  },
  { nameAr: 'تن',             nameFr: 'Thon',             nameEn: 'Tuna',             priceDeltaMillimes: 1500 },
  { nameAr: 'جبن',            nameFr: 'Fromage',          nameEn: 'Cheese',           priceDeltaMillimes: 2000 },
  { nameAr: 'شاورما',         nameFr: 'Chawarma',         nameEn: 'Shawarma',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب',        nameFr: 'Escalope',         nameEn: 'Escalope',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب باني',   nameFr: 'Escalope Panée',   nameEn: 'Breaded Escalope', priceDeltaMillimes: 4000 },
  { nameAr: 'كوردون بلو',     nameFr: 'Cordon Bleu',      nameEn: 'Cordon Bleu',      priceDeltaMillimes: 3000 },
  { nameAr: 'كباب',           nameFr: 'Kabeb',            nameEn: 'Kebab',            priceDeltaMillimes: 3000 },
];

// Cornet base 6,000
const FILLINGS_CORNET: VariantDef[] = [
  { nameAr: 'جامبون',         nameFr: 'Jambon',          nameEn: 'Ham',              priceDeltaMillimes: 500  },
  { nameAr: 'تن',             nameFr: 'Thon',             nameEn: 'Tuna',             priceDeltaMillimes: 1500 },
  { nameAr: 'جبن',            nameFr: 'Fromage',          nameEn: 'Cheese',           priceDeltaMillimes: 2000 },
  { nameAr: 'شاورما',         nameFr: 'Chawarma',         nameEn: 'Shawarma',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب',        nameFr: 'Escalope',         nameEn: 'Escalope',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب باني',   nameFr: 'Escalope Panée',   nameEn: 'Breaded Escalope', priceDeltaMillimes: 4000 },
  { nameAr: 'كوردون بلو',     nameFr: 'Cordon Bleu',      nameEn: 'Cordon Bleu',      priceDeltaMillimes: 3000 },
  { nameAr: 'كباب',           nameFr: 'Kabeb',            nameEn: 'Kebab',            priceDeltaMillimes: 3000 },
];

// Makloub base 6,000
const FILLINGS_MAKLOUB: VariantDef[] = [
  { nameAr: 'جامبون',         nameFr: 'Jambon',          nameEn: 'Ham',              priceDeltaMillimes: 500  },
  { nameAr: 'تن',             nameFr: 'Thon',             nameEn: 'Tuna',             priceDeltaMillimes: 1000 },
  { nameAr: 'جبن',            nameFr: 'Fromage',          nameEn: 'Cheese',           priceDeltaMillimes: 1500 },
  { nameAr: 'شاورما',         nameFr: 'Chawarma',         nameEn: 'Shawarma',         priceDeltaMillimes: 2500 },
  { nameAr: 'اسكالوب',        nameFr: 'Escalope',         nameEn: 'Escalope',         priceDeltaMillimes: 2500 },
  { nameAr: 'اسكالوب باني',   nameFr: 'Escalope Panée',   nameEn: 'Breaded Escalope', priceDeltaMillimes: 3000 },
  { nameAr: 'كوردون بلو',     nameFr: 'Cordon Bleu',      nameEn: 'Cordon Bleu',      priceDeltaMillimes: 2500 },
  { nameAr: 'كباب',           nameFr: 'Kabeb',            nameEn: 'Kebab',            priceDeltaMillimes: 2500 },
];

// Baguette base 6,500 (no Cordon Bleu)
const FILLINGS_BAGUETTE: VariantDef[] = [
  { nameAr: 'جامبون',         nameFr: 'Jambon',          nameEn: 'Ham',              priceDeltaMillimes: 500  },
  { nameAr: 'تن',             nameFr: 'Thon',             nameEn: 'Tuna',             priceDeltaMillimes: 1500 },
  { nameAr: 'جبن',            nameFr: 'Fromage',          nameEn: 'Cheese',           priceDeltaMillimes: 2000 },
  { nameAr: 'شاورما',         nameFr: 'Chawarma',         nameEn: 'Shawarma',         priceDeltaMillimes: 2500 },
  { nameAr: 'اسكالوب',        nameFr: 'Escalope',         nameEn: 'Escalope',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب باني',   nameFr: 'Escalope Panée',   nameEn: 'Breaded Escalope', priceDeltaMillimes: 3500 },
  { nameAr: 'كباب',           nameFr: 'Kabeb',            nameEn: 'Kebab',            priceDeltaMillimes: 3000 },
];

// Tacos base 5,500 (no Cordon Bleu)
const FILLINGS_TACOS: VariantDef[] = [
  { nameAr: 'جامبون',         nameFr: 'Jambon',          nameEn: 'Ham',              priceDeltaMillimes: 500  },
  { nameAr: 'تن',             nameFr: 'Thon',             nameEn: 'Tuna',             priceDeltaMillimes: 1500 },
  { nameAr: 'جبن',            nameFr: 'Fromage',          nameEn: 'Cheese',           priceDeltaMillimes: 2000 },
  { nameAr: 'شاورما',         nameFr: 'Chawarma',         nameEn: 'Shawarma',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب',        nameFr: 'Escalope',         nameEn: 'Escalope',         priceDeltaMillimes: 3000 },
  { nameAr: 'اسكالوب باني',   nameFr: 'Escalope Panée',   nameEn: 'Breaded Escalope', priceDeltaMillimes: 3500 },
  { nameAr: 'كباب',           nameFr: 'Kabeb',            nameEn: 'Kebab',            priceDeltaMillimes: 1500 },
];

// ══════════════════════════ MENU ══════════════════════════

export const CAPITOL_MENU: CategoryDef[] = [

  // ════════════ RESTAURANT ════════════

  {
    nameAr: 'مقبلات وشربة',
    nameFr: 'Entrées & Soupes',
    nameEn: 'Appetizers & Soups',
    dishes: [
      { nameAr: 'عجة مرقاز',        nameFr: 'Ojja Merguez',       nameEn: 'Merguez Ojja',   priceMillimes: 8000  },
      { nameAr: 'عجة اسكالوب',      nameFr: 'Ojja Escalope',      nameEn: 'Escalope Ojja',  priceMillimes: 8000  },
      { nameAr: 'عجة بالمخ',        nameFr: 'Ojja Cerveau',       nameEn: 'Brain Ojja',     priceMillimes: 8000  },
      { nameAr: 'عجة بالتن',        nameFr: 'Ojja Thon',          nameEn: 'Tuna Ojja',      priceMillimes: 8000  },
      { nameAr: 'عجة غلال البحر',   nameFr: 'Ojja Fruits de Mer', nameEn: 'Seafood Ojja',   priceMillimes: 12000 },
      { nameAr: 'شربة مفورة',       nameFr: 'Soupe Mfawra',       nameEn: 'Steamed Soup',   priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'السلطات',
    nameFr: 'Salades',
    nameEn: 'Salads',
    dishes: [
      { nameAr: 'شمنكة علوش',         nameFr: 'Chminka Agneau',      nameEn: 'Lamb Chminka',    priceMillimes: 10000 },
      { nameAr: 'سلطة مشوية',         nameFr: 'Salade Grillée',      nameEn: 'Grilled Salad',   priceMillimes: 3000  },
      { nameAr: 'سلطة خضراء',         nameFr: 'Salade Verte',        nameEn: 'Green Salad',     priceMillimes: 3000  },
      { nameAr: 'سلطة رويال',         nameFr: 'Salade Royale',       nameEn: 'Royal Salad',     priceMillimes: 5000  },
      { nameAr: 'سلطة كابيتول',       nameFr: 'Salade Capitol',      nameEn: 'Capitol Salad',   priceMillimes: 5000  },
      { nameAr: 'سلطة خضراء ملكية',   nameFr: 'Salade Verte Royale', nameEn: 'Royal Green Salad', priceMillimes: 5000 },
    ],
  },

  {
    nameAr: 'مقرونة وروز',
    nameFr: 'Pâtes & Riz',
    nameEn: 'Pasta & Rice',
    dishes: [
      { nameAr: 'مقرونة علوش',       nameFr: 'Macrouna Alouch',          nameEn: 'Lamb Pasta',        priceMillimes: 18000 },
      { nameAr: 'مقرونة غلال البحر', nameFr: 'Macrouna Fruits de Mer',   nameEn: 'Seafood Pasta',     priceMillimes: 25000 },
      { nameAr: 'سباقتي بولونيز',    nameFr: 'Spaghetti Bolognaise',     nameEn: 'Spaghetti Bolognese', priceMillimes: 15000 },
      { nameAr: 'روز جربي',          nameFr: 'Riz Djerbien',             nameEn: 'Djerbian Rice',     priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'الكسكسي',
    nameFr: 'Couscous',
    nameEn: 'Couscous',
    dishes: [
      { nameAr: 'كسكسي علوش / عصبان', nameFr: 'Couscous Alouch / Osbane', nameEn: 'Lamb / Osbane Couscous', priceMillimes: 18000 },
      { nameAr: 'كسكسي حوت',          nameFr: 'Couscous Poisson',         nameEn: 'Fish Couscous',          priceMillimes: 15000 },
    ],
  },

  {
    nameAr: 'أطباق صحن',
    nameFr: 'Plats en Assiette',
    nameEn: 'Plate Dishes',
    dishes: [
      { nameAr: 'صحن تونسي',        nameFr: 'Plat Tunisien',         nameEn: 'Tunisian Plate',        priceMillimes: 7000  },
      { nameAr: 'صحن سكالوب',       nameFr: 'Plat Escalope',         nameEn: 'Escalope Plate',        priceMillimes: 10000 },
      { nameAr: 'صحن بارك كابيتول', nameFr: 'Plat Parc Capitol',     nameEn: 'Capitol Park Plate',    priceMillimes: 15000 },
      { nameAr: 'صحن مشوي مرقز',    nameFr: 'Plat Mechoui Merguez',  nameEn: 'Grilled Merguez Plate', priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'مشاوي',
    nameFr: 'Grillades',
    nameEn: 'Grills',
    dishes: [
      { nameAr: 'مشوي دجاج', nameFr: 'Mechoui Poulet', nameEn: 'Grilled Chicken', priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'أطباق دجاج',
    nameFr: 'Plats Poulet',
    nameEn: 'Chicken Dishes',
    dishes: [
      { nameAr: 'دجاج مفور',       nameFr: 'Poulet Mfawer', nameEn: 'Steamed Chicken', priceMillimes: 15000 },
      { nameAr: 'دجاج في الكوشة', nameFr: 'Poulet Koucha', nameEn: 'Roast Chicken',   priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'أطباق لحم',
    nameFr: 'Plats Viande',
    nameEn: 'Meat Dishes',
    dishes: [
      { nameAr: 'لحم في القلة', nameFr: 'Kolla Viande',   nameEn: 'Meat in Clay Jar',       priceMillimes: 22000 },
      { nameAr: 'زاوش شوابي',  nameFr: 'Zawech Chwabi',  nameEn: 'Small Game Birds Chwabi', priceMillimes: 15000 },
    ],
  },

  {
    nameAr: 'موسلي',
    nameFr: 'Mosli',
    nameEn: 'Mosli',
    dishes: [
      { nameAr: 'موسلي دجاج / حوت', nameFr: 'Mosli Poulet / Poisson', nameEn: 'Mosli Chicken / Fish', priceMillimes: 15000 },
      { nameAr: 'موسلي رأس علوش',   nameFr: 'Mosli Rass Alouch',      nameEn: 'Mosli Lamb Head',      priceMillimes: 20000 },
    ],
  },

  {
    nameAr: 'طواجن',
    nameFr: 'Tajines',
    nameEn: 'Tajines',
    dishes: [
      { nameAr: 'تاجين الباي', nameFr: 'Tajine du Bey', nameEn: 'Bey Tajine', priceMillimes: 10000 },
    ],
  },

  {
    nameAr: 'الحوت',
    nameFr: 'Poisson',
    nameEn: 'Seafood',
    dishes: [
      { nameAr: 'مشوي حوت',       nameFr: 'Mechoui Poisson', nameEn: 'Grilled Fish', priceMillimes: 15000 },
      { nameAr: 'حوت في الكوشة', nameFr: 'Poisson Koucha',  nameEn: 'Baked Fish',   priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'الأطباق التقليدية',
    nameFr: 'Plats Traditionnels',
    nameEn: 'Traditional Dishes',
    dishes: [
      { nameAr: 'جلبانة علوش',  nameFr: 'Jelbena Alouch', nameEn: 'Lamb Jelbena',    priceMillimes: 18000 },
      { nameAr: 'جلبانة شوابي', nameFr: 'Jelbena Chwabi', nameEn: 'Chwabi Jelbena',  priceMillimes: 15000 },
      { nameAr: 'قالية علوش',   nameFr: 'Klaya Alouch',   nameEn: 'Lamb Klaya',      priceMillimes: 15000 },
      { nameAr: 'ملوخية علوش',  nameFr: 'Mloukhia Alouch', nameEn: 'Lamb Mloukhia', priceMillimes: 18000 },
      { nameAr: 'كمونية علوش',  nameFr: 'Kamounia Alouch', nameEn: 'Lamb Kamounia', priceMillimes: 18000 },
    ],
  },

  // ════════════ PIZZERIA ════════════

  {
    nameAr: 'الساندويتشات',
    nameFr: 'Sandwiches',
    nameEn: 'Sandwiches',
    dishes: [
      {
        nameAr: 'باغيت محشوة',
        nameFr: 'Baguette Farcie',
        nameEn: 'Stuffed Baguette',
        priceMillimes: 6500,
        groups: [fillingGroup(FILLINGS_BAGUETTE)],
      },
      {
        nameAr: 'تاكوس',
        nameFr: 'Tacos',
        nameEn: 'Tacos',
        priceMillimes: 5500,
        groups: [fillingGroup(FILLINGS_TACOS)],
      },
    ],
  },

  {
    nameAr: 'تابونة',
    nameFr: 'Tabouna',
    nameEn: 'Tabouna',
    dishes: [
      {
        nameAr: 'تابونة',
        nameFr: 'Tabouna',
        nameEn: 'Tabouna',
        descriptionFr: 'Pain tabouna garni au four',
        priceMillimes: 4000,
        groups: [fillingGroup(FILLINGS_TABOUNA)],
      },
    ],
  },

  {
    nameAr: 'كورنيه ومقلوب',
    nameFr: 'Cornet & Makloub',
    nameEn: 'Cornet & Makloub',
    dishes: [
      {
        nameAr: 'كورنيه',
        nameFr: 'Cornet',
        nameEn: 'Cornet',
        priceMillimes: 6000,
        groups: [fillingGroup(FILLINGS_CORNET)],
      },
      {
        nameAr: 'مقلوب',
        nameFr: 'Makloub',
        nameEn: 'Makloub',
        priceMillimes: 6000,
        groups: [fillingGroup(FILLINGS_MAKLOUB)],
      },
    ],
  },

  {
    nameAr: 'البيتزا',
    nameFr: 'Pizza',
    nameEn: 'Pizza',
    dishes: [
      {
        nameAr: 'مارغريتا',
        nameFr: 'Margherita',
        nameEn: 'Margherita',
        priceMillimes: 8000,
        groups: [sizeGroupLargeMaxi(8000, 12000)],
      },
      {
        nameAr: 'نباتية',
        nameFr: 'Végétarienne',
        nameEn: 'Vegetarian',
        priceMillimes: 9000,
        groups: [sizeGroupLargeMaxi(9000, 12000)],
      },
      {
        nameAr: 'نبتون',
        nameFr: 'Neptune',
        nameEn: 'Neptune',
        descriptionFr: 'Thon',
        priceMillimes: 12000,
        groups: [sizeGroupWith05m(12000, 15000, 20000)],
      },
      {
        nameAr: 'مكسيكية',
        nameFr: 'Mexican',
        nameEn: 'Mexican',
        priceMillimes: 13000,
        groups: [sizeGroupWith06m(13000, 15000, 20000)],
      },
      {
        nameAr: '٤ أجبان',
        nameFr: '4 Fromages',
        nameEn: '4 Cheeses',
        priceMillimes: 14000,
        groups: [sizeGroupMoyenneMaxi(14000, 18000)],
      },
      {
        nameAr: '٤ فصول',
        nameFr: '4 Saisons',
        nameEn: '4 Seasons',
        priceMillimes: 14000,
        groups: [sizeGroupLargeMaxi(14000, 18000)],
      },
      {
        nameAr: 'كابريزي',
        nameFr: 'Capresi',
        nameEn: 'Capresi',
        priceMillimes: 14000,
        groups: [sizeGroupWith05m(14000, 16000, 20000)],
      },
      {
        nameAr: 'فواكه البحر',
        nameFr: 'Fruits de Mer',
        nameEn: 'Seafood Pizza',
        priceMillimes: 14000,
        groups: [sizeGroupLargeMaxi(14000, 18000)],
      },
      {
        nameAr: 'تركية',
        nameFr: 'Turc',
        nameEn: 'Turkish',
        priceMillimes: 15000,
        groups: [sizeGroupLargeMaxi(15000, 18000)],
      },
    ],
  },

  // ════════════ CAFÉ ════════════

  {
    nameAr: 'قهوة',
    nameFr: 'Café',
    nameEn: 'Coffee',
    dishes: [
      { nameAr: 'إكسبريسو',           nameFr: 'Expresso',            nameEn: 'Espresso',          priceMillimes: 2000 },
      { nameAr: 'ألونجيه',            nameFr: 'Allongé',             nameEn: 'Long Coffee',       priceMillimes: 2000 },
      { nameAr: 'دمي',                nameFr: 'Demi',                nameEn: 'Half',              priceMillimes: 2000 },
      { nameAr: 'فيلتر',              nameFr: 'Filter',              nameEn: 'Filter Coffee',     priceMillimes: 2000 },
      { nameAr: 'أمريكان',            nameFr: 'Américain',           nameEn: 'Americano',         priceMillimes: 2000 },
      { nameAr: 'دايركت',             nameFr: 'Direct',              nameEn: 'Direct',            priceMillimes: 3000 },
      { nameAr: 'دايركت مع نكهة',     nameFr: 'Direct avec Goût',    nameEn: 'Flavored Direct',   priceMillimes: 3500 },
      { nameAr: 'كابوتشين بدون نكهة', nameFr: 'Cappucin sans Goût',  nameEn: 'Plain Cappucin',    priceMillimes: 2200 },
      { nameAr: 'كابوتشين',           nameFr: 'Cappucin',            nameEn: 'Cappucin',          priceMillimes: 2700 },
    ],
  },

  {
    nameAr: 'ماء',
    nameFr: 'Eau',
    nameEn: 'Water',
    dishes: [
      { nameAr: 'ماء 0.5 لتر', nameFr: 'Eau 0.5L', nameEn: 'Water 0.5L', priceMillimes: 1000 },
      { nameAr: 'ماء 1 لتر',   nameFr: 'Eau 1L',   nameEn: 'Water 1L',   priceMillimes: 1200 },
      { nameAr: 'ماء 1.5 لتر', nameFr: 'Eau 1.5L', nameEn: 'Water 1.5L', priceMillimes: 1500 },
    ],
  },
];
