import { useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export function PlatformAdmin() {
  const [platformKey, setPlatformKey] = useState(
    () => sessionStorage.getItem('orvexa.platform.key') ?? '',
  );
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const saveKey = (k: string) => {
    setPlatformKey(k);
    sessionStorage.setItem('orvexa.platform.key', k);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/platform/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform-key': platformKey,
        },
        body: JSON.stringify({ email, restaurantName }),
      });
      const json = (await res.json()) as { data?: { message?: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setResult({ ok: true, message: json.data?.message ?? `Invitation envoyée à ${email}` });
      setEmail('');
      setRestaurantName('');
    } catch (err: unknown) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Erreur inconnue' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 480, width: '100%' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>Orvexa — Inviter un client</h2>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
          Accès réservé à l&apos;équipe Orvexa.
        </p>

        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <label>
            Clé plateforme
            <input
              type="password"
              autoComplete="off"
              required
              value={platformKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="PLATFORM_SECRET"
            />
          </label>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0.25rem 0' }} />

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

          {result && (
            <div
              className={result.ok ? undefined : 'error-banner'}
              style={
                result.ok
                  ? {
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                    }
                  : undefined
              }
            >
              {result.message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || !platformKey || !email || !restaurantName}
          >
            {busy ? 'Envoi en cours…' : 'Envoyer l\'invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}
