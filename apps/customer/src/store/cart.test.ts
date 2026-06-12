import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCartStore,
  lineSubtotal,
  cartSubtotal,
  cartLineCount,
  buildPlaceOrderItems,
  variantSummary,
  makeLine,
  type CartLine,
} from './cart.js';
import type { Dish, Variant, VariantGroup } from '@orvexa/shared';

const sampleLine: CartLine = {
  uid: 'a',
  dishId: 'd1',
  name: { ar: 'بريك', fr: 'Brik', en: 'Brik' },
  imageUrl: null,
  unitPriceMillimes: 4500,
  quantity: 2,
  variants: [
    {
      variantId: 'v1',
      groupId: 'g1',
      name: { ar: 'كبير', fr: 'Grande', en: 'Large' },
      priceDeltaMillimes: 1500,
    },
  ],
};

describe('cart pure helpers', () => {
  it('lineSubtotal includes variant deltas × quantity', () => {
    expect(lineSubtotal(sampleLine)).toBe(2 * (4500 + 1500));
  });

  it('cartSubtotal sums lines', () => {
    const second: CartLine = {
      ...sampleLine,
      uid: 'b',
      unitPriceMillimes: 2000,
      quantity: 1,
      variants: [],
    };
    expect(cartSubtotal([sampleLine, second])).toBe(12000 + 2000);
  });

  it('cartLineCount sums quantities (not lines)', () => {
    expect(cartLineCount([sampleLine, { ...sampleLine, uid: 'b', quantity: 3 }])).toBe(5);
  });

  it('buildPlaceOrderItems projects to API shape and omits empty notes', () => {
    const items = buildPlaceOrderItems([sampleLine]);
    expect(items).toEqual([{ dishId: 'd1', quantity: 2, variantIds: ['v1'] }]);
  });

  it('buildPlaceOrderItems includes notes when present', () => {
    const withNotes: CartLine = { ...sampleLine, notes: 'no salt' };
    const items = buildPlaceOrderItems([withNotes]);
    expect(items[0]).toMatchObject({ notes: 'no salt' });
  });

  it('variantSummary joins names by · in the chosen language with fr fallback', () => {
    expect(variantSummary(sampleLine, 'en')).toBe('Large');
    expect(variantSummary(sampleLine, 'fr')).toBe('Grande');
    const noEn: CartLine = {
      ...sampleLine,
      variants: [
        {
          variantId: 'v1',
          groupId: 'g1',
          name: { ar: 'X', fr: 'Fr', en: '' },
          priceDeltaMillimes: 0,
        },
      ],
    };
    expect(variantSummary(noEn, 'en')).toBe('Fr');
  });
});

describe('makeLine', () => {
  const dish: Dish = {
    id: 'd1',
    restaurantId: 'r1',
    categoryId: 'c1',
    name: { ar: 'بريك', fr: 'Brik', en: 'Brik' },
    imageUrl: null,
    imageUrls: [],
    priceMillimes: 4500,
    prepTimeMinutes: null,
    available: true,
    isPlatDuJour: false,
    sortOrder: 0,
    variantGroups: [],
  };
  const group: VariantGroup = {
    id: 'g1',
    dishId: 'd1',
    name: { ar: 'الحجم', fr: 'Taille', en: 'Size' },
    selectionType: 'single',
    required: true,
    min: 1,
    max: 1,
    sortOrder: 0,
    variants: [],
  };
  const variant: Variant = {
    id: 'v1',
    groupId: 'g1',
    name: { ar: 'كبير', fr: 'Grande', en: 'Large' },
    priceDeltaMillimes: 1500,
    sortOrder: 0,
    isActive: true,
  };

  it('produces a line snapshot with a generated uid and selected variants flattened', () => {
    const line = makeLine(dish, [{ group, variant }], 2, 'no salt');
    expect(line.dishId).toBe('d1');
    expect(line.unitPriceMillimes).toBe(4500);
    expect(line.quantity).toBe(2);
    expect(line.notes).toBe('no salt');
    expect(line.variants).toHaveLength(1);
    expect(line.variants[0]?.variantId).toBe('v1');
    expect(line.uid).toMatch(/.+/);
  });

  it('omits notes when the caller passes none', () => {
    const line = makeLine(dish, [], 1);
    expect(line.notes).toBeUndefined();
  });
});

describe('useCartStore actions', () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [] });
  });

  it('add appends a line', () => {
    useCartStore.getState().add(sampleLine);
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('setQuantity updates only the matching uid', () => {
    useCartStore.getState().add(sampleLine);
    useCartStore.getState().add({ ...sampleLine, uid: 'b', quantity: 1 });
    useCartStore.getState().setQuantity('a', 5);
    const lines = useCartStore.getState().lines;
    expect(lines.find((l) => l.uid === 'a')?.quantity).toBe(5);
    expect(lines.find((l) => l.uid === 'b')?.quantity).toBe(1);
  });

  it('remove drops a line by uid', () => {
    useCartStore.getState().add(sampleLine);
    useCartStore.getState().add({ ...sampleLine, uid: 'b' });
    useCartStore.getState().remove('a');
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0]?.uid).toBe('b');
  });

  it('clear empties the cart', () => {
    useCartStore.getState().add(sampleLine);
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});
