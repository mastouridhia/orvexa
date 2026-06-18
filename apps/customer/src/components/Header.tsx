import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session.js';
import { useMenuOnly } from '../utils/plan.js';
import { IconBell, IconInfo, IconSettings } from './tf-icons.js';
import { SettingsSheet } from './SettingsSheet.js';
import { ExtrasSheet } from './ExtrasSheet.js';
import { RestaurantInfoSheet, hasRestaurantInfo } from './RestaurantInfoCard.js';

export function Header() {
  const { t } = useTranslation();
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const menuOnly = useMenuOnly();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const pathname = useLocation().pathname;
  const isLanding = pathname === '/';
  const isMenu = pathname === '/menu';

  const showInfo = isMenu && restaurant && hasRestaurantInfo(restaurant);
  const showExtras = isMenu && !menuOnly;

  return (
    <header className="tf-app-header" role="banner">
      {session?.tableId ? (
        <div className="tf-header-id">
          <span
            className="tf-table-badge"
            aria-label={session.tableLabel}
          >
            {session.tableLabel}
          </span>
          <span className="tf-status-pill">
            <span className="tf-status-dot" />
            {t('header.open')}
          </span>
        </div>
      ) : (
        <span className="tf-display" style={{ fontSize: 22, color: 'var(--fg)' }}>
          Orvexa
        </span>
      )}
      {!isLanding ? (
        <div className="tf-header-actions">
          {showInfo ? (
            <button
              type="button"
              className="btn btn-ghost tf-header-action"
              onClick={() => setInfoOpen(true)}
              aria-label={t('info.title')}
              title={t('info.title')}
            >
              <IconInfo size={20} />
            </button>
          ) : null}
          {showExtras ? (
            <button
              type="button"
              className="btn btn-ghost tf-header-action"
              onClick={() => setExtrasOpen(true)}
              aria-label={t('extras.openCta')}
              title={t('extras.openCta')}
            >
              <IconBell size={20} />
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost tf-header-action"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('header.settings')}
            title={t('header.settings')}
          >
            <IconSettings size={20} />
          </button>
        </div>
      ) : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
      {extrasOpen ? <ExtrasSheet onClose={() => setExtrasOpen(false)} /> : null}
      {infoOpen && restaurant ? (
        <RestaurantInfoSheet restaurant={restaurant} onClose={() => setInfoOpen(false)} />
      ) : null}
    </header>
  );
}
