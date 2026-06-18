import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale, ErrorBoundary } from '@orvexa/ui';
// Login stays synchronous — must render immediately before auth check
import { Login } from './pages/Login.js';
import { Setup } from './pages/Setup.js';
import { Onboarding } from './pages/Onboarding.js';
import { PlatformAdmin } from './pages/PlatformAdmin.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { ResetPassword } from './pages/ResetPassword.js';
import { Terms, Privacy } from './pages/Legal.js';
import { AppShell } from './components/AppShell.js';
import { Guarded } from './components/Upsell.js';
import { useAuthStore } from './store/auth.js';
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
  const { pathname } = useLocation();

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

  // Platform admin has its own key-based auth and is independent of staff login —
  // it must be reachable whether or not a restaurant account is signed in.
  if (pathname === '/platform') return <PlatformAdmin />;

  // Legal documents — always public, reachable whether or not signed in.
  if (pathname === '/terms') return <Terms />;
  if (pathname === '/privacy') return <Privacy />;

  // Public routes — accessible without auth
  if (!accessToken) {
    if (pathname === '/setup') return <Setup />;
    if (pathname === '/forgot-password') return <ForgotPassword />;
    if (pathname === '/reset-password') return <ResetPassword />;
    return <Login />;
  }

  // Onboarding wizard — authenticated but outside AppShell
  if (pathname === '/onboarding') return <Onboarding />;

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

  // Single route set for every plan. Tier-1 features (dashboard/menu/tables/settings)
  // are always available; higher-tier routes render an upsell when the plan is too low.
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<MenuEditor />} />
            <Route path="/tables" element={<TablesManager />} />
            <Route
              path="/staff"
              element={
                <Guarded cap="staff.basic" featureKey="staff">
                  <StaffManager />
                </Guarded>
              }
            />
            <Route
              path="/orders"
              element={
                <Guarded cap="ordering.inbox" featureKey="orders">
                  <OrdersExplorer />
                </Guarded>
              }
            />
            <Route
              path="/open-bills"
              element={
                <Guarded cap="bills.split" featureKey="openBills">
                  <OpenBills />
                </Guarded>
              }
            />
            <Route
              path="/reports"
              element={
                <Guarded cap="analytics.sales_basic" featureKey="reports">
                  <Reports />
                </Guarded>
              }
            />
            <Route
              path="/feedback"
              element={
                <Guarded cap="feedback" featureKey="feedback">
                  <FeedbackPage />
                </Guarded>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
