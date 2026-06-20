import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DayHours, LanguageCode, PaymentPoint, Restaurant, Weekday } from '@orvexa/shared';
import { WEEKDAYS, PLAN_NAMES, PLAN_PRICING, normalizePlan } from '@orvexa/shared';
import { LanguageSelector } from '@orvexa/ui';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { useCan, usePlan } from '../utils/plan.js';
import {
  IconAlertTriangle,
  IconBolt,
  IconClock,
  IconGlobe,
  IconHome,
  IconLock,
  IconLogout,
  IconMap,
  IconMonitor,
  IconQr,
  IconReceipt,
  IconShield,
  IconUser,
} from '../components/tf-icons.js';
import type { OrderGateMode } from '@orvexa/shared';
import { ShareableMenu } from '../components/ShareableMenu.js';

const LANGS: LanguageCode[] = ['fr', 'ar', 'en'];
const LANG_LABELS: Record<LanguageCode, string> = { fr: 'Français', ar: 'العربية', en: 'English' };
const LANG_FLAGS: Record<LanguageCode, string> = { fr: '🇫🇷', ar: '🇸🇦', en: '🇬🇧' };

export function Settings() {
  const menuOnly = !useCan()('ordering.customer');
  const plan = normalizePlan(usePlan());
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [activeTab, setActiveTab] = useState('subscription');

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetInputRef = useRef<HTMLInputElement>(null);

  const [newNetwork, setNewNetwork] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);

  const [profileName, setProfileName] = useState(currentUser?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email ?? '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const RESET_KEYWORD = t('settings.dangerZone.confirmKeyword');

  const tabs = [
    { id: 'subscription', label: t('settings.groups.subscription') },
    { id: 'establishment', label: t('settings.groups.establishment') },
    ...(!menuOnly ? [{ id: 'operations', label: t('settings.groups.operations') }] : []),
    { id: 'interface', label: t('settings.groups.interface') },
    { id: 'account', label: t('settings.groups.account') },
    ...(!menuOnly ? [{ id: 'danger', label: t('settings.groups.danger') }] : []),
  ];

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
          defaultPrepMinutes: restaurant.defaultPrepMinutes,
          timezone: restaurant.timezone,
          paymentPoint: restaurant.paymentPoint,
          orderGateMode: restaurant.orderGateMode,
          allowedNetworks: restaurant.allowedNetworks,
          orderCeiling: restaurant.orderCeiling,
          perTableQr: restaurant.perTableQr,
          dailyReportEnabled: restaurant.dailyReportEnabled,
          reportEmail: restaurant.reportEmail,
          address: restaurant.address,
          mapUrl: restaurant.mapUrl,
          phone: restaurant.phone,
          instagramUrl: restaurant.instagramUrl,
          facebookUrl: restaurant.facebookUrl,
          tiktokUrl: restaurant.tiktokUrl,
          wifiSsid: restaurant.wifiSsid,
          wifiPassword: restaurant.wifiPassword,
          openingHours: restaurant.openingHours,
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

  const saveProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();
    if (!name || !email) return;
    setProfileBusy(true);
    setProfileError(null);
    try {
      const updated = await authedFetch((tk) => api.updateProfile(tk, { name, email }));
      updateUser({ name: updated.name, email: updated.email });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || newPassword.length < 8 || newPassword !== confirmPassword) return;
    setPwBusy(true);
    setPwError(null);
    try {
      await authedFetch((tk) => api.changePassword(tk, currentPassword, newPassword));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  const setDay = (day: Weekday, value: DayHours | null) => {
    if (!restaurant) return;
    setRestaurant({
      ...restaurant,
      openingHours: { ...(restaurant.openingHours ?? {}), [day]: value },
    });
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

      <div className="tf-a-settings__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tf-a-settings__tab${activeTab === tab.id ? ' is-active' : ''}${
              tab.id === 'danger' ? ' tf-a-settings__tab--danger' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tf-a-settings">
        {/* ───────────────── Subscription ───────────────── */}
        {activeTab === 'subscription' && (
        <div className="tf-a-settings__group">

        {/* ── Plan / subscription ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconBolt />
            </span>
            <div>
              <div className="tf-a-settings__section-title">
                {t('settings.plan.title', { defaultValue: 'Your plan' })}
              </div>
              <div className="tf-a-settings__section-sub">
                {t('settings.plan.sub', {
                  defaultValue: 'The Orvexa subscription tier active on this restaurant.',
                })}
              </div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <div className="tf-a-settings__plan">
              <span className={`tf-a-settings__plan-badge tf-a-settings__plan-badge--tier${plan}`}>
                {PLAN_NAMES[plan]}
              </span>
              <span className="tf-a-settings__plan-price">
                {t('settings.plan.price', {
                  defaultValue: '{{price}} TND / month',
                  price: PLAN_PRICING[plan].monthly,
                })}
              </span>
            </div>
          </div>
        </section>
        </div>
        )}

        {/* ───────────────── Establishment ───────────────── */}
        {activeTab === 'establishment' && (
        <div className="tf-a-settings__group">

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

        {/* ── Business info (menu.info — all tiers) ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconMap />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.sectionInfo')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.sectionInfoSub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <div className="tf-a-settings__subhead">{t('settings.info.contactHead')}</div>
            <label className="tf-a-settings__field">
              <span className="tf-a-settings__field-label">{t('settings.info.address')}</span>
              <input
                type="text"
                value={restaurant.address ?? ''}
                onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
              />
            </label>
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.mapUrl')}</span>
                <input
                  type="text"
                  inputMode="url"
                  placeholder="https://maps.google.com/…"
                  value={restaurant.mapUrl ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, mapUrl: e.target.value })}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.phone')}</span>
                <input
                  type="tel"
                  value={restaurant.phone ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                />
              </label>
            </div>

            <div className="tf-a-settings__subhead">{t('settings.info.socialsHead')}</div>
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.instagram')}</span>
                <input
                  type="text"
                  value={restaurant.instagramUrl ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, instagramUrl: e.target.value })}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.facebook')}</span>
                <input
                  type="text"
                  value={restaurant.facebookUrl ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, facebookUrl: e.target.value })}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.tiktok')}</span>
                <input
                  type="text"
                  value={restaurant.tiktokUrl ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, tiktokUrl: e.target.value })}
                />
              </label>
            </div>

            <div className="tf-a-settings__subhead">{t('settings.info.wifiHead')}</div>
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.wifiSsid')}</span>
                <input
                  type="text"
                  value={restaurant.wifiSsid ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, wifiSsid: e.target.value })}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.info.wifiPassword')}</span>
                <input
                  type="text"
                  value={restaurant.wifiPassword ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, wifiPassword: e.target.value })}
                />
              </label>
            </div>

            <div className="tf-a-settings__subhead">{t('settings.info.hoursHead')}</div>
            <div className="tf-a-settings__hours">
              {WEEKDAYS.map((day) => {
                const dh = restaurant.openingHours?.[day] ?? null;
                const isOpen = dh != null;
                return (
                  <div className="tf-a-settings__hours-row" key={day}>
                    <span className="tf-a-settings__hours-day">{t(`settings.info.days.${day}`)}</span>
                    <label className="tf-a-settings__hours-toggle">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={(e) =>
                          setDay(day, e.target.checked ? (dh ?? { open: '08:00', close: '23:00' }) : null)
                        }
                      />
                      <span>{t('settings.info.open')}</span>
                    </label>
                    {isOpen ? (
                      <>
                        <input
                          type="time"
                          value={dh.open}
                          onChange={(e) => setDay(day, { open: e.target.value, close: dh.close })}
                        />
                        <span className="tf-a-settings__hours-dash">–</span>
                        <input
                          type="time"
                          value={dh.close}
                          onChange={(e) => setDay(day, { open: dh.open, close: e.target.value })}
                        />
                      </>
                    ) : (
                      <span className="tf-a-settings__hours-closed">{t('settings.info.closed')}</span>
                    )}
                  </div>
                );
              })}
            </div>
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

        {/* ── QR codes ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconQr />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.sectionQr')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.sectionQrSub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <label className="tf-a-settings__field" style={{ flex: 1 }}>
              <span className="tf-a-settings__field-label">{t('settings.qrMode')}</span>
              <select
                value={restaurant.perTableQr ? 'perTable' : 'single'}
                onChange={(e) =>
                  setRestaurant({ ...restaurant, perTableQr: e.target.value === 'perTable' })
                }
              >
                <option value="perTable">{t('settings.qrModePerTable')}</option>
                <option value="single">{t('settings.qrModeSingle')}</option>
              </select>
            </label>
          </div>
        </section>

        {/* ── Shareable public menu ── */}
        <ShareableMenu />
        </div>
        )}

        {/* ───────────────── Operations ───────────────── */}
        {activeTab === 'operations' && (
        <div className="tf-a-settings__group">

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

        {/* ── Kitchen / prep time ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconClock />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.sectionKitchen')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.sectionKitchenSub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <label className="tf-a-settings__field" style={{ maxWidth: 220 }}>
              <span className="tf-a-settings__field-label">{t('settings.defaultPrepMinutes')}</span>
              <div className="tf-a-settings__field-addon">
                <input
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={restaurant.defaultPrepMinutes}
                  onChange={(e) =>
                    setRestaurant({
                      ...restaurant,
                      defaultPrepMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 1)),
                    })
                  }
                />
                <span className="tf-a-settings__addon-unit">
                  {t('settings.defaultPrepMinutesUnit', { defaultValue: 'min' })}
                </span>
              </div>
              <p className="tf-a-settings__note" style={{ marginTop: 4 }}>
                {t('settings.defaultPrepMinutesHint')}
              </p>
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

        {/* ── Daily email report (Plus+) ── */}
        {plan >= 2 && (
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconReceipt />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.dailyReport.title')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.dailyReport.sub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <label className="tf-a-settings__hours-toggle">
              <input
                type="checkbox"
                checked={restaurant.dailyReportEnabled}
                onChange={(e) =>
                  setRestaurant({
                    ...restaurant,
                    dailyReportEnabled: e.target.checked,
                    // Prefill the recipient with the signed-in user's email on first enable.
                    reportEmail:
                      e.target.checked && !restaurant.reportEmail
                        ? (currentUser?.email ?? '')
                        : restaurant.reportEmail,
                  })
                }
              />
              <span>{t('settings.dailyReport.enable')}</span>
            </label>
            {restaurant.dailyReportEnabled && (
              <label className="tf-a-settings__field" style={{ marginTop: 12, maxWidth: 360 }}>
                <span className="tf-a-settings__field-label">
                  {t('settings.dailyReport.recipient')}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={currentUser?.email ?? 'nom@exemple.tn'}
                  value={restaurant.reportEmail ?? ''}
                  onChange={(e) => setRestaurant({ ...restaurant, reportEmail: e.target.value })}
                />
                <p className="tf-a-settings__note" style={{ marginTop: 4 }}>
                  {t('settings.dailyReport.hint')}
                </p>
              </label>
            )}
          </div>
        </section>
        )}
        </div>
        )}

        {/* ───────────────── Interface ───────────────── */}
        {activeTab === 'interface' && (
        <div className="tf-a-settings__group">

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
        </div>
        )}

        {/* ───────────────── Account ───────────────── */}
        {activeTab === 'account' && (
        <div className="tf-a-settings__group">

        {/* ── Mon compte ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconUser />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.account.title')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.account.sub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.account.name')}</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.account.email')}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
              </label>
            </div>
            {profileError && <div className="error-banner" style={{ marginBottom: 0 }}>{profileError}</div>}
            <div className="tf-a-settings__actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={profileBusy || !profileName.trim() || !profileEmail.trim()}
                onClick={saveProfile}
              >
                {profileBusy ? t('settings.account.saving') : t('settings.account.save')}
              </button>
              {profileSaved && (
                <span className="tf-a-settings__flash tf-a-settings__flash--ok">
                  ✓ {t('settings.account.saved')}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Security ── */}
        <section className="tf-a-settings__section">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon">
              <IconLock />
            </span>
            <div>
              <div className="tf-a-settings__section-title">{t('settings.security.title')}</div>
              <div className="tf-a-settings__section-sub">{t('settings.security.sub')}</div>
            </div>
          </div>
          <div className="tf-a-settings__section-body">
            <label className="tf-a-settings__field">
              <span className="tf-a-settings__field-label">{t('settings.security.current')}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <div className="tf-a-settings__row">
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">
                  {t('settings.security.new')}{' '}
                  <span className="tf-a-settings__field-hint">{t('settings.security.newHint')}</span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <label className="tf-a-settings__field" style={{ flex: 1 }}>
                <span className="tf-a-settings__field-label">{t('settings.security.confirm')}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <span className="tf-a-settings__field-error">
                    {t('settings.security.mismatch')}
                  </span>
                )}
              </label>
            </div>
            {pwError && <div className="error-banner" style={{ marginBottom: 0 }}>{pwError}</div>}
            <div className="tf-a-settings__actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={
                  pwBusy ||
                  !currentPassword ||
                  newPassword.length < 8 ||
                  newPassword !== confirmPassword
                }
                onClick={changePassword}
              >
                {pwBusy ? t('settings.security.saving') : t('settings.security.save')}
              </button>
              {pwSaved && (
                <span className="tf-a-settings__flash tf-a-settings__flash--ok">
                  ✓ {t('settings.security.saved')}
                </span>
              )}
            </div>
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
        )}

        {/* ───────────────── Danger zone ───────────────── */}
        {activeTab === 'danger' && (
        <div className="tf-a-settings__group">

        <section className="tf-a-settings__section tf-a-settings__section--danger">
          <div className="tf-a-settings__section-head">
            <span className="tf-a-settings__section-icon tf-a-settings__section-icon--danger">
              <IconAlertTriangle />
            </span>
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
        </div>
        )}
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
