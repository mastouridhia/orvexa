import { useState } from 'react';
import type { LanguageCode, LocalizedString } from '@orvexa/shared';

const LANGS: LanguageCode[] = ['fr', 'ar', 'en'];

export function TriLangInput({
  value,
  onChange,
  label,
  multiline = false,
}: {
  value: LocalizedString;
  onChange: (next: LocalizedString) => void;
  label: string;
  multiline?: boolean;
}) {
  const [active, setActive] = useState<LanguageCode>('fr');
  const patch = (lang: LanguageCode, v: string) => onChange({ ...value, [lang]: v });
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--fg-soft)' }}>{label}</span>
        <div className="trilang-tabs" style={{ marginInlineStart: 'auto' }}>
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={active === l} onClick={() => setActive(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value[active] ?? ''}
          onChange={(e) => patch(active, e.target.value)}
          dir={active === 'ar' ? 'rtl' : 'ltr'}
        />
      ) : (
        <input
          type="text"
          value={value[active] ?? ''}
          onChange={(e) => patch(active, e.target.value)}
          dir={active === 'ar' ? 'rtl' : 'ltr'}
        />
      )}
    </div>
  );
}
