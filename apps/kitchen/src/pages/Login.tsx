import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.js';
import { unlockAudio } from '../utils/audio.js';
import { LanguageSelector } from '@orvexa/ui';

export function Login() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.loginError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    unlockAudio(); // user gesture → audio context can play later
    await login(email, password, restaurantSlug.trim() || undefined);
    setBusy(false);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, flex: 1 }}>{t('login.title')}</h2>
          <LanguageSelector />
        </div>
        <form onSubmit={submit}>
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
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
