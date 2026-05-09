import type { Currency, LanguageCode } from '../types/common.js';

export function millimesToDinars(millimes: number): number {
  return millimes / 1000;
}

export function dinarsToMillimes(dinars: number): number {
  return Math.round(dinars * 1000);
}

const LOCALE_BY_LANGUAGE: Record<LanguageCode, string> = {
  ar: 'ar-TN',
  fr: 'fr-TN',
  en: 'en-US',
};

export function formatPrice(
  millimes: number,
  currency: Currency = 'TND',
  language: LanguageCode = 'en',
): string {
  return new Intl.NumberFormat(LOCALE_BY_LANGUAGE[language], {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(millimesToDinars(millimes));
}
