import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiBaseUrl } from '../api/client.js';
import { useAuthStore } from '../store/auth.js';
import { IconCheck, IconQr } from './tf-icons.js';

/**
 * The shared, view-only public menu QR + link (e.g. for the café's Instagram
 * bio). Scanning/visiting it opens the menu read-only — it never starts an
 * ordering session, so it's safe to post publicly regardless of plan.
 */
export function ShareableMenu() {
  const { t } = useTranslation();
  const authedFetch = useAuthStore((s) => s.authedFetch);
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { body, qrUrl } = await authedFetch(async (token) => {
          const res = await fetch(`${apiBaseUrl}/restaurant/menu-qr?format=svg`, {
            headers: { authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('menu-qr failed');
          return { body: await res.text(), qrUrl: res.headers.get('x-qr-url') };
        });
        if (cancelled) return;
        setSvg(body);
        setUrl(qrUrl);
      } catch {
        if (!cancelled) setError(t('settings.shareMenuError'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, t]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the link is still visible to copy manually */
    }
  };

  const downloadPng = async () => {
    try {
      const blob = await authedFetch(async (token) => {
        const res = await fetch(`${apiBaseUrl}/restaurant/menu-qr?format=png`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('menu-qr png failed');
        return res.blob();
      });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'menu-qr.png';
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setError(t('settings.shareMenuError'));
    }
  };

  return (
    <section className="tf-a-settings__section">
      <div className="tf-a-settings__section-head">
        <span className="tf-a-settings__section-icon">
          <IconQr />
        </span>
        <div>
          <div className="tf-a-settings__section-title">{t('settings.shareMenuTitle')}</div>
          <div className="tf-a-settings__section-sub">{t('settings.shareMenuSub')}</div>
        </div>
      </div>
      <div className="tf-a-settings__section-body">
        {error ? <div className="error-banner" style={{ marginBottom: '0.75rem' }}>{error}</div> : null}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{ width: 132, height: 132, flexShrink: 0 }}
            aria-hidden="true"
            dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 220, flex: 1 }}>
            {url ? (
              <code
                style={{
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                }}
              >
                {url}
              </code>
            ) : null}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={copy} disabled={!url}>
                {copied ? <IconCheck size={14} /> : null}
                {copied ? t('settings.shareMenuCopied') : t('settings.shareMenuCopy')}
              </button>
              <button type="button" className="btn" onClick={downloadPng} disabled={!svg}>
                {t('settings.shareMenuDownload')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
