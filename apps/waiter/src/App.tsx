import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale, ErrorBoundary } from '@orvexa/ui';
import { Login } from './pages/Login.js';
import { useAuthStore } from './store/auth.js';
import { isPlan1 } from './utils/plan.js';

function PlanUnavailable() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 12,
        opacity: 0.5,
        fontFamily: 'sans-serif',
        fontSize: 15,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <div style={{ fontSize: 36 }}>🛎️</div>
      <div style={{ fontWeight: 600 }}>Waiter app not active</div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>Upgrade to Orvexa Plus or higher to enable staff ordering.</div>
    </div>
  );
}
const Dashboard = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
);
const LanguagePicker = lazy(() =>
  import('./pages/LanguagePicker.js').then((m) => ({ default: m.LanguagePicker })),
);
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

  if (isPlan1) return <PlanUnavailable />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {!langPicked ? (
          <LanguagePicker onConfirm={() => setLangPicked(true)} />
        ) : !accessToken ? (
          <Login />
        ) : (
          <Dashboard />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
