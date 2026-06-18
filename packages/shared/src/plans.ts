/**
 * Plan tiers & capability gating — single source of truth.
 *
 * Orvexa has 4 subscription tiers (see PLANS.md). Tiers are inclusive upward:
 * a higher tier has every capability of the tiers below it. Feature access is
 * expressed as named capabilities mapped to the minimum tier that unlocks them,
 * so a feature only ever moves between tiers in `CAPABILITY_MIN_TIER`.
 */

export type PlanTier = 1 | 2 | 3 | 4;

export const PLAN_NAMES: Record<PlanTier, string> = {
  1: 'Essentiel',
  2: 'Plus',
  3: 'Pro',
  4: 'Premium',
};

/** Display pricing in TND. Monthly is primary; yearly shown as a "billed yearly" note. */
export const PLAN_PRICING: Record<PlanTier, { monthly: number; yearly: number | null }> = {
  1: { monthly: 19, yearly: 190 },
  2: { monthly: 79, yearly: 790 },
  3: { monthly: 149, yearly: 1490 },
  4: { monthly: 499, yearly: null }, // custom / quote-based
};

export type Capability =
  // Menu & QR — tier 1+
  | 'menu.view'
  | 'menu.edit'
  | 'menu.theme'
  | 'menu.multilang'
  | 'menu.info'
  | 'qr.generate'
  | 'analytics.views'
  // Ordering — tier 2+
  | 'ordering.customer'
  | 'ordering.inbox'
  | 'customer.call_staff'
  | 'customer.request_bill'
  | 'analytics.sales_basic'
  // Pro operations — tier 3+
  | 'staff.basic'
  | 'kitchen.kds'
  | 'waiter.app'
  | 'tables.advanced'
  | 'bills.split'
  | 'staff.roles_full'
  | 'analytics.advanced'
  | 'feedback'
  | 'inventory'
  // Premium / hospitality — tier 4
  | 'zones.multi'
  | 'room_service'
  | 'bill_to_room'
  | 'analytics.by_zone';

/** Minimum tier required for each capability. The ONLY place a feature changes tier. */
export const CAPABILITY_MIN_TIER: Record<Capability, PlanTier> = {
  // Menu & QR
  'menu.view': 1,
  'menu.edit': 1,
  'menu.theme': 1,
  'menu.multilang': 1,
  'menu.info': 1,
  'qr.generate': 1,
  'analytics.views': 1,
  // Ordering
  'ordering.customer': 2,
  'ordering.inbox': 2,
  'customer.call_staff': 2,
  'customer.request_bill': 2,
  'analytics.sales_basic': 2,
  // Pro operations
  'staff.basic': 3,
  'kitchen.kds': 3,
  'waiter.app': 3,
  'tables.advanced': 3,
  'bills.split': 3,
  'staff.roles_full': 3,
  'analytics.advanced': 3,
  feedback: 3,
  inventory: 3,
  // Premium / hospitality
  'zones.multi': 4,
  'room_service': 4,
  'bill_to_room': 4,
  'analytics.by_zone': 4,
};

/**
 * Included table quota per tier (see PLANS.md §8). Tables are gated by **count**,
 * not a boolean capability, so the limit lives here rather than in
 * `CAPABILITY_MIN_TIER`. `null` = unlimited. A per-restaurant `extraTables`
 * override (purchased overage) is added on top of the tier quota.
 *
 * Tier 1 (Essentiel) is menu-only/single-QR — a "table" has no order to bind to —
 * so its count is cosmetic; it shares the Plus quota to avoid surprising owners.
 */
export const TABLE_QUOTA: Record<PlanTier, number | null> = {
  1: 30,
  2: 30,
  3: 150,
  4: null, // unlimited — hotels/venues scale by zone, not table cap
};

/**
 * Effective table limit for a restaurant: tier quota + purchased overage.
 * Returns `null` for an unlimited plan (no cap should be enforced).
 */
export function tableLimit(plan: number | null | undefined, extraTables = 0): number | null {
  const base = TABLE_QUOTA[normalizePlan(plan)];
  if (base === null) return null;
  return base + Math.max(0, Math.trunc(extraTables));
}

/** Clamp any incoming number to a valid tier (defaults to 1 for bad input). */
export function normalizePlan(plan: number | null | undefined): PlanTier {
  if (plan === 2 || plan === 3 || plan === 4) return plan;
  return 1;
}

/** Does this plan unlock the given capability? */
export function hasCapability(plan: number | null | undefined, cap: Capability): boolean {
  return normalizePlan(plan) >= CAPABILITY_MIN_TIER[cap];
}

/** The tier a user must reach to unlock `cap` — for "Upgrade to {tier}" upsell copy. */
export function tierFor(cap: Capability): PlanTier {
  return CAPABILITY_MIN_TIER[cap];
}
