import { useEffect, useMemo, useState } from 'react';
import type { StaffUser } from '@orvexa/shared';
import { useAuthStore } from '../store/auth.js';
import { IMPERSONATION_KEY } from '../utils/impersonation.js';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

const PLAN_LABELS: Record<number, string> = {
  1: 'Essentiel',
  2: 'Plus',
  3: 'Pro',
  4: 'Premium',
};

const PLAN_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#2563eb',
  3: '#7c3aed',
  4: '#b45309',
};

// Orvexa brand mark — concentric saffron rings, matches the QR cards.
const MARK_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#19140E"/>
  <circle cx="50" cy="50" r="31" fill="#FBEED9"/>
  <circle cx="50" cy="50" r="19" fill="#D97A2C"/>
</svg>`;

type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  plan: number;
  isActive: boolean;
  createdAt: string;
  ownerEmail: string | null;
  scansTotal: number;
  scans30d: number;
  lastScanAt: string | null;
  ordersTotal: number;
  orders30d: number;
};

type InvitationRow = {
  id: string;
  email: string;
  restaurantName: string;
  plan: number;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

type Tab = 'restaurants' | 'invitations' | 'invite' | 'documents';

async function platformFetch<T>(
  path: string,
  key: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-platform-key': key,
      ...(options?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { data?: T; error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Server error');
  return json.data as T;
}

// Compact relative label for the most recent QR scan, e.g. "il y a 3 min",
// "il y a 5 h", "hier", or a date for anything older than a week.
function formatLastScan(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'hier';
  if (diffD < 7) return `il y a ${diffD} j`;
  return new Date(iso).toLocaleDateString('fr-TN');
}

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="op-mark"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: MARK_SVG }}
    />
  );
}

function PlanBadge({ plan }: { plan: number }) {
  return (
    <span
      className="op-plan-badge"
      style={{
        background: PLAN_COLORS[plan] + '18',
        color: PLAN_COLORS[plan],
        border: `1px solid ${PLAN_COLORS[plan]}40`,
      }}
    >
      {PLAN_LABELS[plan] ?? `Plan ${plan}`}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="op-stat">
      <div className="op-stat__label">{label}</div>
      <div className="op-stat__value">{value}</div>
      {hint ? <div className="op-stat__hint">{hint}</div> : null}
    </div>
  );
}

function RestaurantsTab({ platformKey }: { platformKey: string }) {
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  const load = () => {
    setLoading(true);
    platformFetch<RestaurantRow[]>('/platform/restaurants', platformKey)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [platformKey]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.isActive).length;
    const scans30d = rows.reduce((s, r) => s + r.scans30d, 0);
    const orders30d = rows.reduce((s, r) => s + r.orders30d, 0);
    return { total: rows.length, active, scans30d, orders30d };
  }, [rows]);

  const patch = async (id: string, update: { plan?: number; isActive?: boolean }) => {
    setBusy(id);
    try {
      const updated = await platformFetch<RestaurantRow>(
        `/platform/restaurants/${id}`,
        platformKey,
        { method: 'PATCH', body: JSON.stringify(update) },
      );
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  const viewAs = async (r: RestaurantRow) => {
    setBusy(r.id);
    setError(null);
    try {
      const session = await platformFetch<{ accessToken: string; refreshToken: string; user: StaffUser }>(
        `/platform/restaurants/${r.id}/impersonate`,
        platformKey,
        { method: 'POST' },
      );
      useAuthStore.getState().setSession(session.accessToken, session.refreshToken, session.user);
      sessionStorage.setItem(IMPERSONATION_KEY, r.name);
      // Full navigation so the admin app boots fresh into the impersonated session.
      window.location.assign('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setBusy(null);
    }
  };

  const resetPassword = async (r: RestaurantRow) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${r.name} ? L'ancien mot de passe et les sessions actives seront invalidés.`)) return;
    setBusy(r.id);
    setError(null);
    try {
      const { password } = await platformFetch<{ password: string }>(
        `/platform/restaurants/${r.id}/reset-password`,
        platformKey,
        { method: 'POST' },
      );
      setResetResult({ name: r.name, password });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="op-state">Chargement…</div>;
  if (error) return <div className="op-state op-state--error">{error}</div>;
  if (rows.length === 0) return <div className="op-state">Aucun restaurant.</div>;

  return (
    <div>
      <div className="op-stats">
        <StatCard label="Clients" value={stats.total.toLocaleString('fr-TN')} hint={`${stats.active} actifs`} />
        <StatCard label="Scans · 30 j" value={stats.scans30d.toLocaleString('fr-TN')} />
        <StatCard label="Commandes · 30 j" value={stats.orders30d.toLocaleString('fr-TN')} />
      </div>

      {resetResult && (
        <div className="op-pw-banner">
          <strong>Nouveau mot de passe pour {resetResult.name}</strong>
          <div className="op-pw-banner__row">
            <code>{resetResult.password}</code>
            <button
              className="btn btn-sm"
              onClick={() => void navigator.clipboard?.writeText(resetResult.password)}
            >
              Copier
            </button>
            <button className="btn btn-sm" onClick={() => setResetResult(null)}>
              Masquer
            </button>
          </div>
          <p>Notez-le maintenant — il ne sera plus affiché. Transmettez-le au client.</p>
        </div>
      )}

      <div className="op-card op-table-wrap">
        <table className="op-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Slug</th>
              <th>Plan</th>
              <th>Statut</th>
              <th className="op-num" title="QR scannés — total (30 derniers jours)">Scans</th>
              <th className="op-num" title="Commandes — total (30 derniers jours)">Commandes</th>
              <th>Dernier scan</th>
              <th>Créé le</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.isActive ? '' : 'op-row--off'}>
                <td>
                  <div className="op-resto">
                    <span
                      className="op-resto__avatar"
                      style={{ background: PLAN_COLORS[r.plan] + '1f', color: PLAN_COLORS[r.plan] }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="op-resto__meta">
                      <span className="op-resto__name">{r.name}</span>
                      <span className="op-resto__email">
                        {r.ownerEmail ?? '— aucun compte'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="op-mono op-muted">{r.slug}</td>
                <td>
                  <select
                    className="op-plan-select"
                    value={r.plan}
                    disabled={!!busy}
                    style={{ color: PLAN_COLORS[r.plan] }}
                    onChange={(e) => void patch(r.id, { plan: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((p) => (
                      <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {r.isActive ? (
                    <span className="op-pill op-pill--ok">Actif</span>
                  ) : (
                    <span className="op-pill op-pill--off">Suspendu</span>
                  )}
                </td>
                <td className="op-num op-nowrap">
                  <strong>{r.scansTotal.toLocaleString('fr-TN')}</strong>
                  <span className="op-muted"> ({r.scans30d.toLocaleString('fr-TN')})</span>
                </td>
                <td className="op-num op-nowrap">
                  <strong>{r.ordersTotal.toLocaleString('fr-TN')}</strong>
                  <span className="op-muted"> ({r.orders30d.toLocaleString('fr-TN')})</span>
                </td>
                <td className="op-muted op-nowrap">
                  {r.lastScanAt ? formatLastScan(r.lastScanAt) : '—'}
                </td>
                <td className="op-muted op-nowrap">
                  {new Date(r.createdAt).toLocaleDateString('fr-TN')}
                </td>
                <td className="op-nowrap op-actions">
                  <button
                    className="btn btn-sm"
                    disabled={busy === r.id || !r.ownerEmail}
                    onClick={() => void viewAs(r)}
                    title={r.ownerEmail ? 'Ouvrir le tableau de bord de ce client' : 'Aucun compte admin'}
                  >
                    Voir
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={busy === r.id || !r.ownerEmail}
                    onClick={() => void resetPassword(r)}
                    title={r.ownerEmail ? 'Réinitialiser le mot de passe' : 'Aucun compte admin'}
                  >
                    Mot de passe
                  </button>
                  <button
                    className={`btn btn-sm ${r.isActive ? '' : 'btn-primary'}`}
                    disabled={busy === r.id}
                    onClick={() => void patch(r.id, { isActive: !r.isActive })}
                  >
                    {busy === r.id ? '…' : r.isActive ? 'Suspendre' : 'Réactiver'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvitationsTab({ platformKey }: { platformKey: string }) {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    platformFetch<InvitationRow[]>('/platform/invitations', platformKey)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [platformKey]);

  const cancel = async (inv: InvitationRow) => {
    if (!window.confirm(`Annuler l'invitation de ${inv.email} ?`)) return;
    setBusy(inv.id);
    setError(null);
    try {
      await platformFetch(`/platform/invitations/${inv.id}`, platformKey, { method: 'DELETE' });
      setRows((prev) => prev.filter((r) => r.id !== inv.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="op-state">Chargement…</div>;
  if (error) return <div className="op-state op-state--error">{error}</div>;
  if (rows.length === 0) return <div className="op-state">Aucune invitation.</div>;

  return (
    <div className="op-card op-table-wrap">
      <table className="op-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Restaurant</th>
            <th>Plan</th>
            <th>Statut</th>
            <th>Expire le</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => {
            const expired = !inv.acceptedAt && new Date(inv.expiresAt) < new Date();
            const status = inv.acceptedAt ? 'Acceptée' : expired ? 'Expirée' : 'En attente';
            const pillClass = inv.acceptedAt ? 'op-pill--ok' : expired ? 'op-pill--off' : 'op-pill--pending';
            return (
              <tr key={inv.id} className={expired ? 'op-row--off' : ''}>
                <td className="op-mono">{inv.email}</td>
                <td>{inv.restaurantName}</td>
                <td><PlanBadge plan={inv.plan} /></td>
                <td><span className={`op-pill ${pillClass}`}>{status}</span></td>
                <td className="op-muted op-nowrap">
                  {new Date(inv.expiresAt).toLocaleDateString('fr-TN')}
                </td>
                <td className="op-nowrap op-actions">
                  {!inv.acceptedAt && (
                    <button
                      className="btn btn-sm op-btn-danger"
                      disabled={busy === inv.id}
                      onClick={() => void cancel(inv)}
                    >
                      {busy === inv.id ? '…' : 'Annuler'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InviteForm({ platformKey }: { platformKey: string }) {
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [plan, setPlan] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      await platformFetch('/platform/invite', platformKey, {
        method: 'POST',
        body: JSON.stringify({ email, restaurantName, plan }),
      });
      setResult({ ok: true, message: `Invitation envoyée à ${email}` });
      setEmail('');
      setRestaurantName('');
      setPlan(1);
    } catch (e: unknown) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="op-card op-form-card">
      <div className="op-form-head">
        <h2>Inviter un nouveau client</h2>
        <p>Le propriétaire reçoit un e-mail pour créer son compte et configurer son restaurant.</p>
      </div>
      <form onSubmit={submit} noValidate className="op-form">
        <label>
          E-mail du propriétaire
          <input
            type="email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@restaurant.tn"
          />
        </label>
        <label>
          Nom du restaurant
          <input
            type="text"
            autoComplete="off"
            required
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Café El Jem"
          />
        </label>
        <label>
          Plan
          <select value={plan} onChange={(e) => setPlan(Number(e.target.value))}>
            {[1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>{PLAN_LABELS[p]}</option>
            ))}
          </select>
        </label>

        {result && (
          <div className={`op-result ${result.ok ? 'op-result--ok' : 'op-result--err'}`}>
            {result.message}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !email || !restaurantName}
          style={{ alignSelf: 'flex-start' }}
        >
          {busy ? 'Envoi…' : "Envoyer l'invitation"}
        </button>
      </form>
    </div>
  );
}

function DocumentsTab() {
  // Static templates shipped in apps/admin/public/business/ — served at the site
  // root (BASE_URL = '/') so they're reachable from the deployed admin anywhere,
  // not just the dev machine. Each opens in a new tab; fill on screen, Ctrl/Cmd+P
  // → Save as PDF, send to the client. Blank & reusable for every prospect.
  const base = import.meta.env.BASE_URL;
  const docs = [
    {
      title: 'Facture / Reçu / Devis',
      desc: 'Document de paiement à remplir (D17, TND). Choisissez « Devis » pour un prospect, « Facture » ou « Reçu » à l’encaissement. Totaux calculés automatiquement.',
      href: `${base}business/facture-modele.html`,
    },
    {
      title: 'Bon de commande & contrat d’abonnement',
      desc: 'Le contrat que le client signe : formule, prix convenu, mise en service, signatures. À imprimer en deux exemplaires.',
      href: `${base}business/contrat-abonnement.html`,
    },
  ];

  return (
    <div className="op-card op-docs">
      <div className="op-docs__head">
        <h2>Documents commerciaux</h2>
        <p>
          Modèles vierges à remplir puis imprimer / enregistrer en PDF (Ctrl/Cmd+P → « Enregistrer en PDF »).
          Réutilisables pour chaque client — rien n’est enregistré dans le modèle.
        </p>
      </div>
      <div className="op-doc-list">
        {docs.map((d) => (
          <a key={d.href} className="op-doc" href={d.href} target="_blank" rel="noopener noreferrer">
            <span className="op-doc__icon" aria-hidden="true">📄</span>
            <span className="op-doc__body">
              <span className="op-doc__title">{d.title}</span>
              <span className="op-doc__desc">{d.desc}</span>
            </span>
            <span className="op-doc__open">Ouvrir ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function PlatformAdmin() {
  const [platformKey, setPlatformKey] = useState(
    () => sessionStorage.getItem('orvexa.platform.key') ?? '',
  );
  const [tab, setTab] = useState<Tab>('restaurants');
  const [unlocked, setUnlocked] = useState(
    () => !!sessionStorage.getItem('orvexa.platform.key'),
  );
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState(false);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await platformFetch('/platform/restaurants', keyInput);
      setPlatformKey(keyInput);
      sessionStorage.setItem('orvexa.platform.key', keyInput);
      setUnlocked(true);
      setKeyError(false);
    } catch {
      setKeyError(true);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('orvexa.platform.key');
    setPlatformKey('');
    setUnlocked(false);
    setKeyInput('');
  };

  if (!unlocked) {
    return (
      <div className="orvexa-platform op-lock">
        <style>{PLATFORM_CSS}</style>
        <div className="op-lock-card">
          <BrandMark size={44} />
          <h2>Orvexa Platform</h2>
          <p className="op-lock-sub">Accès réservé à l&apos;équipe Orvexa.</p>
          <form onSubmit={unlock} className="op-form">
            <label>
              Clé plateforme
              <input
                type="password"
                autoComplete="off"
                required
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeyError(false); }}
                placeholder="PLATFORM_SECRET"
              />
            </label>
            {keyError && <div className="op-result op-result--err">Clé invalide.</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={!keyInput}>
              Accéder
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'restaurants', label: 'Clients' },
    { id: 'invitations', label: 'Invitations' },
    { id: 'invite', label: '+ Nouvel invité' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="orvexa-platform">
      <style>{PLATFORM_CSS}</style>
      <div className="op-shell">
        <header className="op-header">
          <div className="op-brand">
            <BrandMark size={38} />
            <div className="op-brand__text">
              <h1>
                Orvexa <span className="op-brand__tag">Platform</span>
              </h1>
              <p>Tableau de bord administrateur</p>
            </div>
          </div>
          <button className="btn" onClick={logout}>
            Déconnexion
          </button>
        </header>

        <nav className="op-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'is-active' : ''}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'restaurants' && <RestaurantsTab platformKey={platformKey} />}
        {tab === 'invitations' && <InvitationsTab platformKey={platformKey} />}
        {tab === 'invite' && <InviteForm platformKey={platformKey} />}
        {tab === 'documents' && <DocumentsTab />}
      </div>
    </div>
  );
}

const PLATFORM_CSS = `
.orvexa-platform {
  min-height: 100vh;
  background:
    radial-gradient(1200px 480px at 50% -10%, rgba(217,122,44,0.06), transparent 70%),
    var(--bg);
  color: var(--fg);
  font-family: var(--tf-sans);
}
.op-shell { max-width: 1080px; margin: 0 auto; padding: 2.25rem 1.5rem 4rem; }

/* Header */
.op-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; margin-bottom: 1.75rem;
}
.op-brand { display: flex; align-items: center; gap: 0.8rem; }
.op-mark { display: inline-flex; flex-shrink: 0; }
.op-mark svg { width: 100%; height: 100%; display: block; }
.op-brand__text h1 {
  margin: 0; font-size: 1.45rem; font-weight: 700; letter-spacing: -0.02em;
  display: flex; align-items: baseline; gap: 0.45rem;
}
.op-brand__tag {
  font-family: var(--tf-display); font-style: italic; font-weight: 500;
  font-size: 1.15rem; color: var(--accent);
}
.op-brand__text p { margin: 2px 0 0; color: var(--fg-soft); font-size: 0.85rem; }

/* Tabs */
.op-tabs {
  display: flex; gap: 0.25rem; border-bottom: 1px solid var(--line);
  margin-bottom: 1.75rem;
}
.op-tabs button {
  background: none; border: none; padding: 0.65rem 1.05rem; cursor: pointer;
  font-size: 0.9rem; font-weight: 500; color: var(--fg-soft);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color var(--motion-fast), border-color var(--motion-fast);
  font-family: inherit;
}
.op-tabs button:hover { color: var(--fg); }
.op-tabs button.is-active { color: var(--fg); font-weight: 600; border-bottom-color: var(--accent); }

/* Summary stat cards */
.op-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.85rem; margin-bottom: 1.5rem;
}
.op-stat {
  background: var(--bg-elev); border: 1px solid var(--line);
  border-radius: var(--radius-lg); padding: 1rem 1.1rem; box-shadow: var(--shadow-xs);
}
.op-stat__label {
  font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--fg-faint); font-weight: 600;
}
.op-stat__value { font-size: 1.7rem; font-weight: 700; line-height: 1.1; margin-top: 0.35rem; letter-spacing: -0.02em; }
.op-stat__hint { font-size: 0.78rem; color: var(--fg-soft); margin-top: 0.2rem; }

/* Card + table */
.op-card {
  background: var(--bg-elev); border: 1px solid var(--line);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-xs);
}
.op-table-wrap { overflow-x: auto; }
.op-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.op-table thead th {
  text-align: left; padding: 0.7rem 0.9rem;
  font-size: 0.68rem; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--fg-faint); font-weight: 600; white-space: nowrap;
  border-bottom: 1px solid var(--line); background: var(--bg-soft);
}
.op-table thead th:first-child { border-top-left-radius: var(--radius-lg); }
.op-table thead th:last-child { border-top-right-radius: var(--radius-lg); }
.op-table tbody td { padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
.op-table tbody tr:last-child td { border-bottom: none; }
.op-table tbody tr { transition: background var(--motion-fast); }
.op-table tbody tr:hover { background: var(--bg-soft); }
.op-row--off { opacity: 0.55; }
.op-num { text-align: right; }
.op-nowrap { white-space: nowrap; }
.op-mono { font-family: var(--tf-mono); font-size: 0.8rem; }
.op-muted { color: var(--fg-soft); }

/* Restaurant cell */
.op-resto { display: flex; align-items: center; gap: 0.65rem; }
.op-resto__avatar {
  width: 34px; height: 34px; border-radius: var(--radius-sm); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.95rem;
}
.op-resto__meta { display: flex; flex-direction: column; min-width: 0; }
.op-resto__name { font-weight: 600; }
.op-resto__email {
  font-family: var(--tf-mono); font-size: 0.74rem; color: var(--fg-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;
}

/* Plan select (inline) */
.op-plan-select {
  border: 1px solid transparent; background: transparent; cursor: pointer;
  font-weight: 600; font-size: 0.85rem; padding: 3px 6px; border-radius: var(--radius-sm);
  font-family: inherit; transition: border-color var(--motion-fast), background var(--motion-fast);
}
.op-plan-select:hover:not(:disabled) { border-color: var(--line); background: var(--bg-elev); }

/* Plan badge */
.op-plan-badge {
  display: inline-block; padding: 2px 9px; border-radius: var(--radius-pill);
  font-size: 0.72rem; font-weight: 600;
}

/* Pills */
.op-pill {
  display: inline-block; padding: 2px 9px; border-radius: var(--radius-pill);
  font-size: 0.72rem; font-weight: 600; white-space: nowrap;
}
.op-pill--ok { background: var(--success-bg); color: var(--success-ink); }
.op-pill--off { background: var(--bg-soft); color: var(--fg-faint); }
.op-pill--pending { background: var(--warn-bg); color: var(--warn-ink); }

/* Actions */
.op-actions { display: flex; gap: 0.4rem; justify-content: flex-end; }
.op-btn-danger { color: var(--danger-ink); }

/* Password reset banner */
.op-pw-banner {
  background: var(--warn-bg); border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent);
  color: var(--warn-ink); padding: 0.9rem 1.05rem; border-radius: var(--radius-lg);
  margin-bottom: 1.25rem; font-size: 0.9rem;
}
.op-pw-banner__row { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.op-pw-banner__row code {
  font-size: 1rem; background: var(--bg-elev); padding: 5px 11px;
  border-radius: var(--radius-sm); border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent);
  font-family: var(--tf-mono);
}
.op-pw-banner p { margin: 0.55rem 0 0; font-size: 0.8rem; opacity: 0.85; }

/* States */
.op-state { padding: 2.5rem 1.5rem; text-align: center; color: var(--fg-soft); font-size: 0.9rem; }
.op-state--error { color: var(--danger-ink); }

/* Forms */
.op-form { display: flex; flex-direction: column; gap: 0.9rem; }
.op-form label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; font-weight: 500; color: var(--fg-soft); }
.op-form input, .op-form select {
  padding: 0.6rem 0.7rem; border: 1px solid var(--line); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--fg); font-size: 0.9rem; font-family: inherit;
  transition: border-color var(--motion-fast), box-shadow var(--motion-fast);
}
.op-form input:focus, .op-form select:focus {
  outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.op-form-card { padding: 1.5rem; max-width: 480px; }
.op-form-head { margin-bottom: 1.25rem; }
.op-form-head h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.op-form-head p { margin: 0.35rem 0 0; color: var(--fg-soft); font-size: 0.85rem; line-height: 1.5; }

.op-result { padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.88rem; }
.op-result--ok { background: var(--success-bg); color: var(--success-ink); }
.op-result--err { background: var(--danger-bg); color: var(--danger-ink); }

/* Documents tab */
.op-docs { padding: 1.5rem; max-width: 680px; }
.op-docs__head { margin-bottom: 1.1rem; }
.op-docs__head h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.op-docs__head p { margin: 0.35rem 0 0; color: var(--fg-soft); font-size: 0.85rem; line-height: 1.5; }
.op-doc-list { display: flex; flex-direction: column; gap: 0.7rem; }
.op-doc {
  display: flex; align-items: center; gap: 0.9rem; text-decoration: none;
  padding: 0.9rem 1rem; border: 1px solid var(--line); border-radius: var(--radius-lg);
  background: var(--bg); color: var(--fg);
  transition: border-color var(--motion-fast), background var(--motion-fast);
}
.op-doc:hover { border-color: var(--accent); background: var(--bg-soft); }
.op-doc__icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1; }
.op-doc__body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.op-doc__title { font-weight: 600; font-size: 0.95rem; }
.op-doc__desc { color: var(--fg-soft); font-size: 0.82rem; line-height: 1.45; margin-top: 2px; }
.op-doc__open { color: var(--accent); font-weight: 600; font-size: 0.85rem; white-space: nowrap; flex-shrink: 0; }

/* Lock screen */
.op-lock { display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.op-lock-card {
  background: var(--bg-elev); border: 1px solid var(--line);
  border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);
  padding: 2.25rem 2rem; max-width: 400px; width: 100%;
}
.op-lock-card .op-mark { margin-bottom: 1rem; }
.op-lock-card h2 { margin: 0; font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; }
.op-lock-sub { margin: 0.3rem 0 1.5rem; color: var(--fg-soft); font-size: 0.85rem; }
`;
