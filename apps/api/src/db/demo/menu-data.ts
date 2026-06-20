/**
 * Demo tenant menu — a fictional Tunisian pizzeria / fast-food ("Pizza Corner").
 * Used by the seeded `demo` restaurant (35.3) for live sales pitches, so it never
 * touches a real client's data. Prices in millimes (1 TND = 1000 millimes).
 *
 * Self-contained on purpose: the variant-group types are redefined here (rather
 * than imported from the Capitol menu) so editing a real client's menu can never
 * change what a prospect sees in the demo.
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

/** Pizza size: base price is the Large; Maxi adds a delta. */
function pizzaSize(largeToMaxiDelta: number): VariantGroupDef {
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
      { nameAr: 'ماكسي', nameFr: 'Maxi', nameEn: 'Maxi', priceDeltaMillimes: largeToMaxiDelta },
    ],
  };
}

/** Optional pizza toppings (multi-select, up to 5). Same list reused across pizzas. */
function pizzaSupplements(): VariantGroupDef {
  return {
    nameAr: 'إضافات',
    nameFr: 'Suppléments',
    nameEn: 'Extras',
    selectionType: 'multi',
    required: false,
    minChoices: 0,
    maxChoices: 5,
    variants: [
      { nameAr: 'جبن إضافي', nameFr: 'Fromage extra', nameEn: 'Extra cheese', priceDeltaMillimes: 2000 },
      { nameAr: 'فطر', nameFr: 'Champignons', nameEn: 'Mushrooms', priceDeltaMillimes: 1500 },
      { nameAr: 'زيتون', nameFr: 'Olives', nameEn: 'Olives', priceDeltaMillimes: 1000 },
      { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 2500 },
      { nameAr: 'بيبروني', nameFr: 'Pepperoni', nameEn: 'Pepperoni', priceDeltaMillimes: 2500 },
      { nameAr: 'بيضة', nameFr: 'Œuf', nameEn: 'Egg', priceDeltaMillimes: 1000 },
      { nameAr: 'مرڨاز', nameFr: 'Merguez', nameEn: 'Merguez', priceDeltaMillimes: 2500 },
    ],
  };
}

/** Burger formula: alone, or as a menu with fries + drink. */
function burgerFormule(): VariantGroupDef {
  return {
    nameAr: 'الصيغة',
    nameFr: 'Formule',
    nameEn: 'Formula',
    selectionType: 'single',
    required: true,
    minChoices: 1,
    maxChoices: 1,
    variants: [
      { nameAr: 'وحدو', nameFr: 'Seul', nameEn: 'Alone', priceDeltaMillimes: 0 },
      {
        nameAr: 'منيو (بطاطا + مشروب)',
        nameFr: 'Menu (frites + boisson)',
        nameEn: 'Menu (fries + drink)',
        priceDeltaMillimes: 3500,
      },
    ],
  };
}

/** Single-choice filling for tacos / makloub / baguette. */
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

// Shared filling list (deltas on top of the dish base price).
const FILLINGS: VariantDef[] = [
  { nameAr: 'دجاج', nameFr: 'Poulet', nameEn: 'Chicken', priceDeltaMillimes: 0 },
  { nameAr: 'اسكالوب', nameFr: 'Escalope', nameEn: 'Escalope', priceDeltaMillimes: 1000 },
  { nameAr: 'شاورما', nameFr: 'Chawarma', nameEn: 'Shawarma', priceDeltaMillimes: 1500 },
  { nameAr: 'كباب', nameFr: 'Kebab', nameEn: 'Kebab', priceDeltaMillimes: 1500 },
  { nameAr: 'تن', nameFr: 'Thon', nameEn: 'Tuna', priceDeltaMillimes: 500 },
];

// ══════════════════════════ MENU ══════════════════════════

export const DEMO_MENU: CategoryDef[] = [
  {
    nameAr: 'البيتزا',
    nameFr: 'Pizzas',
    nameEn: 'Pizzas',
    dishes: [
      {
        nameAr: 'مارڨريتا',
        nameFr: 'Margherita',
        nameEn: 'Margherita',
        descriptionFr: 'Sauce tomate, mozzarella, basilic',
        priceMillimes: 9000,
        groups: [pizzaSize(5000), pizzaSupplements()],
      },
      {
        nameAr: 'نابوليتان',
        nameFr: 'Napolitaine',
        nameEn: 'Napolitana',
        descriptionFr: 'Tomate, mozzarella, anchois, câpres, olives',
        priceMillimes: 11000,
        groups: [pizzaSize(5000), pizzaSupplements()],
      },
      {
        nameAr: 'رين',
        nameFr: 'Reine',
        nameEn: 'Queen',
        descriptionFr: 'Tomate, mozzarella, jambon, champignons',
        priceMillimes: 12000,
        groups: [pizzaSize(6000), pizzaSupplements()],
      },
      {
        nameAr: 'بيبروني',
        nameFr: 'Pepperoni',
        nameEn: 'Pepperoni',
        descriptionFr: 'Tomate, mozzarella, pepperoni piquant',
        priceMillimes: 13000,
        groups: [pizzaSize(6000), pizzaSupplements()],
      },
      {
        nameAr: 'تن',
        nameFr: 'Thon',
        nameEn: 'Tuna',
        descriptionFr: 'Tomate, mozzarella, thon, oignon, olives',
        priceMillimes: 12000,
        groups: [pizzaSize(6000), pizzaSupplements()],
      },
      {
        nameAr: 'أربع فصول',
        nameFr: 'Quatre Saisons',
        nameEn: 'Four Seasons',
        descriptionFr: 'Jambon, champignons, poivrons, olives',
        priceMillimes: 13000,
        groups: [pizzaSize(6000), pizzaSupplements()],
      },
      {
        nameAr: 'نباتية',
        nameFr: 'Végétarienne',
        nameEn: 'Vegetarian',
        descriptionFr: 'Légumes grillés, champignons, poivrons, olives',
        priceMillimes: 11000,
        groups: [pizzaSize(5000), pizzaSupplements()],
      },
    ],
  },
  {
    nameAr: 'البرغر',
    nameFr: 'Burgers',
    nameEn: 'Burgers',
    dishes: [
      {
        nameAr: 'برغر كلاسيك',
        nameFr: 'Burger Classic',
        nameEn: 'Classic Burger',
        descriptionFr: 'Steak haché, salade, tomate, sauce maison',
        priceMillimes: 8500,
        groups: [burgerFormule()],
      },
      {
        nameAr: 'تشيز برغر',
        nameFr: 'Cheese Burger',
        nameEn: 'Cheese Burger',
        descriptionFr: 'Steak, cheddar, oignon, sauce burger',
        priceMillimes: 9500,
        groups: [burgerFormule()],
      },
      {
        nameAr: 'دبل تشيز',
        nameFr: 'Double Cheese',
        nameEn: 'Double Cheese',
        descriptionFr: 'Double steak, double cheddar, sauce',
        priceMillimes: 13000,
        groups: [burgerFormule()],
      },
      {
        nameAr: 'تشيكن برغر',
        nameFr: 'Chicken Burger',
        nameEn: 'Chicken Burger',
        descriptionFr: 'Poulet pané croustillant, salade, sauce',
        priceMillimes: 9000,
        groups: [burgerFormule()],
      },
    ],
  },
  {
    nameAr: 'سندويتشات وتاكوس',
    nameFr: 'Sandwichs & Tacos',
    nameEn: 'Sandwiches & Tacos',
    dishes: [
      {
        nameAr: 'تاكوس',
        nameFr: 'Tacos',
        nameEn: 'Tacos',
        descriptionFr: 'Galette, frites, sauce fromagère',
        priceMillimes: 7000,
        groups: [fillingGroup(FILLINGS)],
      },
      {
        nameAr: 'مقلوب',
        nameFr: 'Makloub',
        nameEn: 'Makloub',
        descriptionFr: 'Pain tabouna roulé, fromage, sauce',
        priceMillimes: 6500,
        groups: [fillingGroup(FILLINGS)],
      },
      {
        nameAr: 'باڨات فارسي',
        nameFr: 'Baguette farcie',
        nameEn: 'Stuffed Baguette',
        descriptionFr: 'Demi-baguette, frites, fromage, sauce',
        priceMillimes: 6500,
        groups: [fillingGroup(FILLINGS)],
      },
    ],
  },
  {
    nameAr: 'المعكرونة',
    nameFr: 'Pâtes',
    nameEn: 'Pasta',
    dishes: [
      {
        nameAr: 'بولونيز',
        nameFr: 'Bolognaise',
        nameEn: 'Bolognese',
        descriptionFr: 'Pâtes, sauce tomate, viande hachée',
        priceMillimes: 11000,
      },
      {
        nameAr: 'كاربونارا',
        nameFr: 'Carbonara',
        nameEn: 'Carbonara',
        descriptionFr: 'Crème, jambon, parmesan',
        priceMillimes: 12000,
      },
      {
        nameAr: 'أربع أجبان',
        nameFr: 'Quatre Fromages',
        nameEn: 'Four Cheese',
        descriptionFr: 'Sauce crémeuse aux quatre fromages',
        priceMillimes: 12000,
      },
      {
        nameAr: 'بيناي أرابياتا',
        nameFr: 'Penne Arrabiata',
        nameEn: 'Penne Arrabiata',
        descriptionFr: 'Sauce tomate relevée, ail, piment',
        priceMillimes: 10000,
      },
    ],
  },
  {
    nameAr: 'إضافات',
    nameFr: 'Accompagnements',
    nameEn: 'Sides',
    dishes: [
      { nameAr: 'بطاطا مقلية', nameFr: 'Frites', nameEn: 'Fries', priceMillimes: 3500 },
      {
        nameAr: 'بطاطا بالجبن',
        nameFr: 'Frites Fromage',
        nameEn: 'Cheese Fries',
        priceMillimes: 5000,
      },
      { nameAr: 'ناڨتس (٦ قطع)', nameFr: 'Nuggets (6 pcs)', nameEn: 'Nuggets (6 pcs)', priceMillimes: 6000 },
      { nameAr: 'حلقات بصل', nameFr: 'Onion Rings', nameEn: 'Onion Rings', priceMillimes: 4500 },
      {
        nameAr: 'سلطة سيزر',
        nameFr: 'Salade César',
        nameEn: 'Caesar Salad',
        descriptionFr: 'Salade, poulet grillé, parmesan, croûtons',
        priceMillimes: 8000,
      },
    ],
  },
  {
    nameAr: 'المشروبات',
    nameFr: 'Boissons',
    nameEn: 'Drinks',
    dishes: [
      { nameAr: 'ماء ٠٫٥ل', nameFr: 'Eau 0.5L', nameEn: 'Water 0.5L', priceMillimes: 1000 },
      { nameAr: 'صودا (علبة)', nameFr: 'Soda (canette)', nameEn: 'Soda (can)', priceMillimes: 2500 },
      {
        nameAr: 'عصير برتقال طازج',
        nameFr: "Jus d'orange frais",
        nameEn: 'Fresh orange juice',
        priceMillimes: 4000,
      },
      { nameAr: 'ليموناضة', nameFr: 'Limonade maison', nameEn: 'Homemade lemonade', priceMillimes: 3500 },
      { nameAr: 'قهوة إكسبريس', nameFr: 'Café express', nameEn: 'Espresso', priceMillimes: 2000 },
    ],
  },
];
