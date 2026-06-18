import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LanguageCode } from '@orvexa/shared';
import type { CustomerSessionResponse, RestaurantInfo } from '../api/queries.js';

type SessionState = {
  token: string | null;
  session: CustomerSessionResponse['session'] | null;
  restaurant: RestaurantInfo | null;
  locale: LanguageCode;
  // Restaurant slug when viewing the shared public menu (/m/:slug): no table
  // session, read-only. null in the normal QR ordering flow.
  previewSlug: string | null;
  setSession: (data: CustomerSessionResponse) => void;
  setRestaurant: (info: RestaurantInfo) => void;
  setPreview: (slug: string) => void;
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
      previewSlug: null,
      // Opening a real table session supersedes preview mode.
      setSession: (data) =>
        set({
          token: data.token,
          session: data.session,
          locale: data.session.locale,
          previewSlug: null,
        }),
      setRestaurant: (info) => set({ restaurant: info }),
      setPreview: (slug) => set({ previewSlug: slug, token: null, session: null }),
      setLocale: (locale) => set({ locale }),
      clear: () => set({ token: null, session: null, restaurant: null, previewSlug: null }),
    }),
    {
      name: 'orvexa.customer.session',
      partialize: (s) => ({
        token: s.token,
        session: s.session,
        restaurant: s.restaurant,
        locale: s.locale,
        previewSlug: s.previewSlug,
      }),
    },
  ),
);
