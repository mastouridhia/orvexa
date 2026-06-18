import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StaffUser } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { ApiError, getErrorMessage } from '../api/client.js';

function decodePlan(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!));
    return typeof payload.plan === 'number' ? payload.plan : 1;
  } catch {
    return 1;
  }
}

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: StaffUser | null;
  plan: number;
  loginError: string | null;
  setTokens: (a: string, r: string) => void;
  setUser: (u: StaffUser) => void;
  logout: () => void;
  login: (email: string, password: string, restaurantSlug?: string) => Promise<boolean>;
  authedFetch: <T>(call: (token: string) => Promise<T>) => Promise<T>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      plan: 1,
      loginError: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken, plan: decodePlan(accessToken) }),
      setUser: (user) => set({ user }),
      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) void api.logout(refreshToken).catch(() => undefined);
        set({ accessToken: null, refreshToken: null, user: null, plan: 1 });
      },
      async login(email, password, restaurantSlug) {
        try {
          const result = await api.login(email, password, restaurantSlug);
          set({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            plan: decodePlan(result.accessToken),
            loginError: null,
          });
          return true;
        } catch (err) {
          set({ loginError: getErrorMessage(err) });
          return false;
        }
      },
      async authedFetch<T>(call: (token: string) => Promise<T>): Promise<T> {
        const { accessToken, refreshToken } = get();
        if (!accessToken) throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);
        try {
          return await call(accessToken);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401 && refreshToken) {
            try {
              const tokens = await api.refresh(refreshToken);
              set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, plan: decodePlan(tokens.accessToken) });
              return await call(tokens.accessToken);
            } catch {
              set({ accessToken: null, refreshToken: null, user: null, plan: 1 });
              throw err;
            }
          }
          throw err;
        }
      },
    }),
    {
      name: 'orvexa.waiter.auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
        plan: s.plan,
      }),
    },
  ),
);
