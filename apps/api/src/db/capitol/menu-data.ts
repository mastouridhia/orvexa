/**
 * Capitol Park menu — Phase 1 data (pizzas, sandwiches, crêpes, drinks, ice cream, breakfast).
 * Phase 2 (traditional Tunisian mains — Arabic-only section) seeded separately after go-live.
 *
 * Signature items originally branded "Doulicha" in the source PDF are renamed to "Capitol".
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

// -------------------- Shared variant builders --------------------

const FILLINGS_TABOUNA: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1500 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 2000,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2000 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 2500 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 2000 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 4000 },
];

const FILLINGS_MAKLOUB: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 2000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 2000 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 2000,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2000 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 3000 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 3500 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 4000 },
];

const FILLINGS_PANUOZZO: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 0 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 0 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 1000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1000 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 1500,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 1500 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 1500 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 2500 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 7000 },
];

const FILLINGS_CORNET: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 2000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 2000 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 2000,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2500 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 3000 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 2500 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 4000 },
];

const FILLINGS_BAGUETTE: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1500 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 1500,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 1500 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 3000 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 2500 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 4000 },
];

const FILLINGS_TACOS: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 0 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 0 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1500 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 2000,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2000 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 2500 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 7000 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 7000 },
];

const FILLINGS_CIABATTA: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 0 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 0 },
  { nameAr: 'شاورما', nameFr: 'Chawrma', nameEn: 'Shawarma', priceDeltaMillimes: 1000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1000 },
  {
    nameAr: 'اسكالوب باني',
    nameFr: 'Escalope panée',
    nameEn: 'Breaded Escalope',
    priceDeltaMillimes: 1500,
  },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 1500 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 1500 },
  { nameAr: 'ميكست', nameFr: 'Mixte', nameEn: 'Mixed', priceDeltaMillimes: 2500 },
  { nameAr: 'شفريت', nameFr: 'Chevrette', nameEn: 'Shrimp', priceDeltaMillimes: 7000 },
];

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

const SANDWICH_EXTRAS: VariantGroupDef = {
  nameAr: 'إضافات',
  nameFr: 'Suppléments',
  nameEn: 'Extras',
  selectionType: 'multi',
  required: false,
  minChoices: 0,
  maxChoices: 3,
  variants: [
    { nameAr: 'فروماج', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 4000 },
    { nameAr: 'فريت', nameFr: 'Frite', nameEn: 'Fries', priceDeltaMillimes: 2500 },
    {
      nameAr: 'لحم مفروم',
      nameFr: 'Viande hachée',
      nameEn: 'Minced meat',
      priceDeltaMillimes: 5000,
    },
  ],
};

const PIZZA_EXTRAS: VariantGroupDef = {
  nameAr: 'إضافات',
  nameFr: 'Suppléments',
  nameEn: 'Extras',
  selectionType: 'multi',
  required: false,
  minChoices: 0,
  maxChoices: 3,
  variants: [
    { nameAr: 'فروماج', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 2500 },
    { nameAr: 'فريت', nameFr: 'Frite', nameEn: 'Fries', priceDeltaMillimes: 2500 },
    {
      nameAr: 'لحم مفروم',
      nameFr: 'Viande hachée',
      nameEn: 'Minced meat',
      priceDeltaMillimes: 5000,
    },
  ],
};

// Pizza sizes: base price = Large; deltas above.
function pizzaSizeGroup(
  large: number,
  maxi: number,
  half: number,
  full: number,
  maxiLabelFr: 'Maxi' | 'Familiale' = 'Maxi',
): VariantGroupDef {
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
      {
        nameAr: maxiLabelFr === 'Familiale' ? 'عائلية' : 'ماكسي',
        nameFr: maxiLabelFr,
        nameEn: maxiLabelFr === 'Familiale' ? 'Family' : 'Maxi',
        priceDeltaMillimes: maxi - large,
      },
      { nameAr: '٠٫٥ م', nameFr: '0.5m', nameEn: '0.5m', priceDeltaMillimes: half - large },
      { nameAr: '١ م', nameFr: '1m', nameEn: '1m', priceDeltaMillimes: full - large },
    ],
  };
}

function pizzaDish(
  nameFr: string,
  nameAr: string,
  nameEn: string,
  prices: [number, number, number, number],
  opts?: { description?: string; maxiLabel?: 'Maxi' | 'Familiale' },
): DishDef {
  const [large, maxi, half, full] = prices;
  return {
    nameAr,
    nameFr,
    nameEn,
    descriptionFr: opts?.description,
    priceMillimes: large,
    groups: [pizzaSizeGroup(large, maxi, half, full, opts?.maxiLabel ?? 'Maxi'), PIZZA_EXTRAS],
  };
}

const ICE_CREAM_FLAVORS: VariantDef[] = [
  { nameAr: 'فستق', nameFr: 'Pistache', nameEn: 'Pistachio', priceDeltaMillimes: 0 },
  { nameAr: 'فراولة', nameFr: 'Fraise', nameEn: 'Strawberry', priceDeltaMillimes: 0 },
  { nameAr: 'فانيليا', nameFr: 'Vanille', nameEn: 'Vanilla', priceDeltaMillimes: 0 },
  { nameAr: 'شوكولا', nameFr: 'Chocolat', nameEn: 'Chocolate', priceDeltaMillimes: 0 },
  { nameAr: 'بندق', nameFr: 'Noisette', nameEn: 'Hazelnut', priceDeltaMillimes: 0 },
  { nameAr: 'أناناس', nameFr: 'Ananas', nameEn: 'Pineapple', priceDeltaMillimes: 0 },
  { nameAr: 'كراميل', nameFr: 'Caramel', nameEn: 'Caramel', priceDeltaMillimes: 0 },
  { nameAr: 'جوز الهند', nameFr: 'Noix de coco', nameEn: 'Coconut', priceDeltaMillimes: 0 },
  { nameAr: 'طبيعي', nameFr: 'Nature', nameEn: 'Plain', priceDeltaMillimes: 0 },
  { nameAr: 'قهوة', nameFr: 'Café', nameEn: 'Coffee', priceDeltaMillimes: 0 },
  { nameAr: 'موز', nameFr: 'Banane', nameEn: 'Banana', priceDeltaMillimes: 0 },
  { nameAr: 'توت', nameFr: 'Framboise', nameEn: 'Raspberry', priceDeltaMillimes: 0 },
  { nameAr: 'علكة', nameFr: 'Chewing-gum', nameEn: 'Bubblegum', priceDeltaMillimes: 0 },
];

function iceCreamFlavorGroup(scoopCount: number): VariantGroupDef {
  return {
    nameAr: 'النكهات',
    nameFr: 'Parfums',
    nameEn: 'Flavors',
    selectionType: 'multi',
    required: true,
    minChoices: scoopCount,
    maxChoices: scoopCount,
    variants: ICE_CREAM_FLAVORS,
  };
}

// -------------------- CATEGORIES --------------------

export const CAPITOL_MENU: CategoryDef[] = [
  // ============= BREAKFAST =============
  {
    nameAr: 'الفطور',
    nameFr: 'Petit-Déjeuner',
    nameEn: 'Breakfast',
    dishes: [
      {
        nameAr: 'فطور سولو',
        nameFr: 'Solo Régal',
        nameEn: 'Solo Breakfast',
        descriptionFr: 'Pour 1 personne',
        priceMillimes: 20000,
      },
      {
        nameAr: 'فطور دو',
        nameFr: 'Duo Régal',
        nameEn: 'Duo Breakfast',
        descriptionFr: 'Pour 2 personnes',
        priceMillimes: 38000,
      },
      {
        nameAr: 'فطور كابيتول',
        nameFr: 'Capitol',
        nameEn: 'Capitol Breakfast',
        descriptionFr: 'Pour 4 personnes',
        priceMillimes: 58000,
      },
      {
        nameAr: 'فطور الأطفال',
        nameFr: 'Le Déj des Kids',
        nameEn: 'Kids Breakfast',
        descriptionFr: 'Pour 1 enfant',
        priceMillimes: 12000,
      },
    ],
  },

  // ============= PIZZA RED =============
  {
    nameAr: 'بيتزا روج',
    nameFr: 'Pizza Rouge',
    nameEn: 'Red Pizza',
    dishes: [
      pizzaDish('Margherita', 'مارغريتا', 'Margherita', [14000, 17000, 21000, 37000]),
      pizzaDish('Neptune', 'نبتون', 'Neptune', [19000, 22000, 26000, 47000], {
        description: 'Thon',
      }),
      pizzaDish('Végétarienne', 'نباتية', 'Vegetarian', [18000, 21000, 25000, 45000]),
      pizzaDish('Capresi', 'كابريزي', 'Capresi', [16000, 20000, 26000, 47000], {
        description: 'Jambon fumé',
      }),
      pizzaDish('Napoletana', 'نابوليتانا', 'Napoletana', [17000, 21000, 26000, 47000], {
        description: 'Anchois',
      }),
      pizzaDish('Pollo', 'بولو', 'Pollo', [19000, 23000, 30000, 55000]),
      pizzaDish('Turc', 'تركية', 'Turkish', [19000, 23000, 30000, 55000]),
      pizzaDish('Mexican', 'مكسيكية', 'Mexican', [19000, 23000, 33000, 55000]),
      pizzaDish('Gambas', 'قمبري', 'Gambas', [21000, 25000, 33000, 61000]),
      pizzaDish('4 Saisons', '٤ فصول', '4 Seasons', [21000, 25000, 33000, 61000]),
      pizzaDish('Bacon', 'باكون', 'Bacon', [21000, 33000, 35500, 66000]),
      pizzaDish('Fruits de mer', 'فواكه البحر', 'Seafood', [25000, 33000, 35500, 66000]),
      pizzaDish('Capitol Mix', 'كابيتول ميكس', 'Capitol Mix', [26000, 34000, 37000, 69000]),
    ],
  },

  // ============= PIZZA WHITE =============
  {
    nameAr: 'بيتزا بيضاء',
    nameFr: 'Pizza Blanche',
    nameEn: 'White Pizza',
    dishes: [
      pizzaDish('Carbonara', 'كاربونارا', 'Carbonara', [18000, 22000, 28000, 51000], {
        maxiLabel: 'Familiale',
      }),
      pizzaDish('4 Fromages', '٤ أجبان', '4 Cheeses', [19000, 23500, 29000, 53000], {
        maxiLabel: 'Familiale',
      }),
      pizzaDish('5 Fromages', '٥ أجبان', '5 Cheeses', [20000, 24500, 30000, 55000], {
        maxiLabel: 'Familiale',
      }),
      pizzaDish('Chicken Supreme', 'تشكن سوبريم', 'Chicken Supreme', [20000, 24000, 31000, 57000], {
        maxiLabel: 'Familiale',
      }),
      pizzaDish('Blue', 'بلو', 'Blue', [22000, 27000, 34000, 63000], { maxiLabel: 'Familiale' }),
      pizzaDish('Pesca', 'بيسكا', 'Pesca', [26000, 34000, 38000, 71000], {
        maxiLabel: 'Familiale',
      }),
    ],
  },

  // ============= SANDWICHES =============
  {
    nameAr: 'الساندويتشات',
    nameFr: 'Sandwiches',
    nameEn: 'Sandwiches',
    dishes: [
      {
        nameAr: 'تابونة',
        nameFr: 'Tabouna',
        nameEn: 'Tabouna',
        descriptionFr: 'Pain tabouna garni au four',
        priceMillimes: 7000,
        groups: [fillingGroup(FILLINGS_TABOUNA), SANDWICH_EXTRAS],
      },
      {
        nameAr: 'مقلوب',
        nameFr: 'Makloub',
        nameEn: 'Makloub',
        priceMillimes: 9500,
        groups: [fillingGroup(FILLINGS_MAKLOUB), SANDWICH_EXTRAS],
      },
      {
        nameAr: 'بانوزو',
        nameFr: 'Panuozzo',
        nameEn: 'Panuozzo',
        priceMillimes: 12500,
        groups: [fillingGroup(FILLINGS_PANUOZZO), SANDWICH_EXTRAS],
      },
      {
        nameAr: 'كورنيه',
        nameFr: 'Cornet',
        nameEn: 'Cornet',
        priceMillimes: 10500,
        groups: [fillingGroup(FILLINGS_CORNET), SANDWICH_EXTRAS],
      },
      {
        nameAr: 'باغيت محشوة',
        nameFr: 'Baguette Farcie',
        nameEn: 'Stuffed Baguette',
        priceMillimes: 11000,
        groups: [fillingGroup(FILLINGS_BAGUETTE), SANDWICH_EXTRAS],
      },
      {
        nameAr: 'تاكوس',
        nameFr: 'Tacos à la Mexicaine',
        nameEn: 'Mexican Tacos',
        priceMillimes: 8000,
        groups: [fillingGroup(FILLINGS_TACOS), SANDWICH_EXTRAS],
      },
      {
        nameAr: 'تشاباتا',
        nameFr: 'Ciabatta',
        nameEn: 'Ciabatta',
        priceMillimes: 12500,
        groups: [fillingGroup(FILLINGS_CIABATTA), SANDWICH_EXTRAS],
      },
    ],
  },

  // ============= CRÊPES SALÉES =============
  {
    nameAr: 'كريب مالحة',
    nameFr: 'Crêpes Salées',
    nameEn: 'Savory Crêpes',
    dishes: [
      {
        nameAr: 'كريب جامبون فروماج',
        nameFr: 'Jambon Fromage',
        nameEn: 'Ham & Cheese',
        priceMillimes: 7000,
      },
      {
        nameAr: 'كريب تن فروماج',
        nameFr: 'Thon Fromage',
        nameEn: 'Tuna & Cheese',
        priceMillimes: 9500,
      },
      {
        nameAr: 'كريب سبيسيال',
        nameFr: 'Spécial',
        nameEn: 'Special',
        descriptionFr: 'Thon ou jambon, fromage, œuf',
        priceMillimes: 10500,
      },
      { nameAr: 'كريب الشيف', nameFr: 'Crêpe du Chef', nameEn: 'Chef Crêpe', priceMillimes: 12500 },
      {
        nameAr: 'كريب كابيتول',
        nameFr: 'Crêpe Capitol',
        nameEn: 'Capitol Crêpe',
        descriptionFr: 'Escalope ou chawarma ou viande hachée, œuf, fromage',
        priceMillimes: 14500,
      },
    ],
  },

  // ============= CRÊPES SUCRÉES =============
  {
    nameAr: 'كريب حلوة',
    nameFr: 'Crêpes Sucrées',
    nameEn: 'Sweet Crêpes',
    dishes: [
      { nameAr: 'كريب شوكولا', nameFr: 'Chocolat', nameEn: 'Chocolate', priceMillimes: 8500 },
      {
        nameAr: 'كريب شوكولا وفواكه جافة',
        nameFr: 'Chocolat Fruits Secs',
        nameEn: 'Chocolate & Dried Fruits',
        priceMillimes: 10500,
      },
      { nameAr: 'كريب نوتيلا', nameFr: 'Nutella', nameEn: 'Nutella', priceMillimes: 10500 },
      {
        nameAr: 'كريب نوتيلا وفواكه جافة',
        nameFr: 'Nutella Fruits Secs',
        nameEn: 'Nutella & Dried Fruits',
        priceMillimes: 12500,
      },
      { nameAr: 'كريب مرجان', nameFr: 'Morjen', nameEn: 'Morjen', priceMillimes: 10500 },
      {
        nameAr: 'كريب مرجان وفواكه جافة',
        nameFr: 'Morjen Fruits Secs',
        nameEn: 'Morjen & Dried Fruits',
        priceMillimes: 12500,
      },
      { nameAr: 'كريب سبكولوس', nameFr: 'Spéculoos', nameEn: 'Speculoos', priceMillimes: 12000 },
      {
        nameAr: 'كريب كابيتول',
        nameFr: 'Crêpe Capitol',
        nameEn: 'Capitol Crêpe',
        descriptionFr: 'Nutella, banane, fruits secs',
        priceMillimes: 15000,
      },
    ],
  },

  // ============= OMELETTE =============
  {
    nameAr: 'العجة',
    nameFr: 'Omelette',
    nameEn: 'Omelette',
    dishes: [
      { nameAr: 'عجة طبيعية', nameFr: 'Nature', nameEn: 'Plain', priceMillimes: 7000 },
      {
        nameAr: 'عجة تن وجبن',
        nameFr: 'Thon Fromage',
        nameEn: 'Tuna & Cheese',
        priceMillimes: 8500,
      },
      {
        nameAr: 'عجة جامبون وجبن',
        nameFr: 'Jambon Fromage',
        nameEn: 'Ham & Cheese',
        priceMillimes: 8500,
      },
    ],
  },

  // ============= PANINI =============
  {
    nameAr: 'بانيني',
    nameFr: 'Panini',
    nameEn: 'Panini',
    dishes: [
      {
        nameAr: 'بانيني تن وجبن',
        nameFr: 'Thon Fromage',
        nameEn: 'Tuna & Cheese',
        priceMillimes: 8000,
      },
      {
        nameAr: 'بانيني جامبون وجبن',
        nameFr: 'Jambon Fromage',
        nameEn: 'Ham & Cheese',
        priceMillimes: 8000,
      },
      {
        nameAr: 'بانيني دجاج وجبن',
        nameFr: 'Poulet Fromage',
        nameEn: 'Chicken & Cheese',
        priceMillimes: 10000,
      },
    ],
  },

  // ============= JWAJEM & GAUFRES =============
  {
    nameAr: 'الجواجم والقوفر',
    nameFr: 'Jwajem & Gaufres',
    nameEn: 'Jwajem & Waffles',
    dishes: [
      {
        nameAr: 'جواجم',
        nameFr: 'Jwajem',
        nameEn: 'Jwajem',
        priceMillimes: 8000,
        groups: [
          {
            nameAr: 'الحجم',
            nameFr: 'Taille',
            nameEn: 'Size',
            selectionType: 'single',
            required: true,
            minChoices: 1,
            maxChoices: 1,
            variants: [
              { nameAr: 'صغير', nameFr: 'Small', nameEn: 'Small', priceDeltaMillimes: 0 },
              { nameAr: 'كبير', nameFr: 'Big', nameEn: 'Big', priceDeltaMillimes: 3500 },
              {
                nameAr: 'كابيتول',
                nameFr: 'Capitol',
                nameEn: 'Capitol',
                priceDeltaMillimes: 10000,
              },
            ],
          },
        ],
      },
      {
        nameAr: 'قوفر شوكولا',
        nameFr: 'Gaufre Chocolat',
        nameEn: 'Chocolate Waffle',
        priceMillimes: 8500,
      },
      {
        nameAr: 'قوفر شوكولا فواكه جافة',
        nameFr: 'Gaufre Chocolat Fruits Secs',
        nameEn: 'Chocolate Waffle w/ Dried Fruits',
        priceMillimes: 10500,
      },
      {
        nameAr: 'قوفر نوتيلا',
        nameFr: 'Gaufre Nutella',
        nameEn: 'Nutella Waffle',
        priceMillimes: 11500,
      },
      {
        nameAr: 'قوفر نوتيلا فواكه جافة',
        nameFr: 'Gaufre Nutella Fruits Secs',
        nameEn: 'Nutella Waffle w/ Dried Fruits',
        priceMillimes: 13500,
      },
      {
        nameAr: 'قوفر مرجان',
        nameFr: 'Gaufre Morjen',
        nameEn: 'Morjen Waffle',
        priceMillimes: 11500,
      },
      {
        nameAr: 'قوفر مرجان فواكه جافة',
        nameFr: 'Gaufre Morjen Fruits Secs',
        nameEn: 'Morjen Waffle w/ Dried Fruits',
        priceMillimes: 13500,
      },
      {
        nameAr: 'قوفر نوتيلا سبكولوس',
        nameFr: 'Gaufre Nutella Spéculoos',
        nameEn: 'Nutella Speculoos Waffle',
        priceMillimes: 13000,
      },
      { nameAr: 'قوفر أمور', nameFr: 'Gaufre Amore', nameEn: 'Amore Waffle', priceMillimes: 13000 },
    ],
  },

  // ============= PANCAKE =============
  {
    nameAr: 'البانكيك',
    nameFr: 'Pancake',
    nameEn: 'Pancake',
    dishes: [
      { nameAr: 'بانكيك ٣ قطع', nameFr: '3 Pièces', nameEn: '3 Pieces', priceMillimes: 4500 },
      { nameAr: 'بانكيك ٦ قطع', nameFr: '6 Pièces', nameEn: '6 Pieces', priceMillimes: 8500 },
      {
        nameAr: 'بانكيك نوتيلا فواكه جافة',
        nameFr: '5 Pièces Nutella Fruits Secs',
        nameEn: '5 Pieces Nutella & Dried Fruits',
        priceMillimes: 11000,
      },
      {
        nameAr: 'بانكيك مرجان فواكه جافة',
        nameFr: '5 Pièces Morjen Fruits Secs',
        nameEn: '5 Pieces Morjen & Dried Fruits',
        priceMillimes: 11000,
      },
    ],
  },

  // ============= ICE CREAM =============
  {
    nameAr: 'البوظة',
    nameFr: 'Glace',
    nameEn: 'Ice Cream',
    dishes: [
      {
        nameAr: 'كرة واحدة',
        nameFr: '1 Boule',
        nameEn: '1 Scoop',
        priceMillimes: 3500,
        groups: [iceCreamFlavorGroup(1)],
      },
      {
        nameAr: 'كرتان',
        nameFr: '2 Boules',
        nameEn: '2 Scoops',
        priceMillimes: 6000,
        groups: [iceCreamFlavorGroup(2)],
      },
      {
        nameAr: 'ثلاث كرات',
        nameFr: '3 Boules',
        nameEn: '3 Scoops',
        priceMillimes: 8500,
        groups: [iceCreamFlavorGroup(3)],
      },
      {
        nameAr: 'بوظة كابيتول',
        nameFr: 'Glace Capitol',
        nameEn: 'Capitol Ice Cream',
        descriptionFr: 'Composition spéciale, 5 boules',
        priceMillimes: 18500,
        groups: [iceCreamFlavorGroup(5)],
      },
    ],
  },

  // ============= MILKSHAKE =============
  {
    nameAr: 'ميلك شيك',
    nameFr: 'Milkshake',
    nameEn: 'Milkshake',
    dishes: [
      {
        nameAr: 'ميلك شيك',
        nameFr: 'Milkshake',
        nameEn: 'Milkshake',
        priceMillimes: 8500,
        groups: [
          {
            nameAr: 'النكهة',
            nameFr: 'Parfum',
            nameEn: 'Flavor',
            selectionType: 'single',
            required: true,
            minChoices: 1,
            maxChoices: 1,
            variants: [
              { nameAr: 'فانيليا', nameFr: 'Vanille', nameEn: 'Vanilla', priceDeltaMillimes: 0 },
              { nameAr: 'كراميل', nameFr: 'Caramel', nameEn: 'Caramel', priceDeltaMillimes: 0 },
              { nameAr: 'بندق', nameFr: 'Noisette', nameEn: 'Hazelnut', priceDeltaMillimes: 0 },
              { nameAr: 'فراولة', nameFr: 'Fraise', nameEn: 'Strawberry', priceDeltaMillimes: 0 },
              { nameAr: 'علكة', nameFr: 'Chewing-gum', nameEn: 'Bubblegum', priceDeltaMillimes: 0 },
              { nameAr: 'شوكولا', nameFr: 'Chocolat', nameEn: 'Chocolate', priceDeltaMillimes: 0 },
              { nameAr: 'نوتيلا', nameFr: 'Nutella', nameEn: 'Nutella', priceDeltaMillimes: 2500 },
              {
                nameAr: 'سبكولوس',
                nameFr: 'Spéculoos',
                nameEn: 'Speculoos',
                priceDeltaMillimes: 2500,
              },
              { nameAr: 'مرجان', nameFr: 'Morjen', nameEn: 'Morjen', priceDeltaMillimes: 2500 },
            ],
          },
        ],
      },
    ],
  },

  // ============= DIABOLO & MOJITO =============
  {
    nameAr: 'ديابولو وموهيتو',
    nameFr: 'Diabolo & Mojito',
    nameEn: 'Diabolo & Mojito',
    dishes: [
      {
        nameAr: 'ديابولو',
        nameFr: 'Diabolo',
        nameEn: 'Diabolo',
        priceMillimes: 5000,
        groups: [
          {
            nameAr: 'النكهة',
            nameFr: 'Parfum',
            nameEn: 'Flavor',
            selectionType: 'single',
            required: true,
            minChoices: 1,
            maxChoices: 1,
            variants: [
              { nameAr: 'فراولة', nameFr: 'Fraise', nameEn: 'Strawberry', priceDeltaMillimes: 0 },
              { nameAr: 'توت', nameFr: 'Framboise', nameEn: 'Raspberry', priceDeltaMillimes: 0 },
              { nameAr: 'بلو', nameFr: 'Blue', nameEn: 'Blue', priceDeltaMillimes: 0 },
              {
                nameAr: 'ريد بيري',
                nameFr: 'Red Berry',
                nameEn: 'Red Berry',
                priceDeltaMillimes: 0,
              },
              {
                nameAr: 'بلاك بيري',
                nameFr: 'Black Berry',
                nameEn: 'Black Berry',
                priceDeltaMillimes: 0,
              },
            ],
          },
        ],
      },
      {
        nameAr: 'موهيتو',
        nameFr: 'Mojito (Virgin)',
        nameEn: 'Mojito (Virgin)',
        priceMillimes: 9000,
        groups: [
          {
            nameAr: 'النكهة',
            nameFr: 'Parfum',
            nameEn: 'Flavor',
            selectionType: 'single',
            required: true,
            minChoices: 1,
            maxChoices: 1,
            variants: [
              { nameAr: 'فيرجن', nameFr: 'Virgin', nameEn: 'Virgin', priceDeltaMillimes: 0 },
              { nameAr: 'بلو', nameFr: 'Blue', nameEn: 'Blue', priceDeltaMillimes: 0 },
              { nameAr: 'فراولة', nameFr: 'Fraise', nameEn: 'Strawberry', priceDeltaMillimes: 0 },
              { nameAr: 'كيوي', nameFr: 'Kiwi', nameEn: 'Kiwi', priceDeltaMillimes: 0 },
              {
                nameAr: 'ريد بيري',
                nameFr: 'Red Berry',
                nameEn: 'Red Berry',
                priceDeltaMillimes: 0,
              },
              {
                nameAr: 'بلاك بيري',
                nameFr: 'Black Berry',
                nameEn: 'Black Berry',
                priceDeltaMillimes: 0,
              },
              { nameAr: 'مانجا', nameFr: 'Manga', nameEn: 'Mango', priceDeltaMillimes: 0 },
            ],
          },
        ],
      },
    ],
  },

  // ============= HOT COFFEE =============
  {
    nameAr: 'القهوة الساخنة',
    nameFr: 'Café',
    nameEn: 'Coffee',
    dishes: [
      { nameAr: 'إكسبريسو', nameFr: 'Expresso', nameEn: 'Espresso', priceMillimes: 3500 },
      { nameAr: 'كابوتشين', nameFr: 'Cappucin', nameEn: 'Cappucin', priceMillimes: 4000 },
      { nameAr: 'ماكياتو', nameFr: 'Macchiato', nameEn: 'Macchiato', priceMillimes: 4000 },
      { nameAr: 'أمريكان', nameFr: 'Américain', nameEn: 'Americano', priceMillimes: 4500 },
      { nameAr: 'كافي كريم', nameFr: 'Café Crème', nameEn: 'Café Crème', priceMillimes: 5000 },
      { nameAr: 'كابتشينو', nameFr: 'Cappuccino', nameEn: 'Cappuccino', priceMillimes: 6000 },
      {
        nameAr: 'إكسبريسو نستله',
        nameFr: 'Expresso Nestlé',
        nameEn: 'Nestlé Espresso',
        priceMillimes: 7000,
      },
      {
        nameAr: 'كابوتشين نستله',
        nameFr: 'Cappuccin Nestlé',
        nameEn: 'Nestlé Cappucin',
        priceMillimes: 8000,
      },
      {
        nameAr: 'كافي كريم نستله',
        nameFr: 'Café Crème Nestlé',
        nameEn: 'Nestlé Café Crème',
        priceMillimes: 9000,
      },
      { nameAr: 'قهوة تركية', nameFr: 'Café Turc', nameEn: 'Turkish Coffee', priceMillimes: 7500 },
    ],
  },

  // ============= HOT CHOCOLATE =============
  {
    nameAr: 'الشوكولاتة الساخنة',
    nameFr: 'Chocolat Chaud',
    nameEn: 'Hot Chocolate',
    dishes: [
      { nameAr: 'شوكولا كلاسيك', nameFr: 'Classique', nameEn: 'Classic', priceMillimes: 4500 },
      {
        nameAr: 'شوكولا بالحليب نسكويك',
        nameFr: 'Au Lait Nesquik',
        nameEn: 'Milk Nesquik',
        priceMillimes: 4500,
      },
      { nameAr: 'شوكولا كراميل', nameFr: 'Caramel', nameEn: 'Caramel', priceMillimes: 5000 },
      { nameAr: 'شوكولا براوني', nameFr: 'Brownie', nameEn: 'Brownie', priceMillimes: 5500 },
    ],
  },

  // ============= TEA =============
  {
    nameAr: 'الشاي',
    nameFr: 'Thé',
    nameEn: 'Tea',
    dishes: [
      { nameAr: 'شاي بالنعناع', nameFr: 'À la menthe', nameEn: 'Mint', priceMillimes: 4000 },
      { nameAr: 'شاي مغلي', nameFr: 'Infusion', nameEn: 'Infusion', priceMillimes: 5000 },
      { nameAr: 'شاي باللوز', nameFr: 'Aux Amandes', nameEn: 'Almond', priceMillimes: 5500 },
      { nameAr: 'شاي بالصنوبر', nameFr: 'Aux Pignons', nameEn: 'Pine Nuts', priceMillimes: 7500 },
      { nameAr: 'شاي قورماند', nameFr: 'Gourmande', nameEn: 'Gourmande', priceMillimes: 8000 },
      { nameAr: 'شاي كابيتول', nameFr: 'Capitol', nameEn: 'Capitol Tea', priceMillimes: 8500 },
    ],
  },

  // ============= COLD COFFEE =============
  {
    nameAr: 'القهوة الباردة',
    nameFr: 'Café Froid',
    nameEn: 'Cold Coffee',
    dishes: [
      { nameAr: 'كافي جلاسيه', nameFr: 'Café Glacé', nameEn: 'Iced Coffee', priceMillimes: 4000 },
      { nameAr: 'فرابوتشينو', nameFr: 'Frappuccino', nameEn: 'Frappuccino', priceMillimes: 7500 },
      {
        nameAr: 'كافي ليجوا',
        nameFr: 'Café Liégeois',
        nameEn: 'Café Liégeois',
        descriptionFr: 'Avec glace',
        priceMillimes: 8500,
      },
      {
        nameAr: 'كافي شوكولا',
        nameFr: 'Café Chocolaté',
        nameEn: 'Chocolate Coffee',
        descriptionFr: 'Avec glace',
        priceMillimes: 8500,
      },
    ],
  },

  // ============= FRUITS =============
  {
    nameAr: 'الفواكه',
    nameFr: 'Fruits',
    nameEn: 'Fruits',
    dishes: [
      {
        nameAr: 'صحن فواكه',
        nameFr: 'Assiette de Fruits',
        nameEn: 'Fruit Plate',
        priceMillimes: 8000,
      },
      {
        nameAr: 'صحن فواكه كابيتول',
        nameFr: 'Assiette de Fruits Capitol',
        nameEn: 'Capitol Fruit Plate',
        priceMillimes: 12000,
      },
      {
        nameAr: 'سلة فواكه',
        nameFr: 'Corbeille de Fruits',
        nameEn: 'Fruit Basket',
        priceMillimes: 15000,
      },
      {
        nameAr: 'سلطة فواكه',
        nameFr: 'Salade de Fruits',
        nameEn: 'Fruit Salad',
        priceMillimes: 9000,
      },
      {
        nameAr: 'سلطة فواكه كابيتول',
        nameFr: 'Salade de Fruits Capitol',
        nameEn: 'Capitol Fruit Salad',
        priceMillimes: 12000,
      },
    ],
  },

  // ============= JUICES =============
  {
    nameAr: 'العصائر',
    nameFr: 'Jus',
    nameEn: 'Juices',
    dishes: [
      {
        nameAr: 'عصير برتقال',
        nameFr: "Jus d'Orange",
        nameEn: 'Orange Juice',
        priceMillimes: 5500,
      },
      { nameAr: 'سيترونيد', nameFr: 'Citronade', nameEn: 'Lemonade', priceMillimes: 5500 },
      {
        nameAr: 'سيترونيد باللوز',
        nameFr: 'Citronade Amande',
        nameEn: 'Almond Lemonade',
        priceMillimes: 7500,
      },
      {
        nameAr: 'عصير فراولة',
        nameFr: 'Jus de Fraise',
        nameEn: 'Strawberry Juice',
        priceMillimes: 6500,
      },
      { nameAr: 'حليب الدجاج', nameFr: 'Lait de Poule', nameEn: 'Eggnog', priceMillimes: 7500 },
      { nameAr: 'عصير كيوي', nameFr: 'Jus de Kiwi', nameEn: 'Kiwi Juice', priceMillimes: 7500 },
      {
        nameAr: 'عصير ثنائي',
        nameFr: 'Jus Duo au Choix',
        nameEn: 'Duo Juice',
        priceMillimes: 8500,
      },
      {
        nameAr: 'عصير ثلاثي',
        nameFr: 'Jus Trio au Choix',
        nameEn: 'Trio Juice',
        priceMillimes: 10500,
      },
      {
        nameAr: 'كوكتيل كابيتول',
        nameFr: 'Cocktail Capitol',
        nameEn: 'Capitol Cocktail',
        priceMillimes: 11000,
      },
    ],
  },

  // ============= SMOOTHIES =============
  {
    nameAr: 'سموثي',
    nameFr: 'Smoothie',
    nameEn: 'Smoothie',
    dishes: [
      {
        nameAr: 'سموثي',
        nameFr: 'Smoothie',
        nameEn: 'Smoothie',
        priceMillimes: 10500,
        groups: [
          {
            nameAr: 'النوع',
            nameFr: 'Type',
            nameEn: 'Type',
            selectionType: 'single',
            required: true,
            minChoices: 1,
            maxChoices: 1,
            variants: [
              { nameAr: 'كابيتول', nameFr: 'Capitol', nameEn: 'Capitol', priceDeltaMillimes: 0 },
              {
                nameAr: 'بينا كولادا',
                nameFr: 'Piña Colada',
                nameEn: 'Piña Colada',
                priceDeltaMillimes: 0,
              },
              {
                nameAr: 'كاليفورنيا',
                nameFr: 'California',
                nameEn: 'California',
                priceDeltaMillimes: 0,
              },
              {
                nameAr: 'كوستاريكا',
                nameFr: 'Costa Rica',
                nameEn: 'Costa Rica',
                priceDeltaMillimes: 0,
              },
              {
                nameAr: 'بونتا كانا',
                nameFr: 'Punta Cana',
                nameEn: 'Punta Cana',
                priceDeltaMillimes: 0,
              },
            ],
          },
        ],
      },
    ],
  },

  // ============= PHASE 2: TRADITIONAL TUNISIAN =============

  // ============= SALADS =============
  {
    nameAr: 'السلطات',
    nameFr: 'Salades',
    nameEn: 'Salads',
    dishes: [
      {
        nameAr: 'سلاطة مشوية',
        nameFr: 'Salade Mechouia',
        nameEn: 'Grilled Salad',
        priceMillimes: 3000,
      },
      { nameAr: 'سلاطة خضرة', nameFr: 'Salade Verte', nameEn: 'Green Salad', priceMillimes: 3000 },
      {
        nameAr: 'سلاطة رابع روايال',
        nameFr: 'Salade Rabaa Royal',
        nameEn: 'Rabaa Royal Salad',
        priceMillimes: 5000,
      },
      {
        nameAr: 'سلاطة كابيتول الفاخرة',
        nameFr: 'Salade Capitol',
        nameEn: 'Capitol Deluxe Salad',
        priceMillimes: 5000,
      },
      {
        nameAr: 'سلاطة الخضرة الملكية',
        nameFr: 'Salade Royale',
        nameEn: 'Royal Green Salad',
        priceMillimes: 5000,
      },
      {
        nameAr: 'شمنكة علوش',
        nameFr: "Chamenkha d'Agneau",
        nameEn: 'Lamb Chamenkha',
        priceMillimes: 10000,
      },
      {
        nameAr: 'طاجين الباي',
        nameFr: 'Tajine du Bey',
        nameEn: 'Bey Tajine',
        priceMillimes: 10000,
      },
    ],
  },

  // ============= OJJA (Tunisian eggs) =============
  {
    nameAr: 'العجة التونسية',
    nameFr: 'Ojja',
    nameEn: 'Tunisian Eggs (Ojja)',
    dishes: [
      { nameAr: 'عجة مرقاز', nameFr: 'Ojja Merguez', nameEn: 'Merguez Ojja', priceMillimes: 8000 },
      {
        nameAr: 'عجة اسكالوب',
        nameFr: 'Ojja Escalope',
        nameEn: 'Escalope Ojja',
        priceMillimes: 8000,
      },
      {
        nameAr: 'عجة بالمخ',
        nameFr: 'Ojja à la Cervelle',
        nameEn: 'Brain Ojja',
        priceMillimes: 8000,
      },
      { nameAr: 'عجة بالتن', nameFr: 'Ojja au Thon', nameEn: 'Tuna Ojja', priceMillimes: 8000 },
      {
        nameAr: 'عجة غلال البحر',
        nameFr: 'Ojja Fruits de Mer',
        nameEn: 'Seafood Ojja',
        priceMillimes: 12000,
      },
    ],
  },

  // ============= SOUPS =============
  {
    nameAr: 'الشربة',
    nameFr: 'Chorba',
    nameEn: 'Soups',
    dishes: [
      {
        nameAr: 'شربة مفورة',
        nameFr: 'Chorba Mfawra',
        nameEn: 'Steamed Chorba',
        priceMillimes: 12000,
      },
    ],
  },

  // ============= PASTA & RICE =============
  {
    nameAr: 'مقرونة وروز',
    nameFr: 'Pâtes & Riz',
    nameEn: 'Pasta & Rice',
    dishes: [
      {
        nameAr: 'مقرونة علوش',
        nameFr: "Macaronis d'Agneau",
        nameEn: 'Lamb Macaroni',
        priceMillimes: 18000,
      },
      {
        nameAr: 'مقرونة غلال البحر',
        nameFr: 'Macaronis Fruits de Mer',
        nameEn: 'Seafood Macaroni',
        priceMillimes: 25000,
      },
      {
        nameAr: 'سباقتي بولونيز',
        nameFr: 'Spaghetti Bolognaise',
        nameEn: 'Spaghetti Bolognese',
        priceMillimes: 15000,
      },
      { nameAr: 'روز جربي', nameFr: 'Riz Djerbien', nameEn: 'Djerbian Rice', priceMillimes: 12000 },
    ],
  },

  // ============= SEAFOOD =============
  {
    nameAr: 'الحوت',
    nameFr: 'Poisson',
    nameEn: 'Seafood',
    dishes: [
      {
        nameAr: 'كسكسي حوت',
        nameFr: 'Couscous au Poisson',
        nameEn: 'Fish Couscous',
        priceMillimes: 15000,
      },
      {
        nameAr: 'مشوي حوت',
        nameFr: 'Poisson Grillé',
        nameEn: 'Grilled Fish',
        priceMillimes: 15000,
      },
      {
        nameAr: 'حوت في الكوشة',
        nameFr: 'Poisson au Four',
        nameEn: 'Baked Fish',
        priceMillimes: 12000,
      },
      {
        nameAr: 'صحن اسكالوب',
        nameFr: 'Assiette Escalope',
        nameEn: 'Escalope Plate',
        priceMillimes: 10000,
      },
    ],
  },

  // ============= GRILLS =============
  {
    nameAr: 'المشاوي',
    nameFr: 'Grillades',
    nameEn: 'Grills',
    dishes: [
      {
        nameAr: 'مشوي مرقاز صحن',
        nameFr: 'Assiette Merguez Grillée',
        nameEn: 'Grilled Merguez Plate',
        priceMillimes: 12000,
      },
      {
        nameAr: 'مشوي دجاج',
        nameFr: 'Poulet Grillé',
        nameEn: 'Grilled Chicken',
        priceMillimes: 12000,
      },
      {
        nameAr: 'مصلي دجاج حوت',
        nameFr: 'Poulet Pané au Poisson',
        nameEn: 'Breaded Chicken & Fish',
        priceMillimes: 15000,
      },
      {
        nameAr: 'دجاج مفور',
        nameFr: 'Poulet à la Vapeur',
        nameEn: 'Steamed Chicken',
        priceMillimes: 15000,
      },
      {
        nameAr: 'دجاج في الكوشة',
        nameFr: 'Poulet au Four',
        nameEn: 'Roast Chicken',
        priceMillimes: 12000,
      },
    ],
  },

  // ============= TRADITIONAL MAINS =============
  {
    nameAr: 'الأطباق التقليدية',
    nameFr: 'Plats Traditionnels',
    nameEn: 'Traditional Dishes',
    dishes: [
      {
        nameAr: 'كسكسي علوش / عصبان',
        nameFr: 'Couscous Agneau / Osbane',
        nameEn: 'Lamb / Osbane Couscous',
        priceMillimes: 18000,
      },
      {
        nameAr: 'كمونية علوش',
        nameFr: "Kamounia d'Agneau",
        nameEn: 'Lamb Kamounia',
        priceMillimes: 18000,
      },
      {
        nameAr: 'ملوخية علوش',
        nameFr: "Mloukhia d'Agneau",
        nameEn: 'Lamb Mloukhia',
        priceMillimes: 18000,
      },
      {
        nameAr: 'جلبانة علوش',
        nameFr: "Jelbana d'Agneau",
        nameEn: 'Lamb Jelbana (Pea Stew)',
        priceMillimes: 18000,
      },
      {
        nameAr: 'جلبانة شوابي',
        nameFr: 'Jelbana Chwabi',
        nameEn: 'Chwabi Jelbana',
        priceMillimes: 15000,
      },
      {
        nameAr: 'قالية علوش',
        nameFr: "Galia d'Agneau",
        nameEn: 'Lamb Galia',
        priceMillimes: 22000,
      },
      {
        nameAr: 'قالية علوش (صغيرة)',
        nameFr: "Galia d'Agneau (Petite)",
        nameEn: 'Lamb Galia (Small)',
        descriptionFr: 'Petite portion',
        priceMillimes: 15000,
      },
      {
        nameAr: 'لحم في القلة',
        nameFr: 'Viande en Jarre',
        nameEn: 'Meat in Clay Jar',
        priceMillimes: 22000,
      },
      {
        nameAr: 'زواش شوابي',
        nameFr: 'Zwech Chwabi',
        nameEn: 'Small Game Birds Chwabi',
        priceMillimes: 15000,
      },
      {
        nameAr: 'مصلي راس علوش',
        nameFr: "Tête d'Agneau Frite",
        nameEn: 'Fried Lamb Head',
        priceMillimes: 20000,
      },
    ],
  },

  // ============= SIGNATURE PLATES =============
  {
    nameAr: 'الأطباق الخاصة',
    nameFr: 'Plats Maison',
    nameEn: 'House Specials',
    dishes: [
      {
        nameAr: 'صحن تونسي',
        nameFr: 'Assiette Tunisienne',
        nameEn: 'Tunisian Plate',
        descriptionFr: 'Mezze tunisien composé',
        priceMillimes: 7000,
      },
      {
        nameAr: 'صحن بارك كابيتول',
        nameFr: 'Assiette Park Capitol',
        nameEn: 'Park Capitol Plate',
        descriptionFr: 'Plat signature de la maison',
        priceMillimes: 15000,
      },
    ],
  },
];
