import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale, ErrorBoundary } from '@orvexa/ui';
import { Login } from './pages/Login.js';
import { useAuthStore } from './store/auth.js';
import { useCan } from './utils/plan.js';
const Board = lazy(() => import('./pages/Board.js').then((m) => ({ default: m.Board })));
const Wall = lazy(() => import('./pages/Wall.js').then((m) => ({ default: m.Wall })));
import './App.css';

function PlanUnavailable({ onLogout }: { onLogout?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 12,
        opacity: 0.7,
        fontFamily: 'sans-serif',
        fontSize: 15,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <div style={{ fontSize: 36 }}>🍽️</div>
      <div style={{ fontWeight: 600 }}>Kitchen display not active</div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>Upgrade to Orvexa Pro to enable the kitchen screen.</div>
      {onLogout ? (
        <button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onLogout}>
          {t('header.logout')}
        </button>
      ) : null}
    </div>
  );
}

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
  const logout = useAuthStore((s) => s.logout);
  const canKds = useCan()('kitchen.kds');
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

  // Login first so staff can always authenticate; only gate on plan once we
  // know who they are (a stale/wrong-plan token still gets a way out via logout).
  if (!accessToken) return <Login />;
  if (!canKds) return <PlanUnavailable onLogout={logout} />;
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {pathname.startsWith('/wall') ? <Wall /> : <Board />}
      </Suspense>
    </ErrorBoundary>
  );
}
