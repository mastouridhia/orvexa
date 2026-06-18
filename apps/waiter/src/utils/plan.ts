import { hasCapability, type Capability } from '@orvexa/shared';
import { useAuthStore } from '../store/auth.js';

export function usePlan(): number {
  return useAuthStore((s) => s.plan);
}

/** Returns a `can(capability)` checker bound to the current plan. */
export function useCan(): (cap: Capability) => boolean {
  const plan = usePlan();
  return (cap) => hasCapability(plan, cap);
}
