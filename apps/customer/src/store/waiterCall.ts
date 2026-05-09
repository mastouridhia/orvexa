import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const AUTO_CLEAR_MS = 5 * 60 * 1000;

type WaiterCallState = {
  calledAt: number | null;
  tableId: string | null;
  markCalled: (tableId: string) => void;
  dismiss: () => void;
};

export const useWaiterCallStore = create<WaiterCallState>()(
  persist(
    (set) => ({
      calledAt: null,
      tableId: null,
      markCalled: (tableId) => set({ calledAt: Date.now(), tableId }),
      dismiss: () => set({ calledAt: null, tableId: null }),
    }),
    {
      name: 'orvexa.customer.waiterCall',
      partialize: (s) => ({ calledAt: s.calledAt, tableId: s.tableId }),
    },
  ),
);

export function isWaiterCallStale(calledAt: number | null): boolean {
  if (!calledAt) return true;
  return Date.now() - calledAt > AUTO_CLEAR_MS;
}
