import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StaffRole, StaffShift, StaffUser } from '@orvexa/shared';
import { ApiError } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { Modal } from '@orvexa/ui';
import { formatDateTime } from '../utils/format.js';

const ROLES: StaffRole[] = ['admin', 'manager', 'kitchen', 'waiter', 'cashier'];

function todayDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StaffManager() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as 'ar' | 'fr' | 'en') ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const me = useAuthStore((s) => s.user);
  const [list, setList] = useState<StaffUser[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const today = useMemo(() => todayDateIso(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, shiftRows] = await Promise.all([
          authedFetch((tk) => api.listStaff(tk)),
          authedFetch((tk) => api.listStaffShifts(tk, today)),
        ]);
        if (!cancelled) {
          setList(rows);
          setShifts(shiftRows);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, reloadKey, today]);

  const presenceByUser = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of shifts) map.set(s.userId, s.present);
    return map;
  }, [shifts]);

  const togglePresence = async (userId: string, current: boolean) => {
    try {
      const updated = await authedFetch((tk) =>
        api.setStaffShiftPresence(tk, userId, { shiftDate: today, present: !current }),
      );
      setShifts((prev) => {
        const next = prev.filter((s) => s.userId !== userId);
        next.push(updated);
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  };

  const toggle = async (u: StaffUser) => {
    try {
      if (u.disabledAt) await authedFetch((tk) => api.enableStaff(tk, u.id));
      else await authedFetch((tk) => api.disableStaff(tk, u.id));
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  };

  const canManage = me?.role === 'admin';

  return (
    <>
      <h1 className="page-title">{t('staff.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      {canManage ? (
        <div className="row-gap" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            + {t('staff.new')}
          </button>
        </div>
      ) : null}

      <table className="dt">
        <thead>
          <tr>
            <th>{t('staff.name')}</th>
            <th>{t('staff.email')}</th>
            <th>{t('staff.role')}</th>
            <th>{t('staff.status')}</th>
            <th>{t('staff.presentToday')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((u) => {
            const present = presenceByUser.get(u.id) ?? false;
            return (
              <tr key={u.id} className={u.disabledAt ? 'row-disabled' : ''}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.disabledAt
                    ? `${t('staff.disabled')} · ${formatDateTime(u.disabledAt, lang)}`
                    : t('staff.active')}
                </td>
                <td>
                  {!u.disabledAt ? (
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={present}
                        onChange={() => togglePresence(u.id, present)}
                        style={{ width: 'auto', marginInlineEnd: '0.4rem' }}
                      />
                      {present ? t('staff.present') : t('staff.absent')}
                    </label>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="right">
                  {canManage && u.id !== me?.id ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setEditing(u)}
                      >
                        {t('staff.save')}
                      </button>{' '}
                      <button
                        type="button"
                        className={`btn btn-sm ${u.disabledAt ? '' : 'btn-danger'}`}
                        onClick={() => toggle(u)}
                      >
                        {u.disabledAt ? t('staff.enable') : t('staff.disable')}
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing ? (
        <StaffEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onError={setError}
        />
      ) : null}
    </>
  );
}

function StaffEditor({
  initial,
  onClose,
  onSaved,
  onError,
}: {
  initial: StaffUser | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [email, setEmail] = useState(initial?.email ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<StaffRole>(initial?.role ?? 'waiter');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (initial) {
        const patch: { name?: string; role?: StaffRole; password?: string } = {};
        if (name !== initial.name) patch.name = name;
        if (role !== initial.role) patch.role = role;
        if (password) patch.password = password;
        if (Object.keys(patch).length > 0) {
          await authedFetch((tk) => api.updateStaff(tk, initial.id, patch));
        }
      } else {
        await authedFetch((tk) => api.createStaff(tk, { email, name, role, password }));
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? initial.name : t('staff.new')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('staff.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {t('staff.save')}
          </button>
        </>
      }
    >
      <label>
        {t('staff.email')}
        <input
          type="email"
          required
          value={email}
          disabled={!!initial}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        {t('staff.name')}
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t('staff.role')}
        <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('staff.password')}
        <input
          type="password"
          required={!initial}
          placeholder={initial ? '(leave blank to keep)' : ''}
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
    </Modal>
  );
}
