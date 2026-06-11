/**
 * Capitol Park — full menu as of go-live 2026-06-11.
 * Three sections: Restaurant · Pizzeria · Café.
 * Prices in millimes (1 TND = 1000 millimes).
 * "Doulicha" signature items renamed to "Capitol".
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

function iceCreamFlavorGroup(scoopCount: number): VariantGroupDef {
  return {
    nameAr: 'النكهات',
    nameFr: 'Parfums',
    nameEn: 'Flavors',
    selectionType: 'multi',
    required: true,
    minChoices: scoopCount,
    maxChoices: scoopCount,
    variants: [
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
    ],
  };
}

// ══════════════════════ Sandwich fillings ══════════════════════

// Base 11,000 → Jambon=11k Thon=11.5k Fromage=12k Chawarma=12.5k Escalope=12.5k Escalope Panée=12.5k Kabeb=14k
const FILLINGS_BAGUETTE: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawarma', nameEn: 'Shawarma', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب باني', nameFr: 'Escalope Panée', nameEn: 'Breaded Escalope', priceDeltaMillimes: 1500 },
  { nameAr: 'كباب', nameFr: 'Kabeb', nameEn: 'Kebab', priceDeltaMillimes: 3000 },
];

// Base 8,000 → Jambon=8k Thon=8k Fromage=8k Chawarma=9.5k Escalope=9.5k Escalope Panée=10k Kabeb=10.5k
const FILLINGS_TACOS: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 0 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 0 },
  { nameAr: 'شاورما', nameFr: 'Chawarma', nameEn: 'Shawarma', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب باني', nameFr: 'Escalope Panée', nameEn: 'Breaded Escalope', priceDeltaMillimes: 2000 },
  { nameAr: 'كباب', nameFr: 'Kabeb', nameEn: 'Kebab', priceDeltaMillimes: 2500 },
];

// Base 7,000 → Jambon=7k Thon=7.5k Fromage=8k Chawarma=8k Escalope=8.5k Escalope Panée=9k Cordon Bleu=9k Kabeb=9.5k
const FILLINGS_TABOUNA: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawarma', nameEn: 'Shawarma', priceDeltaMillimes: 1000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1500 },
  { nameAr: 'اسكالوب باني', nameFr: 'Escalope Panée', nameEn: 'Breaded Escalope', priceDeltaMillimes: 2000 },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2000 },
  { nameAr: 'كباب', nameFr: 'Kabeb', nameEn: 'Kebab', priceDeltaMillimes: 2500 },
];

// Base 10,500 → Jambon=10.5k Thon=11k Fromage=11.5k Chawarma=12.5k Escalope=12.5k Escalope Panée=12.5k Cordon Bleu=13k Kabeb=13.5k
const FILLINGS_CORNET: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawarma', nameEn: 'Shawarma', priceDeltaMillimes: 2000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 2000 },
  { nameAr: 'اسكالوب باني', nameFr: 'Escalope Panée', nameEn: 'Breaded Escalope', priceDeltaMillimes: 2000 },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2500 },
  { nameAr: 'كباب', nameFr: 'Kabeb', nameEn: 'Kebab', priceDeltaMillimes: 3000 },
];

// Base 9,500 → Jambon=9.5k Thon=10k Fromage=10.5k Chawarma=11.5k Escalope=11.5k Escalope Panée=11.5k Cordon Bleu=11.5k Kabeb=12.5k
const FILLINGS_MAKLOUB: VariantDef[] = [
  { nameAr: 'جامبون', nameFr: 'Jambon', nameEn: 'Ham', priceDeltaMillimes: 0 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
  { nameAr: 'جبن', nameFr: 'Fromage', nameEn: 'Cheese', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawarma', nameEn: 'Shawarma', priceDeltaMillimes: 2000 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 2000 },
  { nameAr: 'اسكالوب باني', nameFr: 'Escalope Panée', nameEn: 'Breaded Escalope', priceDeltaMillimes: 2000 },
  { nameAr: 'كوردون بلو', nameFr: 'Cordon Bleu', nameEn: 'Cordon Bleu', priceDeltaMillimes: 2000 },
  { nameAr: 'كباب', nameFr: 'Kabeb', nameEn: 'Kebab', priceDeltaMillimes: 3000 },
];

// ══════════════════════════ MENU ══════════════════════════

export const CAPITOL_MENU: CategoryDef[] = [

  // ════════════ RESTAURANT ════════════

  {
    nameAr: 'مقبلات وشربة',
    nameFr: 'Entrées & Soupes',
    nameEn: 'Appetizers & Soups',
    dishes: [
      { nameAr: 'عجة اسكالوب', nameFr: 'Ojja Escalope', nameEn: 'Escalope Ojja', priceMillimes: 8000 },
      { nameAr: 'عجة بالمخ', nameFr: 'Ojja Cerveau', nameEn: 'Brain Ojja', priceMillimes: 8000 },
      { nameAr: 'عجة بالتن', nameFr: 'Ojja Thon', nameEn: 'Tuna Ojja', priceMillimes: 8000 },
      { nameAr: 'عجة مرقاز', nameFr: 'Ojja Merguez', nameEn: 'Merguez Ojja', priceMillimes: 8000 },
      { nameAr: 'عجة غلال البحر', nameFr: 'Ojja Fruits de Mer', nameEn: 'Seafood Ojja', priceMillimes: 12000 },
      { nameAr: 'شربة مفورة', nameFr: 'Soupe Mfawra', nameEn: 'Steamed Soup', priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'السلطات',
    nameFr: 'Salades',
    nameEn: 'Salads',
    dishes: [
      { nameAr: 'شمنكة علوش', nameFr: 'Chminka Agneau', nameEn: 'Lamb Chminka', priceMillimes: 10000 },
    ],
  },

  {
    nameAr: 'مقرونة وروز',
    nameFr: 'Pâtes & Riz',
    nameEn: 'Pasta & Rice',
    dishes: [
      { nameAr: 'مقرونة علوش', nameFr: 'Macrouna Alouch', nameEn: 'Lamb Pasta', priceMillimes: 18000 },
      { nameAr: 'مقرونة غلال البحر', nameFr: 'Macrouna Fruits de Mer', nameEn: 'Seafood Pasta', priceMillimes: 25000 },
      { nameAr: 'سباقتي بولونيز', nameFr: 'Spaghetti Bolognaise', nameEn: 'Spaghetti Bolognese', priceMillimes: 15000 },
      { nameAr: 'روز جربي', nameFr: 'Riz Djerbien', nameEn: 'Djerbian Rice', priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'الكسكسي',
    nameFr: 'Couscous',
    nameEn: 'Couscous',
    dishes: [
      { nameAr: 'كسكسي علوش / عصبان', nameFr: 'Couscous Alouch / Osbane', nameEn: 'Lamb / Osbane Couscous', priceMillimes: 18000 },
      { nameAr: 'كسكسي حوت', nameFr: 'Couscous Poisson', nameEn: 'Fish Couscous', priceMillimes: 15000 },
    ],
  },

  {
    nameAr: 'اللحوم',
    nameFr: 'Viandes',
    nameEn: 'Meat Dishes',
    dishes: [
      { nameAr: 'صحن اسكالوب', nameFr: 'Plat Escalope', nameEn: 'Escalope Plate', priceMillimes: 10000 },
      { nameAr: 'مشوي مرقاز صحن', nameFr: 'Plat Mechoui Merguez', nameEn: 'Grilled Merguez Plate', priceMillimes: 12000 },
      { nameAr: 'مشوي دجاج', nameFr: 'Mechoui Poulet', nameEn: 'Grilled Chicken', priceMillimes: 12000 },
      { nameAr: 'دجاج مفور', nameFr: 'Poulet Mfawer', nameEn: 'Steamed Chicken', priceMillimes: 15000 },
      { nameAr: 'دجاج في الكوشة', nameFr: 'Poulet Koucha', nameEn: 'Roast Chicken', priceMillimes: 12000 },
      { nameAr: 'لحم في القلة', nameFr: 'Kolla Viande', nameEn: 'Meat in Clay Jar', priceMillimes: 22000 },
      { nameAr: 'زواش شوابي', nameFr: 'Zawech Chwabi', nameEn: 'Small Game Birds Chwabi', priceMillimes: 15000 },
      { nameAr: 'مصلي راس علوش', nameFr: 'Mosli Rass Alouch', nameEn: 'Fried Lamb Head', priceMillimes: 20000 },
      { nameAr: 'صحن تونسي', nameFr: 'Plat Tunisien', nameEn: 'Tunisian Plate', priceMillimes: 7000 },
      { nameAr: 'صحن بارك كابيتول', nameFr: 'Plat Parc Capitol', nameEn: 'Capitol Park Plate', priceMillimes: 15000 },
    ],
  },

  {
    nameAr: 'الحوت',
    nameFr: 'Poisson',
    nameEn: 'Seafood',
    dishes: [
      { nameAr: 'مشوي حوت', nameFr: 'Mechoui Poisson', nameEn: 'Grilled Fish', priceMillimes: 15000 },
      { nameAr: 'حوت في الكوشة', nameFr: 'Poisson Koucha', nameEn: 'Baked Fish', priceMillimes: 12000 },
    ],
  },

  {
    nameAr: 'الأطباق التقليدية',
    nameFr: 'Plats Traditionnels',
    nameEn: 'Traditional Dishes',
    dishes: [
      { nameAr: 'جلبانة علوش', nameFr: 'Jelbena Alouch', nameEn: 'Lamb Jelbena', priceMillimes: 18000 },
      { nameAr: 'جلبانة شوابي', nameFr: 'Jelbena Chwabi', nameEn: 'Chwabi Jelbena', priceMillimes: 15000 },
      { nameAr: 'قالية علوش', nameFr: 'Klaya Alouch', nameEn: 'Lamb Klaya', priceMillimes: 22000 },
      { nameAr: 'ملوخية علوش', nameFr: 'Mloukhia Alouch', nameEn: 'Lamb Mloukhia', priceMillimes: 18000 },
      { nameAr: 'كمونية علوش', nameFr: 'Kamounia Alouch', nameEn: 'Lamb Kamounia', priceMillimes: 18000 },
    ],
  },

  {
    nameAr: 'كريب وحلويات',
    nameFr: 'Crêpes & Desserts',
    nameEn: 'Crêpes & Desserts',
    dishes: [
      { nameAr: 'كريب شوكولا', nameFr: 'Crêpe Chocolat', nameEn: 'Chocolate Crêpe', priceMillimes: 8500 },
      { nameAr: 'كريب نوتيلا', nameFr: 'Crêpe Nutella', nameEn: 'Nutella Crêpe', priceMillimes: 10500 },
      { nameAr: 'كريب مرجان', nameFr: 'Crêpe Morjen', nameEn: 'Morjen Crêpe', priceMillimes: 10500 },
      { nameAr: 'كريب مرجان فواكه جافة', nameFr: 'Crêpe Morjen Fruits Secs', nameEn: 'Morjen & Dried Fruits Crêpe', priceMillimes: 12500 },
      { nameAr: 'كريب سبكولوس', nameFr: 'Crêpe Spéculoos', nameEn: 'Speculoos Crêpe', priceMillimes: 12000 },
      {
        nameAr: 'فواكه جافة',
        nameFr: 'Fruits Secs',
        nameEn: 'Dried Fruits',
        priceMillimes: 10500,
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
              { nameAr: 'عادي', nameFr: 'Normal', nameEn: 'Regular', priceDeltaMillimes: 0 },
              { nameAr: 'كبير', nameFr: 'Grand', nameEn: 'Large', priceDeltaMillimes: 2000 },
            ],
          },
        ],
      },
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
        priceMillimes: 11000,
        groups: [fillingGroup(FILLINGS_BAGUETTE)],
      },
      {
        nameAr: 'تاكوس',
        nameFr: 'Tacos',
        nameEn: 'Tacos',
        priceMillimes: 8000,
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
        priceMillimes: 7000,
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
        priceMillimes: 10500,
        groups: [fillingGroup(FILLINGS_CORNET)],
      },
      {
        nameAr: 'مقلوب',
        nameFr: 'Makloub',
        nameEn: 'Makloub',
        priceMillimes: 9500,
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
        priceMillimes: 14000,
        groups: [sizeGroupLargeMaxi(14000, 17000)],
      },
      {
        nameAr: 'كابريزي',
        nameFr: 'Capresi',
        nameEn: 'Capresi',
        priceMillimes: 16000,
        groups: [sizeGroupWith05m(16000, 20000, 26000)],
      },
      {
        nameAr: 'نباتية',
        nameFr: 'Végétarienne',
        nameEn: 'Vegetarian',
        priceMillimes: 18000,
        groups: [sizeGroupLargeMaxi(18000, 21000)],
      },
      {
        nameAr: 'نبتون',
        nameFr: 'Neptune',
        nameEn: 'Neptune',
        descriptionFr: 'Thon',
        priceMillimes: 19000,
        groups: [sizeGroupWith05m(19000, 22000, 26000)],
      },
      {
        nameAr: 'تركية',
        nameFr: 'Turc',
        nameEn: 'Turkish',
        priceMillimes: 19000,
        groups: [sizeGroupLargeMaxi(19000, 23000)],
      },
      {
        nameAr: 'مكسيكية',
        nameFr: 'Mexican',
        nameEn: 'Mexican',
        priceMillimes: 19000,
        groups: [sizeGroupWith06m(19000, 23000, 33000)],
      },
      {
        nameAr: '٤ أجبان',
        nameFr: '4 Fromages',
        nameEn: '4 Cheeses',
        priceMillimes: 19000,
      },
      {
        nameAr: '٤ فصول',
        nameFr: '4 Saisons',
        nameEn: '4 Seasons',
        priceMillimes: 21000,
        groups: [sizeGroupLargeMaxi(21000, 25000)],
      },
      {
        nameAr: 'فواكه البحر',
        nameFr: 'Fruits de Mer',
        nameEn: 'Seafood Pizza',
        priceMillimes: 25000,
        groups: [sizeGroupLargeMaxi(25000, 33000)],
      },
    ],
  },

  {
    nameAr: 'إضافات',
    nameFr: 'Suppléments',
    nameEn: 'Sides & Extras',
    dishes: [
      { nameAr: 'فروماج', nameFr: 'Fromage', nameEn: 'Cheese', priceMillimes: 4000 },
      { nameAr: 'فريت', nameFr: 'Frite', nameEn: 'Fries', priceMillimes: 2500 },
      { nameAr: 'لحم مفروم', nameFr: 'Viande Hachée', nameEn: 'Minced Meat', priceMillimes: 5000 },
    ],
  },

  // ════════════ CAFÉ ════════════

  {
    nameAr: 'قهوة وشاي',
    nameFr: 'Café & Thé',
    nameEn: 'Coffee & Tea',
    dishes: [
      { nameAr: 'إكسبريسو', nameFr: 'Expresso', nameEn: 'Espresso', priceMillimes: 3500 },
      { nameAr: 'كابوتشين', nameFr: 'Cappucin', nameEn: 'Cappucin', priceMillimes: 4000 },
      { nameAr: 'ماكياتو', nameFr: 'Macchiato', nameEn: 'Macchiato', priceMillimes: 4000 },
      { nameAr: 'كافي جلاسيه', nameFr: 'Café Glacé', nameEn: 'Iced Coffee', priceMillimes: 4000 },
      { nameAr: 'أمريكان', nameFr: 'Américain', nameEn: 'Americano', priceMillimes: 4500 },
      { nameAr: 'شاي بالنعناع', nameFr: 'Thé à la Menthe', nameEn: 'Mint Tea', priceMillimes: 4000 },
      { nameAr: 'كافي كريم', nameFr: 'Café Crème', nameEn: 'Café Crème', priceMillimes: 5000 },
      { nameAr: 'شاي مغلي', nameFr: 'Thé Infusion', nameEn: 'Infusion Tea', priceMillimes: 5000 },
      { nameAr: 'كابتشينو', nameFr: 'Cappuccino', nameEn: 'Cappuccino', priceMillimes: 6000 },
      { nameAr: 'إكسبريسو نستله', nameFr: 'Expresso Nestlé', nameEn: 'Nestlé Espresso', priceMillimes: 7000 },
      { nameAr: 'قهوة تركية', nameFr: 'Café Turc', nameEn: 'Turkish Coffee', priceMillimes: 7500 },
      { nameAr: 'شاي باللوز', nameFr: 'Thé aux Amandes', nameEn: 'Almond Tea', priceMillimes: 5500 },
      { nameAr: 'كابوتشين نستله', nameFr: 'Cappucin Nestlé', nameEn: 'Nestlé Cappucin', priceMillimes: 8000 },
      { nameAr: 'شاي بالصنوبر', nameFr: 'Thé aux Pignons', nameEn: 'Pine Nut Tea', priceMillimes: 7500 },
      { nameAr: 'كافي كريم نستله', nameFr: 'Café Crème Nestlé', nameEn: 'Nestlé Café Crème', priceMillimes: 9000 },
      { nameAr: 'شاي قورماند', nameFr: 'Thé Gourmande', nameEn: 'Gourmande Tea', priceMillimes: 8000 },
      { nameAr: 'شاي كابيتول', nameFr: 'Thé Capitol', nameEn: 'Capitol Tea', priceMillimes: 8500 },
      { nameAr: 'كافي شوكولا بالبوظة', nameFr: 'Café Chocolat + Glace', nameEn: 'Chocolate Coffee + Ice Cream', priceMillimes: 8500 },
      { nameAr: 'كافي ليجوا بالبوظة', nameFr: 'Café Liégeois + Glace', nameEn: 'Café Liégeois + Ice Cream', priceMillimes: 8500 },
      { nameAr: 'شوكولا كلاسيك', nameFr: 'Chocolat Chaud Classique', nameEn: 'Classic Hot Chocolate', priceMillimes: 4500 },
      { nameAr: 'شوكولا كراميل', nameFr: 'Chocolat Chaud Caramel', nameEn: 'Caramel Hot Chocolate', priceMillimes: 5000 },
      { nameAr: 'شوكولا نسكويك', nameFr: 'Chocolat au Lait Nesquik', nameEn: 'Nesquik Milk Chocolate', priceMillimes: 4500 },
      { nameAr: 'شوكولا براوني', nameFr: 'Chocolat Chaud Brownie', nameEn: 'Brownie Hot Chocolate', priceMillimes: 5500 },
    ],
  },

  {
    nameAr: 'ميلك شيك',
    nameFr: 'Milkshakes',
    nameEn: 'Milkshakes',
    dishes: [
      { nameAr: 'حليب الدجاج', nameFr: 'Lait de Poule', nameEn: 'Eggnog', priceMillimes: 7500 },
      { nameAr: 'ميلك شيك فانيليا', nameFr: 'Milkshake Vanille', nameEn: 'Vanilla Milkshake', priceMillimes: 8500 },
      { nameAr: 'ميلك شيك كراميل', nameFr: 'Milkshake Caramel', nameEn: 'Caramel Milkshake', priceMillimes: 8500 },
      { nameAr: 'ميلك شيك بندق', nameFr: 'Milkshake Noisette', nameEn: 'Hazelnut Milkshake', priceMillimes: 8500 },
      { nameAr: 'ميلك شيك فراولة', nameFr: 'Milkshake Fraise', nameEn: 'Strawberry Milkshake', priceMillimes: 8500 },
      { nameAr: 'ميلك شيك علكة', nameFr: 'Milkshake Chewing-gum', nameEn: 'Bubblegum Milkshake', priceMillimes: 8500 },
      { nameAr: 'ميلك شيك شوكولا', nameFr: 'Milkshake Chocolat', nameEn: 'Chocolate Milkshake', priceMillimes: 8500 },
      { nameAr: 'ميلك شيك نوتيلا', nameFr: 'Milkshake Nutella', nameEn: 'Nutella Milkshake', priceMillimes: 11000 },
      { nameAr: 'ميلك شيك سبكولوس', nameFr: 'Milkshake Spéculoos', nameEn: 'Speculoos Milkshake', priceMillimes: 11000 },
      { nameAr: 'ميلك شيك مرجان', nameFr: 'Milkshake Morjen', nameEn: 'Morjen Milkshake', priceMillimes: 11000 },
    ],
  },

  {
    nameAr: 'عصائر وليمونادة',
    nameFr: 'Jus & Limonades',
    nameEn: 'Juices & Lemonades',
    dishes: [
      { nameAr: 'عصير برتقال', nameFr: "Jus d'Orange", nameEn: 'Orange Juice', priceMillimes: 5500 },
      { nameAr: 'سيترونيد', nameFr: 'Citronnade', nameEn: 'Lemonade', priceMillimes: 5500 },
      { nameAr: 'عصير فراولة', nameFr: 'Jus de Fraise', nameEn: 'Strawberry Juice', priceMillimes: 6500 },
      { nameAr: 'عصير كيوي', nameFr: 'Jus de Kiwi', nameEn: 'Kiwi Juice', priceMillimes: 7500 },
      { nameAr: 'سيترونيد باللوز', nameFr: 'Citronnade aux Amandes', nameEn: 'Almond Lemonade', priceMillimes: 7500 },
      { nameAr: 'عصير ثنائي', nameFr: 'Jus Duo au Choix', nameEn: 'Duo Juice', priceMillimes: 10500 },
    ],
  },

  {
    nameAr: 'موهيتو وكوكتيل',
    nameFr: 'Mojitos & Cocktails',
    nameEn: 'Mojitos & Cocktails',
    dishes: [
      { nameAr: 'موهيتو كيوي', nameFr: 'Mojito Kiwi', nameEn: 'Kiwi Mojito', priceMillimes: 9000 },
      { nameAr: 'موهيتو أزرق', nameFr: 'Blue Mojito', nameEn: 'Blue Mojito', priceMillimes: 9000 },
      { nameAr: 'موهيتو فيرجن', nameFr: 'Mojito Virgin', nameEn: 'Virgin Mojito', priceMillimes: 9000 },
      { nameAr: 'موهيتو فراولة', nameFr: 'Strawberry Mojito', nameEn: 'Strawberry Mojito', priceMillimes: 9000 },
      { nameAr: 'موهيتو ريد بيري', nameFr: 'Redberry Mojito', nameEn: 'Redberry Mojito', priceMillimes: 9000 },
      { nameAr: 'موهيتو مانجا', nameFr: 'Mojito Manga', nameEn: 'Mango Mojito', priceMillimes: 9000 },
      { nameAr: 'موهيتو بلاك بيري', nameFr: 'Black Berry Mojito', nameEn: 'Blackberry Mojito', priceMillimes: 9000 },
      { nameAr: 'كوكتيل كابيتول', nameFr: 'Cocktail Capitol', nameEn: 'Capitol Cocktail', priceMillimes: 11000 },
    ],
  },

  {
    nameAr: 'سموثي وفرابوتشينو',
    nameFr: 'Smoothies & Frappés',
    nameEn: 'Smoothies & Frappés',
    dishes: [
      { nameAr: 'فرابوتشينو', nameFr: 'Frappuccino', nameEn: 'Frappuccino', priceMillimes: 7500 },
      { nameAr: 'سموثي كوستاريكا', nameFr: 'Smoothie Costa Rica', nameEn: 'Costa Rica Smoothie', priceMillimes: 10500 },
      { nameAr: 'سموثي بينا كولادا', nameFr: 'Smoothie Piña Colada', nameEn: 'Piña Colada Smoothie', priceMillimes: 10500 },
      { nameAr: 'سموثي كابيتول', nameFr: 'Smoothie Capitol', nameEn: 'Capitol Smoothie', priceMillimes: 10500 },
      { nameAr: 'سموثي كاليفورنيا', nameFr: 'Smoothie California', nameEn: 'California Smoothie', priceMillimes: 10500 },
      { nameAr: 'سموثي بونتا كانا', nameFr: 'Smoothie Punta Cana', nameEn: 'Punta Cana Smoothie', priceMillimes: 10500 },
    ],
  },

  {
    nameAr: 'ديابولو',
    nameFr: 'Diabolo',
    nameEn: 'Diabolo',
    dishes: [
      { nameAr: 'ديابولو ريد بيري', nameFr: 'Diabolo Red Berry', nameEn: 'Red Berry Diabolo', priceMillimes: 5000 },
      { nameAr: 'ديابولو أزرق', nameFr: 'Diabolo Blue', nameEn: 'Blue Diabolo', priceMillimes: 5000 },
      { nameAr: 'ديابولو فراولة', nameFr: 'Diabolo Fraise', nameEn: 'Strawberry Diabolo', priceMillimes: 5000 },
      { nameAr: 'ديابولو توت', nameFr: 'Diabolo Framboise', nameEn: 'Raspberry Diabolo', priceMillimes: 5000 },
      { nameAr: 'ديابولو بلاك بيري', nameFr: 'Diabolo Black Berry', nameEn: 'Blackberry Diabolo', priceMillimes: 5000 },
    ],
  },

  {
    nameAr: 'حلويات وبوظة',
    nameFr: 'Desserts & Glace',
    nameEn: 'Desserts & Ice Cream',
    dishes: [
      { nameAr: 'سلطة فواكه', nameFr: 'Salade de Fruit', nameEn: 'Fruit Salad', priceMillimes: 9000 },
      { nameAr: 'سلة فواكه', nameFr: 'Corbeille de Fruits', nameEn: 'Fruit Basket', priceMillimes: 15000 },
      { nameAr: 'سلطة فواكه كابيتول', nameFr: 'Salade de Fruit Capitol', nameEn: 'Capitol Fruit Salad', priceMillimes: 12000 },
      { nameAr: 'صحن فواكه', nameFr: 'Assiette de Fruit', nameEn: 'Fruit Plate', priceMillimes: 8000 },
      { nameAr: 'صحن فواكه كابيتول', nameFr: 'Assiette de Fruit Capitol', nameEn: 'Capitol Fruit Plate', priceMillimes: 12000 },
      {
        nameAr: 'بوظة كابيتول',
        nameFr: 'Ice Cream Capitol',
        nameEn: 'Capitol Ice Cream',
        descriptionFr: 'Composition spéciale, 5 boules',
        priceMillimes: 18500,
        groups: [iceCreamFlavorGroup(5)],
      },
      {
        nameAr: 'بوظة ٣ كرات',
        nameFr: 'Ice Cream 3 Boules',
        nameEn: '3-Scoop Ice Cream',
        priceMillimes: 8500,
        groups: [iceCreamFlavorGroup(3)],
      },
      {
        nameAr: 'بوظة ٢ كرتان',
        nameFr: 'Ice Cream 2 Boules',
        nameEn: '2-Scoop Ice Cream',
        priceMillimes: 6000,
        groups: [iceCreamFlavorGroup(2)],
      },
      {
        nameAr: 'بوظة كبيرة',
        nameFr: 'Ice Cream Big',
        nameEn: 'Big Ice Cream',
        priceMillimes: 8000,
        groups: [iceCreamFlavorGroup(1)],
      },
      { nameAr: 'جواجم كابيتول', nameFr: 'Jwajem Capitol', nameEn: 'Capitol Jwajem', priceMillimes: 18000 },
      { nameAr: 'جواجم صغير', nameFr: 'Jwajem Small', nameEn: 'Small Jwajem', priceMillimes: 8000 },
      { nameAr: 'جواجم كبير', nameFr: 'Jwajem Big', nameEn: 'Big Jwajem', priceMillimes: 11500 },
    ],
  },

  {
    nameAr: 'الفطور',
    nameFr: 'Petit-Déjeuner',
    nameEn: 'Breakfast',
    dishes: [
      { nameAr: 'فطور سولو', nameFr: 'Solo Régal', nameEn: 'Solo Breakfast', descriptionFr: 'Pour 1 personne', priceMillimes: 20000 },
      { nameAr: 'فطور دو', nameFr: 'Duo Régal', nameEn: 'Duo Breakfast', descriptionFr: 'Pour 2 personnes', priceMillimes: 38000 },
      { nameAr: 'فطور الأطفال', nameFr: 'Le Déj des Kids', nameEn: 'Kids Breakfast', descriptionFr: 'Pour 1 enfant', priceMillimes: 12000 },
      { nameAr: 'فطور كابيتول', nameFr: 'Breakfast Capitol', nameEn: 'Capitol Breakfast', descriptionFr: 'Pour 4 personnes', priceMillimes: 58000 },
    ],
  },
];
