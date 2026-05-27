import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale, ErrorBoundary } from '@orvexa/ui';
import { Login } from './pages/Login.js';
import { useAuthStore } from './store/auth.js';
const Board = lazy(() => import('./pages/Board.js').then((m) => ({ default: m.Board })));
const Wall = lazy(() => import('./pages/Wall.js').then((m) => ({ default: m.Wall })));
import './App.css';

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        opacity: 0.4,
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  );
}

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
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {pathname.startsWith('/wall') ? <Wall /> : <Board />}
      </Suspense>
    </ErrorBoundary>
  );
}
