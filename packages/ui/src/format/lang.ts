import type { LanguageCode, LocalizedString } from '@orvexa/shared';

export function pickLang(s: LocalizedString | null | undefined, lang: LanguageCode): string {
  if (!s) return '';
  return s[lang] || s.fr || s.en || s.ar || '';
}
