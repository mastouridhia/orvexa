import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session.js';
import { IconSettings } from './tf-icons.js';
import { SettingsSheet } from './SettingsSheet.js';

export function Header() {
  const { t } = useTranslation();
  const session = useSessionStore((s) => s.session);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isLanding = useLocation().pathname === '/';

  return (
    <header className="tf-app-header" role="banner">
      {session?.tableId ? (
        <div
          className="tf-table-chip"
          aria-label={t('header.table', { label: session.tableLabel })}
        >
          <div className="tf-table-chip__num">
            <span className="tf-table-chip__label">{t('header.tableShort')}</span>
            <span className="tf-table-chip__value">{session.tableLabel}</span>
          </div>
          <div className="tf-table-chip__status">
            <span className="tf-table-chip__dot" />
            <span className="tf-table-chip__open">{t('header.open')}</span>
          </div>
        </div>
      ) : (
        <span className="tf-display" style={{ fontSize: 22, color: 'var(--fg)' }}>
          Orvexa
        </span>
      )}
      {!isLanding ? (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('header.settings')}
          title={t('header.settings')}
          style={{ padding: '0.4rem', display: 'inline-flex', alignItems: 'center' }}
        >
          <IconSettings size={20} />
        </button>
      ) : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
    </header>
  );
}
