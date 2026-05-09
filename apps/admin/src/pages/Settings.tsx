import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Restaurant } from '@orvexa/shared';
import { LanguageSelector } from '@orvexa/ui';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { IconGlobe, IconHome, IconLogout, IconMonitor, IconReceipt } from '../components/tf-icons.js';

const LANGS: LanguageCode[] = ['fr', 'ar', 'en'];
const LANG_LABELS: Record<LanguageCode, string> = { fr: 'Français', ar: 'العربية', en: 'English' };
const LANG_FLAGS: Record<LanguageCode, string> = { fr: '🇫🇷', ar: '🇸🇦', en: '🇬🇧' };

export function Settings() {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const logout = useAuthStore((s) => s.logout);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await authedFetch((tk) => api.getRestaurant(tk));
        if (!cancelled) setRestaurant(r);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [authedFetch]);

  const save = async () => {
    if (!restaurant) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await authedFetch((tk) =>
        api.patchRestaurant(tk, {
          name: restaurant.name,
          defaultLanguage: restaurant.defaultLanguage,
          supportedLanguages: restaurant.supportedLanguages,
          taxPercent: restaurant.taxPercent,
          servicePercent: restaurant.servicePercent,
          timezone: restaurant.timezone,
        }),
      );
      setRestaurant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleLang = (l: LanguageCode) => {
    if (!restaurant) return;
    const has = restaurant.supportedLanguages.includes(l);
    const next = has
      ? restaurant.supportedLanguages.filter((x) => x !== l)
      : [...restaurant.supportedLanguages, l];
    if (next.length === 0) return;
    setRestaurant({ ...restaurant, supportedLanguages: next as [LanguageCode, ...LanguageCode[]] });
  };

  if (!restaurant) {
    return (
      <div className="tf-a-settings__loading">
        <h1 className="page-title">{t('settings.title')}</h1>
        {error
          ? <div className="error-banner">{error}</div>
          : <div className="tf-a-settings__skeleton" />
        }
      </div>
    );
  }

  return (
    <>
      <div className="tf-a-settings__topbar">
        <h1 className="page-title" style={{ margin: 0 }}>{t('settings.title')}</h1>
        <div className="tf-a-settings__topbar-right">
          {saved && <span className="tf-a-settings__flash tf-a-settings__flash--ok">✓ {t('settings.saved')}</span>}
          {error && <span className="tf-a-settings__flash tf-a-settings__flash--err">{error}</span>}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={save}
          >
            {t('settings.save')}
          </button>
        </div>
      </div>

      <div className="tf-a-settings">

        {/* ── Restaurant ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconHome />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.sectionRestaurant')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.sectionRestaurantSub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <label className="tf-a-settings__field">
              <span className="tf-a-settings__field-label">{t('settings.name')}</span>
              <input
                type="text"
                required
                value={restaurant.name}
                onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
              />
            </label>
          </div>
        </section>

        {/* ── Localization ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconGlobe />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.sectionLocalization')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.sectionLocalizationSub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.timezone')}</span>
                <input
                  type="text"
                  value={restaurant.timezone}
                  onChange={(e) => setRestaurant({ ...restaurant, timezone: e.target.value })}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.defaultLanguage')}</span>
                <select
                  value={restaurant.defaultLanguage}
                  onChange={(e) =>
                    setRestaurant({ ...restaurant, defaultLanguage: e.target.value as LanguageCode })
                  }
                >
                  {LANGS.map((l) => (
                    <option key={l} value={l}>{LANG_LABELS[l]}</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <span className="tf-a-settings__field-label">{t('settings.supportedLanguages')}</span>
              <div className="tf-a-settings__lang-chips">
                {LANGS.map((l) => {
                  const on = restaurant.supportedLanguages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      className={`tf-a-settings__lang-chip${on ? ' is-on' : ''}`}
                      onClick={() => toggleLang(l)}
                      aria-pressed={on}
                    >
                      <span>{LANG_FLAGS[l]}</span>
                      <span>{LANG_LABELS[l]}</span>
                      {on && <span className="tf-a-settings__lang-chip-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconReceipt />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.sectionPricing')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.sectionPricingSub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.taxPercent')}</span>
                <div className="tf-a-settings__field-addon">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={restaurant.taxPercent}
                    onChange={(e) =>
                      setRestaurant({ ...restaurant, taxPercent: Number(e.target.value) })
                    }
                  />
                  <span className="tf-a-settings__addon-unit">%</span>
                </div>
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.servicePercent')}</span>
                <div className="tf-a-settings__field-addon">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={restaurant.servicePercent}
                    onChange={(e) =>
                      setRestaurant({ ...restaurant, servicePercent: Number(e.target.value) })
                    }
                  />
                  <span className="tf-a-settings__addon-unit">%</span>
                </div>
              </label>
            </div>
            <p className="tf-a-settings__note">{t('settings.pricingNote')}</p>
          </div>
        </section>

        {/* ── Interface ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconMonitor />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.uiLanguage')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.uiLanguageHint')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <LanguageSelector />
          </div>
        </section>

        {/* ── Sign out ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconLogout />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('nav.logout')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.logoutHint', { defaultValue: 'End this session on this device.' })}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={logout}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
              style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconLogout />
            </button>
          </div>
        </section>

      </div>
    </>
  );
}
