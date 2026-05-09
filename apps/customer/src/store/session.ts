import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LanguageCode } from '@orvexa/shared';
import type { CustomerSessionResponse, RestaurantInfo } from '../api/queries.js';

type SessionState = {
  token: string | null;
  session: CustomerSessionResponse['session'] | null;
  restaurant: RestaurantInfo | null;
  locale: LanguageCode;
  setSession: (data: CustomerSessionResponse) => void;
  setRestaurant: (info: RestaurantInfo) => void;
  setLocale: (locale: LanguageCode) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      session: null,
      restaurant: null,
      locale: 'fr',
      setSession: (data) =>
        set({ token: data.token, session: data.session, locale: data.session.locale }),
      setRestaurant: (info) => set({ restaurant: info }),
      setLocale: (locale) => set({ locale }),
      clear: () => set({ token: null, session: null, restaurant: null }),
    }),
    {
      name: 'orvexa.customer.session',
      partialize: (s) => ({
        token: s.token,
        session: s.session,
        restaurant: s.restaurant,
        locale: s.locale,
      }),
    },
  ),
);
