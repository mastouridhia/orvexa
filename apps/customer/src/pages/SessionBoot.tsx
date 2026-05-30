import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import { useCartStore } from '../store/cart.js';
import { useOrderRefsStore } from '../store/orders.js';
import { IconWifiOff } from '../components/tf-icons.js';

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
  const [wifiGate, setWifiGate] = useState(false);
  // Incrementing this re-triggers the boot effect (used by the Retry button).
  const [retryCount, setRetryCount] = useState(0);

  // The restaurant name is stored temporarily so the wifi gate can display it.
  const restaurant = useSessionStore((s) => s.restaurant);

  useEffect(() => {
    if (!qrToken) return;
    let cancelled = false;
    setWifiGate(false);
    setError(null);
    void (async () => {
      try {
        const locale = (i18n.resolvedLanguage as 'fr' | 'ar' | 'en') ?? 'fr';
        const result = await api.openSession(qrToken, locale);
        if (cancelled) return;
        if (existingSession && existingSession.id !== result.session.id) {
          clearCart();
          clearOrderRefs();
        }
        setSession(result);
        const info = await api.getRestaurant(result.token);
        if (cancelled) return;
        setRestaurant(info);

        // For wifi-only mode: if the IP check at session open didn't verify
        // presence, block the customer here rather than letting them into the menu.
        if (result.session.orderGateMode === 'wifi' && !result.session.presenceVerified) {
          setWifiGate(true);
          return;
        }

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
    retryCount,
    i18n.resolvedLanguage,
    setSession,
    setRestaurant,
    navigate,
    clearCart,
    clearOrderRefs,
    existingSession,
    t,
  ]);

  if (wifiGate) {
    return (
      <div className="tf-boot-gate">
        <div className="tf-boot-gate__icon" aria-hidden="true">
          <IconWifiOff size={32} />
        </div>
        <h2 className="tf-boot-gate__title">{t('gate.wifiTitle')}</h2>
        <p className="tf-boot-gate__body">
          {t('gate.wifiBody', { name: restaurant?.name ?? '' })}
        </p>
        <button
          type="button"
          className="tf-boot-gate__retry"
          onClick={() => setRetryCount((n) => n + 1)}
        >
          {t('errors.retry')}
        </button>
      </div>
    );
  }

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
