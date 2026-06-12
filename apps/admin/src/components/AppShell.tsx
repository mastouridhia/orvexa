import { useState, type ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.js';
import type { StaffRole } from '@orvexa/shared';
import { isPlan1 } from '../utils/plan.js';
import {
  IconBolt,
  IconLeaf,
  IconMap,
  IconReceipt,
  IconSettings,
  IconTable,
  IconUser,
  IconUtensils,
} from './tf-icons.js';

type IconCmp = ComponentType<{ size?: number }>;

const NAV: { to: string; key: string; icon: IconCmp; roles?: StaffRole[] }[] = [
  { to: '/', key: 'dashboard', icon: IconBolt },
  { to: '/menu', key: 'menu', icon: IconUtensils },
  { to: '/orders', key: 'orders', icon: IconReceipt },
  {
    to: '/open-bills',
    key: 'openBills',
    icon: IconReceipt,
    roles: ['admin', 'manager', 'cashier'],
  },
  { to: '/tables', key: 'tables', icon: IconTable },
  { to: '/staff', key: 'staff', icon: IconUser },
  { to: '/reports', key: 'reports', icon: IconLeaf },
  { to: '/feedback', key: 'feedback', icon: IconMap },
  { to: '/settings', key: 'settings', icon: IconSettings },
];

const CASHIER_NAV_KEYS = new Set(['openBills', 'settings']);
const PLAN1_NAV_KEYS = new Set(['dashboard', 'menu', 'settings']);

export function AppShell() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);
  const userName = user?.email ? user.email.split('@')[0] : t('shell.defaultUser');
  const visibleNav = NAV.filter((n) => {
    if (isPlan1) return PLAN1_NAV_KEYS.has(n.key);
    if (user?.role === 'cashier') return CASHIER_NAV_KEYS.has(n.key);
    if (n.roles && (!user?.role || !n.roles.includes(user.role))) return false;
    return true;
  });

  return (
    <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
      <button
        type="button"
        className="nav-toggle no-print"
        aria-label={t('nav.toggle')}
        aria-expanded={navOpen}
        onClick={() => setNavOpen((v) => !v)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {navOpen ? (
        <button
          type="button"
          className="nav-backdrop no-print"
          aria-label={t('common.close')}
          onClick={closeNav}
        />
      ) : null}
      <aside className="sidebar tf-a-side no-print">
        <div className="tf-a-side__brand">
          <div className="tf-display tf-a-side__brand-name">Orvexa</div>
          <div className="tf-mono tf-a-side__brand-sub">{t('shell.brandSub')}</div>
        </div>
        <nav className="tf-a-side__nav" data-stagger>
          {visibleNav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.key}
                to={n.to}
                end={n.to === '/'}
                onClick={closeNav}
                className={({ isActive }) => `tf-a-side__link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={15} />
                <span>{t(`nav.${n.key}`)}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="tf-a-side__spacer" />
        <div className="tf-a-side__user">
          <div className="tf-a-side__user-name">{userName}</div>
          <div className="tf-a-side__user-role">{user?.role ?? '—'}</div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
