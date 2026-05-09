import type { LanguageCode } from '@orvexa/shared';

export function formatElapsed(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  return `${hr}h${(min % 60).toString().padStart(2, '0')}`;
}

function localeFor(lang: LanguageCode): string {
  return lang === 'ar' ? 'ar-TN' : lang;
}

export function formatDate(iso: string, lang: LanguageCode): string {
  try {
    return new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string, lang: LanguageCode): string {
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
