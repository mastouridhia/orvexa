import { hasCapability, type Capability } from '@orvexa/shared';
import { useSessionStore } from '../store/session.js';

export function usePlan(): number {
  return useSessionStore((s) => s.restaurant?.plan ?? 1);
}

/** Returns a `can(capability)` checker bound to the current plan. */
export function useCan(): (cap: Capability) => boolean {
  const plan = usePlan();
  return (cap) => hasCapability(plan, cap);
}

/**
 * True when the app should render the menu read-only (no cart, ordering, waiter
 * or bill). This is the case either when the plan lacks ordering, or when the
 * customer arrived through the shared public menu link (`/m/:slug`), which never
 * opens a table session.
 */
export function useMenuOnly(): boolean {
  const preview = useSessionStore((s) => s.previewSlug !== null);
  const canOrder = useCan()('ordering.customer');
  return preview || !canOrder;
}
