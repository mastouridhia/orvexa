import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type OrderRefsState = {
  ids: string[];
  remember: (ids: string | string[]) => void;
  forget: (id: string) => void;
  clear: () => void;
};

export const useOrderRefsStore = create<OrderRefsState>()(
  persist(
    (set) => ({
      ids: [],
      remember: (ids) => {
        const toAdd = typeof ids === 'string' ? [ids] : ids;
        set((s) => {
          const fresh = toAdd.filter((id) => !s.ids.includes(id));
          return fresh.length === 0 ? s : { ids: [...fresh, ...s.ids] };
        });
      },
      forget: (id) => set((s) => ({ ids: s.ids.filter((existing) => existing !== id) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'orvexa.customer.orderRefs' },
  ),
);
