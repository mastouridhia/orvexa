import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale, ErrorBoundary } from '@orvexa/ui';
// Login stays synchronous — must render immediately before auth check
import { Login } from './pages/Login.js';
import { AppShell } from './components/AppShell.js';
import { useAuthStore } from './store/auth.js';
import { isPlan1 } from './utils/plan.js';
// All authenticated pages are code-split — they load only after login
const Dashboard = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
);
const MenuEditor = lazy(() =>
  import('./pages/MenuEditor.js').then((m) => ({ default: m.MenuEditor })),
);
const TablesManager = lazy(() =>
  import('./pages/TablesManager.js').then((m) => ({ default: m.TablesManager })),
);
const StaffManager = lazy(() =>
  import('./pages/StaffManager.js').then((m) => ({ default: m.StaffManager })),
);
const OrdersExplorer = lazy(() =>
  import('./pages/OrdersExplorer.js').then((m) => ({ default: m.OrdersExplorer })),
);
const OpenBills = lazy(() =>
  import('./pages/OpenBills.js').then((m) => ({ default: m.OpenBills })),
);
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })));
const FeedbackPage = lazy(() =>
  import('./pages/FeedbackPage.js').then((m) => ({ default: m.FeedbackPage })),
);
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })));
import './App.css';

function PageLoader() {
  return (
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 60, borderRadius: 10 }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);

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

  // Cashiers get a stripped-down app: only open bills + settings, with /open-bills as home.
  if (role === 'cashier') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/open-bills" element={<OpenBills />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/open-bills" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (isPlan1) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/menu" element={<MenuEditor />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<MenuEditor />} />
            <Route path="/tables" element={<TablesManager />} />
            <Route path="/staff" element={<StaffManager />} />
            <Route path="/orders" element={<OrdersExplorer />} />
            <Route path="/open-bills" element={<OpenBills />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
