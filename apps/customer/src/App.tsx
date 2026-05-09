import { useEffect } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { ErrorBoundary, setDocumentLocale } from '@orvexa/ui';
import { Header } from './components/Header.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import { WaiterCallBanner } from './components/WaiterCallBanner.js';
import { Welcome } from './pages/Welcome.js';
import { SessionBoot } from './pages/SessionBoot.js';
import { ScanLanguage } from './pages/ScanLanguage.js';
import { Menu } from './pages/Menu.js';
import { OrderPage } from './pages/Order.js';
import { History } from './pages/History.js';
import { WaiterPage } from './pages/Waiter.js';
import { BillPage } from './pages/Bill.js';
import { useSessionStore } from './store/session.js';
import { connectCustomerSocket, disconnectCustomerSocket } from './socket/client.js';
import { useCartSync } from './hooks/useCartSync.js';
import './App.css';

function Layout() {
  useCartSync();
  return (
    <div className="app-shell">
      <Header />
      <OfflineBanner />
      <WaiterCallBanner />
      <main className="main">
        <ErrorBoundary>
          <Outlet />
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
        <Route path="/orders/:id" element={<OrderPage />} />
        <Route path="/waiter" element={<WaiterPage />} />
        <Route path="/bill" element={<BillPage />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Welcome />} />
      </Route>
    </Routes>
  );
}
