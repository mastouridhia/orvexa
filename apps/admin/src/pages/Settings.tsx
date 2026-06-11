import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, PaymentPoint, Restaurant } from '@orvexa/shared';
import { LanguageSelector } from '@orvexa/ui';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import {
  IconGlobe,
  IconHome,
  IconLogout,
  IconMonitor,
  IconReceipt,
  IconShield,
} from '../components/tf-icons.js';
import type { OrderGateMode } from '@orvexa/shared';

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

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetInputRef = useRef<HTMLInputElement>(null);

  const [newNetwork, setNewNetwork] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);

  const RESET_KEYWORD = t('settings.dangerZone.confirmKeyword');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await authedFetch((tk) => api.getRestaurant(tk));
        if (!cancelled) setRestaurant(r);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const openResetModal = () => {
    setResetConfirmText('');
    setResetError(null);
    setResetModalOpen(true);
    setTimeout(() => resetInputRef.current?.focus(), 50);
  };

  const closeResetModal = () => {
    if (resetBusy) return;
    setResetModalOpen(false);
  };

  const doReset = async () => {
    if (resetConfirmText !== RESET_KEYWORD) return;
    setResetBusy(true);
    setResetError(null);
    try {
      await authedFetch((tk) => api.resetOperationalData(tk));
      setResetModalOpen(false);
    } catch (err) {
      setResetError(getErrorMessage(err));
    } finally {
      setResetBusy(false);
    }
  };

  const addNetwork = () => {
    if (!restaurant || !newNetwork.trim()) return;
    const n = newNetwork.trim();
    if (restaurant.allowedNetworks.includes(n)) { setNewNetwork(''); return; }
    setRestaurant({ ...restaurant, allowedNetworks: [...restaurant.allowedNetworks, n] });
    setNewNetwork('');
  };

  const removeNetwork = (n: string) => {
    if (!restaurant) return;
    setRestaurant({ ...restaurant, allowedNetworks: restaurant.allowedNetworks.filter((x) => x !== n) });
  };

  const detectAndAddIp = async () => {
    if (!restaurant) return;
    setDetecting(true);
    setDetectedIp(null);
    try {
      const { ip } = await authedFetch((tk) => api.detectIp(tk));
      setDetectedIp(ip);
      if (!restaurant.allowedNetworks.includes(ip)) {
        setRestaurant({ ...restaurant, allowedNetworks: [...restaurant.allowedNetworks, ip] });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDetecting(false);
    }
  };

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
          paymentPoint: restaurant.paymentPoint,
          orderGateMode: restaurant.orderGateMode,
          allowedNetworks: restaurant.allowedNetworks,
          orderCeiling: restaurant.orderCeiling,
        }),
      );
      setRestaurant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(getErrorMessage(err));
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
        {error ? (
          <div className="error-banner">{error}</div>
        ) : (
          <div className="tf-a-settings__skeleton" />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="tf-a-settings__topbar">
        <h1 className="page-title" style={{ margin: 0 }}>
          {t('settings.title')}
        </h1>
        <div className="tf-a-settings__topbar-right">
          {saved && (
            <span className="tf-a-settings__flash tf-a-settings__flash--ok">
              ✓ {t('settings.saved')}
            </span>
          )}
          {error && <span className="tf-a-settings__flash tf-a-settings__flash--err">{error}</span>}
          <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={save}>
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
              <div className="tf-a-settings__section-title">
                {t('settings.sectionLocalization')}
              </div>
              <div className="tf-a-settings__section-sub">
                {t('settings.sectionLocalizationSub')}
              </div>
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
                    setRestaurant({
                      ...restaurant,
                      defaultLanguage: e.target.value as LanguageCode,
                    })
                  }
                >
                  {LANGS.map((l) => (
                    <option key={l} value={l}>
                      {LANG_LABELS[l]}
                    </option>
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
            <label className="tf-a-settings__field">
              <span className="tf-a-settings__field-label">
                {t('settings.paymentPoint', { defaultValue: 'Payment point' })}
              </span>
              <select
                value={restaurant.paymentPoint}
                onChange={(e) =>
                  setRestaurant({ ...restaurant, paymentPoint: e.target.value as PaymentPoint })
                }
              >
                <option value="table">
                  {t('settings.paymentPointTable', {
                    defaultValue: 'At the table (waiter collects)',
                  })}
                </option>
                <option value="counter">
                  {t('settings.paymentPointCounter', {
                    defaultValue: 'At a counter (cashier collects)',
                  })}
                </option>
              </select>
            </label>
          </div>
        </section>

        {/* ── Ordering access ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconShield />
            </span>
            <div>
              <div className="tf-a-settings__section-title">
                {t('settings.orderingAccess.section')}
              </div>
              <div className="tf-a-settings__section-sub">
                {t('settings.orderingAccess.sectionSub')}
              </div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <label className="tf-a-settings__field">
              <span className="tf-a-settings__field-label">
                {t('settings.orderingAccess.mode')}
              </span>
              <select
                value={restaurant.orderGateMode}
                onChange={(e) =>
                  setRestaurant({ ...restaurant, orderGateMode: e.target.value as OrderGateMode })
                }
              >
                {(['off', 'wifi', 'code', 'wifi_or_code'] as OrderGateMode[]).map((m) => (
                  <option key={m} value={m}>
                    {t(`settings.orderingAccess.modes.${m}`)}
                  </option>
                ))}
              </select>
            </label>
            <p className="tf-a-settings__note">
              {t(`settings.orderingAccess.hint.${restaurant.orderGateMode}`)}
            </p>
            {(restaurant.orderGateMode === 'wifi' || restaurant.orderGateMode === 'wifi_or_code') && (
              <div className="tf-a-settings__networks-section">
                <span className="tf-a-settings__field-label">
                  {t('settings.orderingAccess.networks')}
                </span>
                <div className="tf-a-settings__networks">
                  {restaurant.allowedNetworks.map((net) => (
                    <div key={net} className="tf-a-settings__network-row">
                      <span className="tf-a-settings__network-addr">{net}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeNetwork(net)}
                        aria-label={t('common.remove')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="tf-a-settings__network-add">
                  <input
                    type="text"
                    className="tf-a-settings__network-input"
                    placeholder={t('settings.orderingAccess.networkPlaceholder')}
                    value={newNetwork}
                    onChange={(e) => setNewNetwork(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNetwork()}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={addNetwork}
                    disabled={!newNetwork.trim()}
                  >
                    {t('settings.orderingAccess.addNetwork')}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={detectAndAddIp}
                  disabled={detecting}
                >
                  {detecting
                    ? t('settings.orderingAccess.detecting')
                    : t('settings.orderingAccess.detectIp')}
                </button>
                {detectedIp && (
                  <p className="tf-a-settings__note">
                    {t('settings.orderingAccess.detected', { ip: detectedIp })}
                  </p>
                )}
              </div>
            )}
            <label className="tf-a-settings__field" style={{ maxWidth: 220 }}>
              <span className="tf-a-settings__field-label">
                {t('settings.orderCeiling', { defaultValue: 'Max active orders per table' })}
              </span>
              <div className="tf-a-settings__field-addon">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={restaurant.orderCeiling}
                  onChange={(e) =>
                    setRestaurant({
                      ...restaurant,
                      orderCeiling: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                    })
                  }
                />
                <span className="tf-a-settings__addon-unit">
                  {t('settings.orderCeilingUnit', { defaultValue: 'orders' })}
                </span>
              </div>
              <p className="tf-a-settings__note" style={{ marginTop: 4 }}>
                {t('settings.orderCeilingHint', {
                  defaultValue:
                    'How many un-served orders can stack up at one table before customers are asked to call the waiter. The waiter can override this temporarily.',
                })}
              </p>
            </label>
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

        {/* ── Danger zone ── */}
        <section className="tf-a-settings__section tf-a-settings__section--danger">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon tf-a-settings__section-icon--danger">⚠</span>
            <div>
              <div className="tf-a-settings__section-title tf-a-settings__section-title--danger">
                {t('settings.dangerZone.title')}
              </div>
              <div className="tf-a-settings__section-sub">
                {t('settings.dangerZone.sub')}
              </div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <button type="button" className="btn btn-danger" onClick={openResetModal}>
              {t('settings.dangerZone.resetButton')}
            </button>
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
              <div className="tf-a-settings__section-sub">
                {t('settings.logoutHint', { defaultValue: 'End this session on this device.' })}
              </div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={logout}
            >
              <IconLogout />
              {t('nav.logout')}
            </button>
          </div>
        </section>
      </div>

      {resetModalOpen && (
        <div className="modal-backdrop" onClick={closeResetModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2 style={{ color: 'var(--danger)' }}>{t('settings.dangerZone.modalTitle')}</h2>
              <button type="button" className="close btn-ghost" onClick={closeResetModal}>×</button>
            </header>
            <div className="body">
              <p style={{ margin: 0 }}>{t('settings.dangerZone.modalBody')}</p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--fg-soft)' }}>
                  {t('settings.dangerZone.modalKeywordHint', { keyword: RESET_KEYWORD })}
                </span>
                <input
                  ref={resetInputRef}
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doReset()}
                  placeholder={RESET_KEYWORD}
                  autoComplete="off"
                  spellCheck={false}
                  style={{ fontFamily: 'monospace' }}
                />
              </label>
              {resetError && (
                <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.85rem' }}>
                  {resetError}
                </p>
              )}
            </div>
            <footer>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeResetModal}
                disabled={resetBusy}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={doReset}
                disabled={resetConfirmText !== RESET_KEYWORD || resetBusy}
              >
                {resetBusy
                  ? t('settings.dangerZone.resetting')
                  : t('settings.dangerZone.confirmButton')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
