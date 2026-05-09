import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { LanguageSelector } from '@orvexa/ui';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import { useCartStore } from '../store/cart.js';
import { useOrderRefsStore } from '../store/orders.js';
import { IconQR } from '../components/tf-icons.js';

export function ScanLanguage() {
  const { t, i18n } = useTranslation();
  const { token: qrToken } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const setSession = useSessionStore((s) => s.setSession);
  const setRestaurant = useSessionStore((s) => s.setRestaurant);
  const setLocale = useSessionStore((s) => s.setLocale);
  const existingSession = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const storedLocale = useSessionStore((s) => s.locale);

  const clearCart = useCartStore((s) => s.clear);
  const clearOrderRefs = useOrderRefsStore((s) => s.clear);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo<LanguageCode>(() => {
    return ((i18n.resolvedLanguage as LanguageCode | undefined) ?? storedLocale ?? 'fr') as LanguageCode;
  }, [i18n.resolvedLanguage, storedLocale]);

  useEffect(() => {
    // Always land here on scan; default to whatever i18n currently has.
    // (LanguageSelector already updates i18n + document locale.)
    void i18n.changeLanguage(initial);
  }, [i18n, initial]);

  const confirm = async () => {
    if (!qrToken) return;
    setBusy(true);
    setError(null);
    try {
      const locale = (i18n.resolvedLanguage as LanguageCode | undefined) ?? 'fr';
      setLocale(locale);
      const result = await api.openSession(qrToken, locale);

      if (existingSession && existingSession.id !== result.session.id) {
        clearCart();
        clearOrderRefs();
      }
      setSession(result);
      const restaurant = await api.getRestaurant(result.token);
      setRestaurant(restaurant);
      navigate('/menu', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.boot'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tf-welcome">
      <div className="tf-welcome__hero" aria-hidden="true">
        <div className="tf-welcome__halo" />
        <IconQR size={42} color="var(--tf-accent)" />
      </div>

      <h1 className="tf-welcome__title">
        <span>{t('welcome.title')}</span>
        <span className="tf-display tf-welcome__brand">
          {restaurant?.name ?? 'Orvexa'}
        </span>
      </h1>

      <p className="tf-welcome__sub">{t('settings.languageHint')}</p>

      <div className="tf-welcome__lang">
        <LanguageSelector onChange={setLocale} />
      </div>

      <div className="tf-welcome__actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={confirm} disabled={busy}>
          {busy ? t('actions.calling') : t('actions.continue', { defaultValue: 'Continue' })}
        </button>
      </div>
      {error ? (
        <div className="error-banner" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}
    </section>
  );
}

