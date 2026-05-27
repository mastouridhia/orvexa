import { useEffect } from 'react';
import { api } from '../api/queries.js';
import { useSessionStore } from '../store/session.js';

const CHECK_INTERVAL_MS = 60_000; // check every minute
const RENEW_THRESHOLD_MS = 30 * 60 * 1000; // renew when < 30 min left

/**
 * Silently renews the customer session token before it expires.
 * Runs a periodic check every minute; if the session is within 30 minutes
 * of expiry the /sessions/renew endpoint is called and the store is updated.
 * On failure the session is left as-is — the existing token remains valid
 * until it actually expires, at which point the normal 401 → clear flow fires.
 */
export function useSessionRenewal(): void {
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    if (!token || !session) return;

    const check = async () => {
      if (!token || !session) return;
      const expiresAt = new Date(session.expiresAt).getTime();
      const msUntilExpiry = expiresAt - Date.now();
      if (msUntilExpiry > RENEW_THRESHOLD_MS) return;
      try {
        const result = await api.renewSession(token);
        setSession(result);
      } catch {
        // Renewal failure is non-fatal; existing token is still valid until expiry.
      }
    };

    void check();
    const id = window.setInterval(() => {
      void check();
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [token, session?.id, setSession, session]);
}
