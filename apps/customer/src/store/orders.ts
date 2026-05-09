import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type OrderRefsState = {
  ids: string[];
  remember: (id: string) => void;
  clear: () => void;
};

export const useOrderRefsStore = create<OrderRefsState>()(
  persist(
    (set) => ({
      ids: [],
      remember: (id) =>
        set((s) => (s.ids.includes(id) ? s : { ids: [id, ...s.ids] })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'orvexa.customer.orderRefs' },
  ),
);
