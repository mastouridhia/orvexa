import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale } from '@orvexa/ui';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { MenuEditor } from './pages/MenuEditor.js';
import { TablesManager } from './pages/TablesManager.js';
import { StaffManager } from './pages/StaffManager.js';
import { OrdersExplorer } from './pages/OrdersExplorer.js';
import { OpenBills } from './pages/OpenBills.js';
import { Reports } from './pages/Reports.js';
import { FeedbackPage } from './pages/FeedbackPage.js';
import { Settings } from './pages/Settings.js';
import { AppShell } from './components/AppShell.js';
import { useAuthStore } from './store/auth.js';
import './App.css';

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
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/open-bills" element={<OpenBills />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/open-bills" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
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
  );
}
