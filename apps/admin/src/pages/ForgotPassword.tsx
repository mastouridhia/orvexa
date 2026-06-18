import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await api.forgotPassword(email.trim(), restaurantSlug.trim() || undefined);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Un lien a déjà été demandé récemment. Patientez une minute avant de réessayer.');
      } else {
        setError('Une erreur est survenue. Réessayez dans quelques instants.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Vérifiez vos e-mails</h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Si un compte correspond à <strong>{email}</strong>, vous recevrez un lien de
            réinitialisation valable <strong>1 heure</strong>.
          </p>
          <Link to="/" style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h2 style={{ marginBottom: '0.25rem' }}>Mot de passe oublié</h2>
        <p style={{ margin: '0 0 1.25rem', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
          Saisissez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.
        </p>
        <form onSubmit={submit} noValidate>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@restaurant.tn"
            />
          </label>
          <label>
            Identifiant restaurant{' '}
            <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>(optionnel)</span>
            <input
              type="text"
              autoComplete="organization"
              value={restaurantSlug}
              onChange={(e) => setRestaurantSlug(e.target.value)}
              placeholder="mon-restaurant"
            />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || !canSubmit}
          >
            {busy ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
          <Link to="/" style={{ color: 'var(--accent)' }}>
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
