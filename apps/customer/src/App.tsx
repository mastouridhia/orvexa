import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { ErrorBoundary, setDocumentLocale } from '@orvexa/ui';
import { Header } from './components/Header.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import { WaiterCallBanner } from './components/WaiterCallBanner.js';
// Initial QR-flow pages stay synchronous — they must render before any JS chunk fetch
import { Welcome } from './pages/Welcome.js';
import { SessionBoot } from './pages/SessionBoot.js';
import { ScanLanguage } from './pages/ScanLanguage.js';
// Heavy pages are code-split so the initial bundle stays small
const Menu = lazy(() => import('./pages/Menu.js').then((m) => ({ default: m.Menu })));
const OrderPage = lazy(() => import('./pages/Order.js').then((m) => ({ default: m.OrderPage })));
const RoundPage = lazy(() => import('./pages/Round.js').then((m) => ({ default: m.RoundPage })));
const BillPage = lazy(() => import('./pages/Bill.js').then((m) => ({ default: m.BillPage })));
const WaiterPage = lazy(() => import('./pages/Waiter.js').then((m) => ({ default: m.WaiterPage })));
const History = lazy(() => import('./pages/History.js').then((m) => ({ default: m.History })));
import { useSessionStore } from './store/session.js';
import { connectCustomerSocket, disconnectCustomerSocket } from './socket/client.js';
import { isPlan1 } from './utils/plan.js';
import { useCartSync } from './hooks/useCartSync.js';
import { useSessionRenewal } from './hooks/useSessionRenewal.js';
import './App.css';

function PageLoader() {
  return (
    <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 80, borderRadius: 14 }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function Layout() {
  useCartSync();
  useSessionRenewal();
  return (
    <div className="app-shell">
      <Header />
      <OfflineBanner />
      {!isPlan1 && <WaiterCallBanner />}
      <main className="main">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const token = useSessionStore((s) => s.token);

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

  useEffect(() => {
    if (token) {
      connectCustomerSocket(token);
      return () => {
        disconnectCustomerSocket();
      };
    }
    return undefined;
  }, [token]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/t/:token" element={<ScanLanguage />} />
        <Route path="/t/:token/open" element={<SessionBoot />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/orders/round" element={isPlan1 ? <Navigate to="/menu" replace /> : <RoundPage />} />
        <Route path="/orders/:id" element={isPlan1 ? <Navigate to="/menu" replace /> : <OrderPage />} />
        <Route path="/waiter" element={isPlan1 ? <Navigate to="/menu" replace /> : <WaiterPage />} />
        <Route path="/bill" element={isPlan1 ? <Navigate to="/menu" replace /> : <BillPage />} />
        <Route path="/history" element={isPlan1 ? <Navigate to="/menu" replace /> : <History />} />
        <Route path="*" element={<Welcome />} />
      </Route>
    </Routes>
  );
}
