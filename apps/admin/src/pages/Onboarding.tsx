import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LanguageCode, Restaurant, StaffRole } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { useAuthStore } from '../store/auth.js';
import { useCan } from '../utils/plan.js';

const LANGS: LanguageCode[] = ['fr', 'ar', 'en'];
const LANG_LABELS: Record<LanguageCode, string> = { fr: 'Français', ar: 'العربية', en: 'English' };
// Full roles unlock at Pro (`staff.roles_full`); Plus only offers Employee.
const STAFF_ROLES: StaffRole[] = ['waiter', 'kitchen', 'manager', 'cashier'];
const BASIC_STAFF_ROLES: StaffRole[] = ['employee'];
const ROLE_LABELS: Record<string, string> = {
  waiter: 'Serveur',
  kitchen: 'Cuisine',
  manager: 'Manager',
  cashier: 'Caissier',
  employee: 'Employé',
};

const TOTAL_STEPS = 4;

// ── Step 1 — Restaurant profile ──────────────────────────────────────────────

function ProfileStep({
  onDone,
}: {
  onDone: () => void;
}) {
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authedFetch((tk) => api.getRestaurant(tk))
      .then(setRestaurant)
      .catch(() => setError('Impossible de charger les informations du restaurant.'));
  }, [authedFetch]);

  const toggleLang = (l: LanguageCode) => {
    if (!restaurant) return;
    const has = restaurant.supportedLanguages.includes(l);
    const next = has
      ? restaurant.supportedLanguages.filter((x) => x !== l)
      : [...restaurant.supportedLanguages, l];
    if (next.length === 0) return;
    setRestaurant({
      ...restaurant,
      supportedLanguages: next as [LanguageCode, ...LanguageCode[]],
    });
  };

  const save = async () => {
    if (!restaurant || !restaurant.name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await authedFetch((tk) =>
        api.patchRestaurant(tk, {
          name: restaurant.name,
          defaultLanguage: restaurant.defaultLanguage,
          supportedLanguages: restaurant.supportedLanguages,
          timezone: restaurant.timezone,
        }),
      );
      onDone();
    } catch {
      setError('Erreur lors de la sauvegarde. Vérifiez votre connexion.');
    } finally {
      setBusy(false);
    }
  };

  if (!restaurant && !error) {
    return <p className="onb-loading">Chargement…</p>;
  }

  return (
    <div className="onb-step-body">
      <h2 className="onb-step-title">Votre restaurant</h2>
      <p className="onb-step-sub">
        Ces informations apparaissent dans l'application client et dans les impressions.
      </p>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      {restaurant && (
        <>
          <label className="onb-field">
            <span className="onb-field-label">Nom du restaurant</span>
            <input
              type="text"
              required
              value={restaurant.name}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
              placeholder="Café El Jem"
            />
          </label>

          <div className="onb-row">
            <label className="onb-field" style={{ flex: 1 }}>
              <span className="onb-field-label">Fuseau horaire</span>
              <input
                type="text"
                value={restaurant.timezone}
                onChange={(e) => setRestaurant({ ...restaurant, timezone: e.target.value })}
                placeholder="Africa/Tunis"
              />
            </label>

            <label className="onb-field" style={{ flex: 1 }}>
              <span className="onb-field-label">Langue par défaut</span>
              <select
                value={restaurant.defaultLanguage}
                onChange={(e) =>
                  setRestaurant({
                    ...restaurant,
                    defaultLanguage: e.target.value as LanguageCode,
                  })
                }
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {LANG_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="onb-field">
            <span className="onb-field-label">Langues du menu</span>
            <div className="onb-lang-chips">
              {LANGS.map((l) => {
                const on = restaurant.supportedLanguages.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    className={`onb-lang-chip${on ? ' is-on' : ''}`}
                    onClick={() => toggleLang(l)}
                    aria-pressed={on}
                  >
                    {LANG_LABELS[l]}
                    {on && <span className="onb-chip-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="onb-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !restaurant.name.trim()}
              onClick={save}
            >
              {busy ? 'Sauvegarde…' : 'Continuer →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 2 — First menu item ──────────────────────────────────────────────────

function MenuStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [catFr, setCatFr] = useState('');
  const [catAr, setCatAr] = useState('');
  const [dishFr, setDishFr] = useState('');
  const [dishAr, setDishAr] = useState('');
  const [priceTnd, setPriceTnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = catFr.trim().length > 0 && dishFr.trim().length > 0 && Number(priceTnd) > 0;

  const save = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const category = await authedFetch((tk) =>
        api.createCategory(tk, {
          name: {
            fr: catFr.trim(),
            ar: catAr.trim() || catFr.trim(),
            en: catFr.trim(),
          },
        }),
      );
      await authedFetch((tk) =>
        api.createDish(tk, {
          categoryId: category.id,
          name: {
            fr: dishFr.trim(),
            ar: dishAr.trim() || dishFr.trim(),
            en: dishFr.trim(),
          },
          priceMillimes: Math.round(Number(priceTnd) * 1000),
        }),
      );
      onDone();
    } catch {
      setError('Erreur lors de la création. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onb-step-body">
      <h2 className="onb-step-title">Premier plat au menu</h2>
      <p className="onb-step-sub">
        Ajoutez une catégorie et un premier plat. Vous pourrez compléter le menu en détail ensuite.
      </p>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <fieldset className="onb-fieldset">
        <legend className="onb-legend">Catégorie</legend>
        <div className="onb-row">
          <label className="onb-field" style={{ flex: 1 }}>
            <span className="onb-field-label">Nom (FR) *</span>
            <input
              type="text"
              required
              value={catFr}
              onChange={(e) => setCatFr(e.target.value)}
              placeholder="Boissons"
            />
          </label>
          <label className="onb-field" style={{ flex: 1 }}>
            <span className="onb-field-label">Nom (AR)</span>
            <input
              type="text"
              dir="rtl"
              value={catAr}
              onChange={(e) => setCatAr(e.target.value)}
              placeholder="مشروبات"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="onb-fieldset">
        <legend className="onb-legend">Plat</legend>
        <div className="onb-row">
          <label className="onb-field" style={{ flex: 1 }}>
            <span className="onb-field-label">Nom (FR) *</span>
            <input
              type="text"
              required
              value={dishFr}
              onChange={(e) => setDishFr(e.target.value)}
              placeholder="Café express"
            />
          </label>
          <label className="onb-field" style={{ flex: 1 }}>
            <span className="onb-field-label">Nom (AR)</span>
            <input
              type="text"
              dir="rtl"
              value={dishAr}
              onChange={(e) => setDishAr(e.target.value)}
              placeholder="قهوة"
            />
          </label>
        </div>
        <label className="onb-field" style={{ maxWidth: 180 }}>
          <span className="onb-field-label">Prix (TND) *</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={priceTnd}
            onChange={(e) => setPriceTnd(e.target.value)}
            placeholder="2.5"
          />
        </label>
      </fieldset>

      <div className="onb-actions">
        <button type="button" className="btn btn-ghost" onClick={onSkip}>
          Passer
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !canSubmit}
          onClick={save}
        >
          {busy ? 'Création…' : 'Ajouter et continuer →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — Tables ───────────────────────────────────────────────────────────

function TablesStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [count, setCount] = useState(10);
  const [seats, setSeats] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      for (let i = 1; i <= count; i++) {
        await authedFetch((tk) =>
          api.createTable(tk, { label: `Table ${i}`, seats }),
        );
      }
      onDone();
    } catch {
      setError('Erreur lors de la création des tables. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onb-step-body">
      <h2 className="onb-step-title">Tables</h2>
      <p className="onb-step-sub">
        Choisissez le nombre de tables et de places. Elles seront nommées automatiquement
        (Table 1, Table 2…). Vous pourrez les renommer depuis la page Tables.
      </p>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="onb-row">
        <label className="onb-field" style={{ flex: 1 }}>
          <span className="onb-field-label">Nombre de tables</span>
          <input
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="onb-field" style={{ flex: 1 }}>
          <span className="onb-field-label">Places par table</span>
          <input
            type="number"
            min="1"
            max="50"
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
          />
        </label>
      </div>

      <p className="onb-step-sub" style={{ marginTop: 0 }}>
        → {count} table{count > 1 ? 's' : ''}, {seats} place{seats > 1 ? 's' : ''} chacune
      </p>

      <div className="onb-actions">
        <button type="button" className="btn btn-ghost" onClick={onSkip}>
          Passer
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={save}
        >
          {busy ? `Création…` : `Créer ${count} table${count > 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 — First staff member ───────────────────────────────────────────────

function StaffStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const fullRoles = useCan()('staff.roles_full');
  const staffRoles = fullRoles ? STAFF_ROLES : BASIC_STAFF_ROLES;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>(fullRoles ? 'waiter' : 'employee');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && email.trim() && password.length >= 6;

  const save = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await authedFetch((tk) =>
        api.createStaff(tk, {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      );
      onDone();
    } catch {
      setError("Erreur lors de la création. L'e-mail est peut-être déjà utilisé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onb-step-body">
      <h2 className="onb-step-title">Premier membre du personnel</h2>
      <p className="onb-step-sub">
        Créez un compte pour votre premier employé. Vous pourrez en ajouter d'autres depuis la page Personnel.
      </p>

      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="onb-row">
        <label className="onb-field" style={{ flex: 1 }}>
          <span className="onb-field-label">Nom *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ahmed Saidi"
          />
        </label>
        <label className="onb-field" style={{ flex: 1 }}>
          <span className="onb-field-label">Rôle</span>
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {staffRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="onb-field">
        <span className="onb-field-label">E-mail *</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ahmed@votrerestaurant.tn"
        />
      </label>

      <label className="onb-field">
        <span className="onb-field-label">
          Mot de passe provisoire *{' '}
          <span style={{ fontWeight: 400, color: 'var(--fg-soft)', fontSize: '0.82rem' }}>
            (6 caractères min.)
          </span>
        </span>
        <input
          type="text"
          autoComplete="off"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="À communiquer à l'employé"
        />
      </label>

      <div className="onb-actions">
        <button type="button" className="btn btn-ghost" onClick={onSkip}>
          Passer
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !canSubmit}
          onClick={save}
        >
          {busy ? 'Création…' : 'Créer le compte →'}
        </button>
      </div>
    </div>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────

function DoneScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="onb-step-body onb-done">
      <div className="onb-done-icon">✓</div>
      <h2 className="onb-step-title">Votre espace est prêt !</h2>
      <p className="onb-step-sub">
        Vous pouvez maintenant gérer votre menu, vos tables, et suivre les commandes en temps réel.
      </p>
      <div className="onb-actions">
        <button type="button" className="btn btn-primary" onClick={onFinish}>
          Accéder au tableau de bord
        </button>
      </div>
    </div>
  );
}

// ── Wizard shell ──────────────────────────────────────────────────────────────

const STEP_LABELS = ['Profil', 'Menu', 'Tables', 'Personnel'];

export function Onboarding() {
  const navigate = useNavigate();
  const menuOnly = !useCan()('ordering.customer');
  const [step, setStep] = useState(0);
  const isDone = step >= TOTAL_STEPS;

  const next = () => setStep((s) => s + 1);

  const finish = () => {
    navigate(menuOnly ? '/menu' : '/', { replace: true });
  };

  return (
    <div className="onb-shell">
      <div className="onb-card">
        <div className="onb-header">
          <span className="onb-brand">Orvexa</span>
          {!isDone && (
            <span className="onb-step-counter">
              Étape {step + 1} sur {TOTAL_STEPS}
            </span>
          )}
        </div>

        {!isDone && (
          <div className="onb-progress-bar">
            <div
              className="onb-progress-fill"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        )}

        {!isDone && (
          <div className="onb-step-tabs">
            {STEP_LABELS.map((label, i) => (
              <span
                key={i}
                className={`onb-step-tab${i === step ? ' is-active' : i < step ? ' is-done' : ''}`}
              >
                {i < step ? '✓' : i + 1} {label}
              </span>
            ))}
          </div>
        )}

        {step === 0 && <ProfileStep onDone={next} />}
        {step === 1 && <MenuStep onDone={next} onSkip={next} />}
        {step === 2 && <TablesStep onDone={next} onSkip={next} />}
        {step === 3 && <StaffStep onDone={next} onSkip={next} />}
        {isDone && <DoneScreen onFinish={finish} />}
      </div>
    </div>
  );
}
