import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/queries.js';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('Lien invalide.');
      return;
    }
    api
      .getResetToken(token)
      .then((data) => setEmail(data.email))
      .catch(() => setLoadError('Ce lien de réinitialisation est invalide ou a expiré.'));
  }, [token]);

  const canSubmit = password.length >= 8 && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await api.resetPassword(token, password);
      setDone(true);
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
          <Link to="/forgot-password" style={{ color: 'var(--accent)' }}>
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>
          Vérification du lien…
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Mot de passe mis à jour</h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h2 style={{ marginBottom: '0.25rem' }}>Nouveau mot de passe</h2>
        <p style={{ margin: '0 0 1.25rem', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
          Compte : <strong>{email}</strong>
        </p>
        <form onSubmit={submit} noValidate>
          <label>
            Nouveau mot de passe{' '}
            <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>(8 caractères min.)</span>
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
          {error && <div className="error-banner">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || !canSubmit}
          >
            {busy ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
