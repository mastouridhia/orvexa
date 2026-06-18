import { useState, type ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.js';
import type { Capability, StaffRole } from '@orvexa/shared';
import { useCan } from '../utils/plan.js';
import { getImpersonating, clearImpersonating } from '../utils/impersonation.js';
import {
  IconBolt,
  IconLeaf,
  IconLock,
  IconMap,
  IconReceipt,
  IconSettings,
  IconTable,
  IconUser,
  IconUtensils,
} from './tf-icons.js';

type IconCmp = ComponentType<{ size?: number }>;

// `cap` (optional) is the capability a nav item needs. Items the current plan
// can't access still render — locked, with a prompt to upgrade.
const NAV: { to: string; key: string; icon: IconCmp; roles?: StaffRole[]; cap?: Capability }[] = [
  { to: '/', key: 'dashboard', icon: IconBolt },
  { to: '/menu', key: 'menu', icon: IconUtensils },
  { to: '/orders', key: 'orders', icon: IconReceipt, cap: 'ordering.inbox' },
  {
    to: '/open-bills',
    key: 'openBills',
    icon: IconReceipt,
    roles: ['admin', 'manager', 'cashier'],
    cap: 'bills.split',
  },
  { to: '/tables', key: 'tables', icon: IconTable },
  { to: '/staff', key: 'staff', icon: IconUser, cap: 'staff.basic' },
  { to: '/reports', key: 'reports', icon: IconLeaf, cap: 'analytics.sales_basic' },
  { to: '/feedback', key: 'feedback', icon: IconMap, cap: 'feedback' },
  { to: '/settings', key: 'settings', icon: IconSettings },
];

const CASHIER_NAV_KEYS = new Set(['openBills', 'settings']);

export function AppShell() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const can = useCan();
  const logout = useAuthStore((s) => s.logout);
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);
  const impersonating = getImpersonating();
  const returnToPlatform = () => {
    logout();
    clearImpersonating();
    window.location.assign('/platform');
  };
  const userName = user?.email ? user.email.split('@')[0] : t('shell.defaultUser');
  const visibleNav = NAV.filter((n) => {
    if (user?.role === 'cashier') return CASHIER_NAV_KEYS.has(n.key);
    if (n.roles && (!user?.role || !n.roles.includes(user.role))) return false;
    return true;
  });

  return (
    <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
      {impersonating ? (
        <div className="impersonation-bar no-print" role="status">
          <span>
            👁 {t('platform.viewingAs', { name: impersonating })}
          </span>
          <button type="button" className="impersonation-bar__exit" onClick={returnToPlatform}>
            {t('platform.returnToPlatform')}
          </button>
        </div>
      ) : null}
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
            const locked = n.cap ? !can(n.cap) : false;
            return (
              <NavLink
                key={n.key}
                to={n.to}
                end={n.to === '/'}
                onClick={closeNav}
                className={({ isActive }) =>
                  `tf-a-side__link${isActive ? ' is-active' : ''}${locked ? ' is-locked' : ''}`
                }
              >
                <Icon size={15} />
                <span>{t(`nav.${n.key}`)}</span>
                {locked ? (
                  <span className="tf-a-side__lock" title={t('upsell.navHint')} aria-label={t('upsell.navHint')}>
                    <IconLock size={12} />
                  </span>
                ) : null}
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
