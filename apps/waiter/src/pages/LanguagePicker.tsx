import { useEffect, useRef, useState } from 'react';
import type { LanguageCode } from '@orvexa/shared';
import { setDocumentLocale } from '@orvexa/ui';
import i18n from '../i18n/index.js';

const LANG_OPTIONS: {
  code: LanguageCode;
  label: string;
  sub: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  cta: string;
}[] = [
  { code: 'fr', label: 'Français',  sub: 'French',  flag: '🇫🇷', dir: 'ltr', cta: 'Continuer' },
  { code: 'ar', label: 'العربية',   sub: 'Arabic',  flag: '🇸🇦', dir: 'rtl', cta: 'متابعة'   },
  { code: 'en', label: 'English',   sub: 'English', flag: '🇬🇧', dir: 'ltr', cta: 'Continue'  },
];

export function LanguagePicker({ onConfirm }: { onConfirm: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const active = LANG_OPTIONS[activeIdx]!;

  // Track which slide is snapped into view
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      setActiveIdx(Math.max(0, Math.min(LANG_OPTIONS.length - 1, idx)));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
  };

  const confirm = () => {
    void i18n.changeLanguage(active.code);
    setDocumentLocale(active.code);
    onConfirm();
  };

  return (
    // Always LTR so the carousel scrolls left-to-right regardless of language
    <div className="tf-w-langpick" dir="ltr">
      <div className="tf-w-langpick__header">
        <span className="tf-w-langpick__brand">Orvexa</span>
        <span className="tf-w-langpick__brand-sub">Service</span>
        <p className="tf-w-langpick__polyglot">
          Choisissez · Choose · <span dir="rtl">اختر</span>
        </p>
      </div>

      <div ref={trackRef} className="tf-w-langpick__track">
        {LANG_OPTIONS.map((lang, i) => (
          <div
            key={lang.code}
            className={`tf-w-langpick__slide${activeIdx === i ? ' is-active' : ''}`}
            dir={lang.dir}
          >
            <div className="tf-w-langpick__flag">{lang.flag}</div>
            <h2 className="tf-w-langpick__name">{lang.label}</h2>
            <p className="tf-w-langpick__sub">{lang.sub}</p>
            {activeIdx === i && (
              <div className="tf-w-langpick__check" aria-hidden="true">✓</div>
            )}
          </div>
        ))}
      </div>

      <div className="tf-w-langpick__footer">
        <div className="tf-w-langpick__dots" role="tablist" aria-label="Language">
          {LANG_OPTIONS.map((lang, i) => (
            <button
              key={lang.code}
              type="button"
              role="tab"
              aria-selected={activeIdx === i}
              className={`tf-w-langpick__dot${activeIdx === i ? ' is-active' : ''}`}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="tf-w-langpick__cta"
          dir={active.dir}
          onClick={confirm}
        >
          {active.cta}
          <span className="tf-w-langpick__cta-arrow" aria-hidden="true">
            {active.dir === 'rtl' ? '←' : '→'}
          </span>
        </button>
      </div>
    </div>
  );
}
