import type { RequestHandler } from 'express';
import type { StaffRole } from '@orvexa/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerSessions } from '../db/schema/sessions.js';
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
    req.user = { id: payload.sub, restaurantId: payload.rid, role: payload.role };
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
    if (session.expiresAt.getTime() <= Date.now()) {
      return next(new UnauthorizedError('Session expired'));
    }
    req.customerSession = {
      id: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      tableDayTokenId: session.tableDayTokenId,
      locale: session.locale,
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
    req.user = { id: payload.sub, restaurantId: payload.rid, role: payload.role };
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
