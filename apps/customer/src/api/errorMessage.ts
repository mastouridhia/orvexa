import type { TFunction } from 'i18next';
import { ApiError } from './client.js';
import { useSessionStore } from '../store/session.js';

export function isSessionExpiredError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof ApiError && err.code === 'NETWORK') return true;
  return false;
}

/**
 * Translates an API error for display. On 401 the local session is cleared
 * so the app falls back to the QR-scan prompt, and the message becomes the
 * "scan QR to get back in" copy regardless of the backend wording.
 */
export function handleApiError(err: unknown, t: TFunction): string {
  if (isSessionExpiredError(err)) {
    useSessionStore.getState().clear();
    return t('errors.sessionExpired');
  }
  if (isNetworkError(err)) {
    return t('errors.offline');
  }
  if (err instanceof ApiError) return err.message;
  return (err as Error).message ?? t('errors.title');
}
