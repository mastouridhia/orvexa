// Set by the Orvexa platform admin when it opens a client's dashboard via "Voir".
// Holds the impersonated restaurant's name so the app can show a banner and offer a
// way back to the platform. Cleared on logout / return-to-platform.
export const IMPERSONATION_KEY = 'orvexa.platform.impersonating';

export function getImpersonating(): string | null {
  return sessionStorage.getItem(IMPERSONATION_KEY);
}

export function clearImpersonating(): void {
  sessionStorage.removeItem(IMPERSONATION_KEY);
}
