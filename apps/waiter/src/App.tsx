import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale } from '@orvexa/ui';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { LanguagePicker } from './pages/LanguagePicker.js';
import { useAuthStore } from './store/auth.js';
import './App.css';

const LANG_KEY = 'orvexa.waiter.lang';

export default function App() {
  const { i18n } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);

  // Show the language picker only if no language has been explicitly chosen yet.
  const [langPicked, setLangPicked] = useState(() => !!localStorage.getItem(LANG_KEY));

  useEffect(() => {
    const apply = () => {
      const lng = (i18n.resolvedLanguage as LanguageCode | undefined) ?? 'fr';
      setDocumentLocale(lng);
    };
    apply();
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, [i18n]);

  if (!langPicked) return <LanguagePicker onConfirm={() => setLangPicked(true)} />;
  if (!accessToken) return <Login />;
  return <Dashboard />;
}
