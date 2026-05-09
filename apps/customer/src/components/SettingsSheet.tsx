import { useTranslation } from 'react-i18next';
import { LanguageSelector, useEscapeKey, useFocusTrap } from '@orvexa/ui';
import { useSessionStore } from '../store/session.js';

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const setLocale = useSessionStore((s) => s.setLocale);
  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  return (
    <>
      <div className="tf-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="tf-settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="tf-cartsheet__grabber" aria-hidden="true">
          <span />
        </div>
        <header className="tf-settings-sheet__head">
          <h2 id="settings-title" className="tf-settings-sheet__title">
            <span className="tf-display">{t('settings.title')}</span>
          </h2>
          <button
            type="button"
            className="tf-cartsheet__close"
            aria-label={t('cart.back')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="tf-settings-sheet__body">
          <section className="tf-settings-card">
            <div className="tf-settings-card__head">
              <h3 className="tf-settings-card__title">{t('settings.language')}</h3>
              <p className="tf-settings-card__sub">{t('settings.languageHint')}</p>
            </div>
            <LanguageSelector onChange={setLocale} />
          </section>

          {session ? (
            <section className="tf-settings-card">
              <div className="tf-settings-card__head">
                <h3 className="tf-settings-card__title">{t('settings.table')}</h3>
              </div>
              <dl className="tf-settings-meta">
                <div className="tf-settings-meta__row">
                  <dt>{t('header.tableShort')}</dt>
                  <dd className="tf-mono">{session.tableLabel}</dd>
                </div>
                {restaurant ? (
                  <div className="tf-settings-meta__row">
                    <dt>{t('settings.restaurant')}</dt>
                    <dd>{restaurant.name}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
