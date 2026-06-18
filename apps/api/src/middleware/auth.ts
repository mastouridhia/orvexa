import type { RequestHandler } from 'express';
import { type Capability, hasCapability, type StaffRole } from '@orvexa/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerSessions } from '../db/schema/sessions.js';
import { restaurants } from '../db/schema/restaurants.js';
import { users } from '../db/schema/staff.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import {
  extractBearerToken,
  verifyCustomerSessionToken,
  verifyStaffAccessToken,
} from '../utils/jwt.js';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req.get('authorization'));
  if (!token) return next(new UnauthorizedError('Missing bearer token'));
  try {
    const payload = verifyStaffAccessToken(token);
    // Verify tokenVersion matches DB — rejects stale tokens after role change or disable
    const [row] = await db
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.disabledAt)))
      .limit(1);
    if (!row || row.tokenVersion !== payload.ver) {
      return next(new UnauthorizedError('Token invalidated'));
    }
    req.user = { id: payload.sub, restaurantId: payload.rid, role: payload.role, plan: payload.plan };
    next();
  } catch (err) {
    next(err);
  }
};

export function requireRole(...roles: StaffRole[]): RequestHandler {
  const allowed = new Set(roles);
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (!allowed.has(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' is not allowed for this route`));
    }
    next();
  };
}

/**
 * Gates a route by subscription capability — the server-side counterpart to the
 * frontend `useCan()` checks, so the UI gate can't be bypassed by calling the API
 * directly. Staff requests read the plan from their token; customer-session
 * requests resolve it from the restaurant row. Run AFTER an auth middleware.
 */
export function requireCapability(cap: Capability): RequestHandler {
  return async (req, _res, next) => {
    try {
      let plan = req.user?.plan;
      if (plan === undefined) {
        const restaurantId = resolveRestaurantId(req);
        if (!restaurantId) return next(new UnauthorizedError('Authentication required'));
        const [row] = await db
          .select({ plan: restaurants.plan })
          .from(restaurants)
          .where(eq(restaurants.id, restaurantId))
          .limit(1);
        plan = row?.plan ?? 1;
      }
      if (!hasCapability(plan, cap)) {
        return next(new ForbiddenError('This feature is not included in the restaurant plan'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const requireCustomerSession: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req.get('authorization'));
  if (!token) return next(new UnauthorizedError('Missing bearer token'));
  try {
    const payload = verifyCustomerSessionToken(token);
    const [session] = await db
      .select()
      .from(customerSessions)
      .where(eq(customerSessions.id, payload.sid))
      .limit(1);
    if (!session) return next(new UnauthorizedError('Session not found'));
    const now = Date.now();
    if (session.expiresAt.getTime() <= now || session.absoluteExpiresAt.getTime() <= now) {
      return next(new UnauthorizedError('Session expired'));
    }
    req.customerSession = {
      id: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      tableDayTokenId: session.tableDayTokenId,
      locale: session.locale,
      presenceVerifiedAt: session.presenceVerifiedAt,
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAnyAuth: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req.get('authorization'));
  if (!token) return next(new UnauthorizedError('Missing bearer token'));

  try {
    const payload = verifyStaffAccessToken(token);
    const [row] = await db
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.disabledAt)))
      .limit(1);
    if (!row || row.tokenVersion !== payload.ver) {
      return next(new UnauthorizedError('Token invalidated'));
    }
    req.user = { id: payload.sub, restaurantId: payload.rid, role: payload.role, plan: payload.plan };
    return next();
  } catch {
    // fall through to customer session check
  }

  return requireCustomerSession(req, res, next);
};

export function resolveRestaurantId(req: {
  user?: { restaurantId: string };
  customerSession?: { restaurantId: string };
}): string | null {
  return req.user?.restaurantId ?? req.customerSession?.restaurantId ?? null;
}
