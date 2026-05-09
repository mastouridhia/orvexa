import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale } from '@orvexa/ui';
import { Login } from './pages/Login.js';
import { Board } from './pages/Board.js';
import { Wall } from './pages/Wall.js';
import { useAuthStore } from './store/auth.js';
import './App.css';

function usePathname(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export default function App() {
  const { i18n } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const pathname = usePathname();

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

  if (!accessToken) return <Login />;
  if (pathname.startsWith('/wall')) return <Wall />;
  return <Board />;
}
