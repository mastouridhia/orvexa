import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';

type Step = {
  key: 'restaurant' | 'menu' | 'tables' | 'staff';
  done: boolean;
  to: string;
};

const DISMISS_KEY = 'orvexa.admin.firstRunDismissed';

/**
 * Setup-progress card shown on the Dashboard until the four onboarding milestones
 * are met (restaurant info, at least one category+dish, at least one table, at least
 * one waiter or kitchen staff). User can dismiss with localStorage persistence.
 */
export function FirstRunChecklist() {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1',
  );

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const [restaurant, categories, dishes, tables, staff] = await Promise.all([
          authedFetch((tk) => api.getRestaurant(tk)),
          authedFetch((tk) => api.listCategories(tk)),
          authedFetch((tk) => api.listDishes(tk)),
          authedFetch((tk) => api.listTables(tk)),
          authedFetch((tk) => api.listStaff(tk)),
        ]);
        if (cancelled) return;
        const hasNonAdminStaff = staff.some(
          (u) => u.role !== 'admin' && !u.disabledAt,
        );
        const hasMenu = categories.length > 0 && dishes.length > 0;
        const computed: Step[] = [
          {
            key: 'restaurant',
            done: Boolean(restaurant.name) && restaurant.name !== 'Demo Restaurant',
            to: '/settings',
          },
          { key: 'menu', done: hasMenu, to: '/menu' },
          { key: 'tables', done: tables.length > 0, to: '/tables' },
          { key: 'staff', done: hasNonAdminStaff, to: '/staff' },
        ];
        setSteps(computed);
      } catch {
        // If any endpoint fails, just hide the checklist — Dashboard already surfaces errors
        if (!cancelled) setSteps(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, dismissed]);

  if (dismissed || !steps) return null;
  const remaining = steps.filter((s) => !s.done);
  if (remaining.length === 0) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="row-gap" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>{t('firstRun.title')}</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            {t('firstRun.subtitle')}
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={dismiss}>
          {t('firstRun.dismiss')}
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {steps.map((step) => (
          <li
            key={step.key}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem' }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '1.4rem',
                height: '1.4rem',
                borderRadius: '999px',
                background: step.done ? 'var(--primary)' : 'var(--bg-soft)',
                color: step.done ? 'white' : 'var(--fg-soft)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            >
              {step.done ? '✓' : ''}
            </span>
            <span style={{ flex: 1, color: step.done ? 'var(--fg-soft)' : 'var(--fg)' }}>
              {t(`firstRun.steps.${step.key}`)}
            </span>
            {!step.done ? (
              <Link to={step.to} className="btn btn-sm btn-primary">
                {t('firstRun.goTo')}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
