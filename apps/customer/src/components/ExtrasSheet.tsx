import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey, useFocusTrap } from '@orvexa/ui';
import { handleApiError } from '../api/errorMessage.js';
import { api } from '../api/queries.js';
import { useSessionStore } from '../store/session.js';

const PRESETS = [
  'fork',
  'spoon',
  'knife',
  'napkin',
  'straw',
  'water',
  'condiments',
  'cleaning',
] as const;

export function ExtrasSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const toggle = (key: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = async () => {
    if (!token || !session) return;
    if (selected.size === 0 && note.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const items = Array.from(selected).map((k) => t(`extras.items.${k}`));
      await api.requestExtras(token, session.tableId, {
        items,
        note: note.trim() || undefined,
      });
      setSent(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(handleApiError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const empty = selected.size === 0 && note.trim().length === 0;

  return (
    <>
      <div className="tf-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="tf-extras-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="extras-title"
      >
        <div className="tf-cartsheet__grabber" aria-hidden="true">
          <span />
        </div>
        <header className="tf-extras-sheet__head">
          <h2 id="extras-title" className="tf-extras-sheet__title">
            <span>{t('extras.title')}</span>{' '}
            <span className="tf-display">{t('extras.titleEm')}</span>
          </h2>
          <button
            type="button"
            className="tf-cartsheet__close"
            aria-label={t('cart.back')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="tf-extras-sheet__body">
          {sent ? (
            <div className="tf-extras-sheet__sent" role="status">
              <div className="tf-extras-sheet__sent-title">{t('extras.sentTitle')}</div>
              <div className="tf-extras-sheet__sent-sub">{t('extras.sentSub')}</div>
            </div>
          ) : (
            <>
              <p className="tf-extras-sheet__hint">{t('extras.hint')}</p>
              <div className="tf-extras-sheet__chips" role="group">
                {PRESETS.map((key) => {
                  const active = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`tf-extras-sheet__chip${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => toggle(key)}
                    >
                      {t(`extras.items.${key}`)}
                    </button>
                  );
                })}
              </div>
              <label className="tf-extras-sheet__note">
                <span>{t('extras.noteLabel')}</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('extras.notePlaceholder')}
                  maxLength={280}
                />
              </label>
              {error ? <div className="error-banner">{error}</div> : null}
              <button
                type="button"
                className="tf-extras-sheet__cta"
                disabled={busy || empty}
                onClick={submit}
              >
                {busy ? t('actions.calling') : t('extras.submit')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
