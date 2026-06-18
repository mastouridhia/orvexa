import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuthStore } from '../store/auth.js';
import type { StaffUser } from '@orvexa/shared';

type InviteInfo = { email: string; restaurantName: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function Setup() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [slug, setSlug] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoadError('Lien invalide.');
      return;
    }
    apiRequest<InviteInfo>(`/invitations/${token}`)
      .then((data) => {
        setInvite(data);
        setSlug(slugify(data.restaurantName));
      })
      .catch(() => setLoadError("Ce lien d'invitation est invalide ou a expiré."));
  }, [token]);

  const canSubmit =
    password.length >= 8 &&
    password === confirm &&
    /^[a-z0-9-]{2,40}$/.test(slug) &&
    acceptedTerms;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: StaffUser;
      }>(`/invitations/${token}/accept`, {
        method: 'POST',
        body: { password, slug, acceptedTerms },
      });
      setSession(result.accessToken, result.refreshToken, result.user);
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--danger, #dc2626)', marginBottom: '1rem' }}>{loadError}</p>
          <a href="/" style={{ color: 'var(--accent)' }}>
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>
          Chargement…
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h2>Configurez votre compte</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
          Restaurant : <strong>{invite.restaurantName}</strong>
          <br />
          Email : {invite.email}
        </p>
        <form onSubmit={submit} noValidate>
          <label>
            Mot de passe <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>(8 caractères min.)</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirmer le mot de passe
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm && password !== confirm && (
              <span style={{ color: 'var(--danger, #dc2626)', fontSize: '0.8rem' }}>
                Les mots de passe ne correspondent pas.
              </span>
            )}
          </label>
          <label>
            Identifiant URL{' '}
            <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
              (lettres, chiffres, tirets)
            </span>
            <input
              type="text"
              autoComplete="off"
              required
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
            />
            {slug && (
              <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
                Vos employés se connecteront avec : <strong>{slug}</strong>
              </span>
            )}
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: '0.5rem',
              fontSize: '0.85rem',
              margin: '0.5rem 0',
            }}
          >
            <input
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ width: 'auto', marginTop: '0.15rem' }}
            />
            <span>
              J&apos;ai lu et j&apos;accepte les{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                Conditions d&apos;utilisation
              </a>{' '}
              et la{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                Politique de confidentialité
              </a>{' '}
              d&apos;Orvexa.
            </span>
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || !canSubmit}
          >
            {busy ? 'Création en cours…' : 'Créer mon compte et me connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
