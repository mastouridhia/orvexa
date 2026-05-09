import type { LanguageCode } from '@orvexa/shared';

export function setDocumentLocale(lang: LanguageCode): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
