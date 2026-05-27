import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import { useCartStore } from '../store/cart.js';
import { useOrderRefsStore } from '../store/orders.js';

export function SessionBoot() {
  const { t, i18n } = useTranslation();
  const { token: qrToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const setRestaurant = useSessionStore((s) => s.setRestaurant);
  const clearCart = useCartStore((s) => s.clear);
  const clearOrderRefs = useOrderRefsStore((s) => s.clear);
  const existingSession = useSessionStore((s) => s.session);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const locale = (i18n.resolvedLanguage as 'fr' | 'ar' | 'en') ?? 'fr';
        const result = await api.openSession(qrToken, locale);
        if (cancelled) return;
        // New scan often creates a new session row (even for the same table).
        // If the session id changes, clear local order/cart state to avoid
        // "Order belongs to a different session" when editing a previous order.
        if (existingSession && existingSession.id !== result.session.id) {
          clearCart();
          clearOrderRefs();
        }
        setSession(result);
        const restaurant = await api.getRestaurant(result.token);
        if (!cancelled) setRestaurant(restaurant);
        navigate('/menu', { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : t('errors.boot'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    qrToken,
    i18n.resolvedLanguage,
    setSession,
    setRestaurant,
    navigate,
    clearCart,
    clearOrderRefs,
    existingSession,
    t,
  ]);

  if (error) {
    return (
      <div className="empty-state">
        <h2>{t('errors.title')}</h2>
        <p>{error}</p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <div className="skeleton" style={{ height: '1.2rem', width: '60%', margin: '0.5rem auto' }} />
      <div className="skeleton" style={{ height: '1rem', width: '40%', margin: '0.5rem auto' }} />
    </div>
  );
}
