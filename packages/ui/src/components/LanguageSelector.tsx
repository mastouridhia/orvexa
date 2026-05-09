import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale } from '../i18n/document-locale.js';

const LANGS: LanguageCode[] = ['fr', 'ar', 'en'];

export type LanguageSelectorProps = {
  onChange?: (lang: LanguageCode) => void;
};

export function LanguageSelector({ onChange }: LanguageSelectorProps = {}) {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage as LanguageCode | undefined;

  const change = (lang: LanguageCode): void => {
    void i18n.changeLanguage(lang);
    setDocumentLocale(lang);
    onChange?.(lang);
  };

  return (
    <div className="lang-selector" role="group" aria-label="Language">
      {LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          aria-pressed={current === lang}
          onClick={() => change(lang)}
        >
          {t(`lang.${lang}`)}
        </button>
      ))}
    </div>
  );
}
