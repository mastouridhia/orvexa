import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StaffRole, StaffShift, StaffUser } from '@orvexa/shared';
import { getErrorMessage } from '../api/client.js';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { Modal } from '@orvexa/ui';
import { formatDateTime } from '../utils/format.js';

const ROLES: StaffRole[] = ['admin', 'manager', 'kitchen', 'waiter', 'cashier'];

function todayDateIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type Tab = 'list' | 'attendance';

export function StaffManager() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as 'ar' | 'fr' | 'en') ?? 'fr';
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const me = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('list');
  const [list, setList] = useState<StaffUser[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const today = useMemo(() => todayDateIso(), []);

  // Attendance tab state
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceShifts, setAttendanceShifts] = useState<StaffShift[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Load staff list + today's shifts
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
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, reloadKey, today]);

  // Load shifts for attendance date when on attendance tab
  useEffect(() => {
    if (tab !== 'attendance') return;
    let cancelled = false;
    setAttendanceShifts([]);
    setAttendanceLoading(true);
    setError(null);
    (async () => {
      try {
        const rows = await authedFetch((tk) => api.listStaffShifts(tk, attendanceDate));
        if (!cancelled) setAttendanceShifts(rows);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, tab, attendanceDate]);

  const presenceByUser = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of shifts) map.set(s.userId, s.present);
    return map;
  }, [shifts]);

  const attendancePresenceByUser = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of attendanceShifts) map.set(s.userId, s.present);
    return map;
  }, [attendanceShifts]);

  const activeStaff = useMemo(() => list.filter((u) => !u.disabledAt), [list]);

  function applyShiftUpdate(updated: import('@orvexa/shared').StaffShift) {
    const splice = (prev: import('@orvexa/shared').StaffShift[]) => [
      ...prev.filter((s) => s.userId !== updated.userId),
      updated,
    ];
    setShifts((prev) =>
      updated.shiftDate === today ? splice(prev) : prev,
    );
    setAttendanceShifts((prev) =>
      updated.shiftDate === attendanceDate ? splice(prev) : prev,
    );
  }

  const togglePresence = async (userId: string, current: boolean) => {
    try {
      const updated = await authedFetch((tk) =>
        api.setStaffShiftPresence(tk, userId, { shiftDate: today, present: !current }),
      );
      applyShiftUpdate(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleAttendance = async (userId: string, current: boolean) => {
    try {
      const updated = await authedFetch((tk) =>
        api.setStaffShiftPresence(tk, userId, { shiftDate: attendanceDate, present: !current }),
      );
      applyShiftUpdate(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggle = async (u: StaffUser) => {
    try {
      if (u.disabledAt) await authedFetch((tk) => api.enableStaff(tk, u.id));
      else await authedFetch((tk) => api.disableStaff(tk, u.id));
      reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const canManage = me?.role === 'admin';
  const isToday = attendanceDate === today;

  return (
    <>
      <h1 className="page-title">{t('staff.title')}</h1>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div className="tf-a-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'list'}
            className={tab === 'list' ? 'is-active' : ''}
            onClick={() => setTab('list')}
          >
            {t('staff.tabs.list')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'attendance'}
            className={tab === 'attendance' ? 'is-active' : ''}
            onClick={() => setTab('attendance')}
          >
            {t('staff.tabs.attendance')}
          </button>
        </div>

        {tab === 'list' && canManage ? (
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            + {t('staff.new')}
          </button>
        ) : null}
      </div>

      {tab === 'list' ? (
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
                        <button type="button" className="btn btn-sm" onClick={() => setEditing(u)}>
                          {t('staff.edit')}
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
      ) : (
        <div>
          {/* Date navigation */}
          <div className="row-gap" style={{ marginBottom: '1rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAttendanceDate((d) => offsetDate(d, -1))}
            >
              ←
            </button>
            <input
              type="date"
              value={attendanceDate}
              max={today}
              onChange={(e) => e.target.value && setAttendanceDate(e.target.value)}
              style={{ width: 'auto' }}
            />
            <span className="muted" style={{ fontSize: '0.875rem' }}>
              {formatDateLabel(attendanceDate, lang)}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAttendanceDate((d) => offsetDate(d, 1))}
              disabled={isToday}
            >
              →
            </button>
            {!isToday ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setAttendanceDate(today)}
              >
                {t('staff.attendance.today')}
              </button>
            ) : null}
          </div>

          {attendanceLoading ? (
            <p className="muted">{t('common.loading')}</p>
          ) : activeStaff.length === 0 ? (
            <p className="muted">{t('staff.attendance.noStaff')}</p>
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th>{t('staff.name')}</th>
                  <th>{t('staff.role')}</th>
                  <th>{t('staff.attendance.present')}</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((u) => {
                  const present = attendancePresenceByUser.get(u.id) ?? false;
                  return (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.role}</td>
                      <td>
                        <label style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={present}
                            onChange={() => toggleAttendance(u.id, present)}
                            style={{ width: 'auto', marginInlineEnd: '0.4rem' }}
                          />
                          {present ? t('staff.present') : t('staff.absent')}
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

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
      onError(getErrorMessage(err));
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
