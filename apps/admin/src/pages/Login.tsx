import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.js';
import { LanguageSelector } from '@orvexa/ui';

export function Login() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.loginError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    await login(email.trim(), password, restaurantSlug.trim() || undefined);
    setBusy(false);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}
        >
          <h2 style={{ margin: 0, flex: 1 }}>{t('login.title')}</h2>
          <LanguageSelector />
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            {t('login.email')}
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t('login.password')}
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            {t('login.restaurant')}
            <input
              type="text"
              autoComplete="organization"
              placeholder="demo"
              value={restaurantSlug}
              onChange={(e) => setRestaurantSlug(e.target.value)}
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !canSubmit}>
            {busy ? t('login.submitting') : t('login.submit')}
          </button>
          <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <Link to="/forgot-password" style={{ color: 'var(--accent)' }}>
              Mot de passe oublié ?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
