import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dish, LocalizedString, Variant, VariantGroup } from '@orvexa/shared';

export type CartLine = {
  uid: string; // local UUID
  dishId: string;
  name: LocalizedString;
  imageUrl: string | null;
  unitPriceMillimes: number;
  quantity: number;
  notes?: string;
  variants: {
    variantId: string;
    groupId: string;
    name: LocalizedString;
    priceDeltaMillimes: number;
  }[];
};

type CartState = {
  lines: CartLine[];
  /** When set, "Confirm" appends to this order via POST /orders/:id/items instead of placing a new order */
  editingOrderId: string | null;
  /** Server-assigned owner of the shared cart for the current table session. */
  ownerSessionId: string | null;
  add: (line: CartLine) => void;
  setQuantity: (uid: string, quantity: number) => void;
  remove: (uid: string) => void;
  clear: () => void;
  replaceFromServer: (lines: CartLine[], ownerSessionId: string) => void;
  setOwner: (ownerSessionId: string | null) => void;
  startEditing: (orderId: string) => void;
  stopEditing: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      editingOrderId: null,
      ownerSessionId: null,
      add: (line) => set((s) => ({ lines: [...s.lines, line] })),
      setQuantity: (uid, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.uid === uid ? { ...l, quantity } : l)),
        })),
      remove: (uid) => set((s) => ({ lines: s.lines.filter((l) => l.uid !== uid) })),
      clear: () => set({ lines: [], editingOrderId: null }),
      replaceFromServer: (lines, ownerSessionId) => set({ lines, ownerSessionId }),
      setOwner: (ownerSessionId) => set({ ownerSessionId }),
      startEditing: (orderId) => set({ editingOrderId: orderId, lines: [] }),
      stopEditing: () => set({ editingOrderId: null }),
    }),
    { name: 'orvexa.customer.cart' },
  ),
);

export function lineSubtotal(line: CartLine): number {
  const variantDelta = line.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0);
  return (line.unitPriceMillimes + variantDelta) * line.quantity;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + lineSubtotal(l), 0);
}

export function cartLineCount(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

export function buildPlaceOrderItems(lines: CartLine[]) {
  return lines.map((l) => ({
    dishId: l.dishId,
    quantity: l.quantity,
    variantIds: l.variants.map((v) => v.variantId),
    ...(l.notes ? { notes: l.notes } : {}),
  }));
}

export function variantSummary(line: CartLine, lang: 'ar' | 'fr' | 'en'): string {
  return line.variants.map((v) => v.name[lang] || v.name.fr).join(' · ');
}

export function makeLine(
  dish: Dish,
  selectedVariants: { group: VariantGroup; variant: Variant }[],
  quantity: number,
  notes?: string,
): CartLine {
  const uid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    uid,
    dishId: dish.id,
    name: dish.name,
    imageUrl: dish.imageUrl ?? dish.imageUrls?.[0] ?? null,
    unitPriceMillimes: dish.priceMillimes,
    quantity,
    ...(notes ? { notes } : {}),
    variants: selectedVariants.map(({ group, variant }) => ({
      variantId: variant.id,
      groupId: group.id,
      name: variant.name,
      priceDeltaMillimes: variant.priceDeltaMillimes,
    })),
  };
}
