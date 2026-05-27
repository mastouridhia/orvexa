import { and, eq, isNull } from 'drizzle-orm';
import type { StaffRole } from '@orvexa/shared';
import { db } from '../db/index.js';
import { customerSessions } from '../db/schema/sessions.js';
import { users } from '../db/schema/staff.js';
import { verifyCustomerSessionToken, verifyStaffAccessToken } from '../utils/jwt.js';

export type StaffIdentity = {
  kind: 'staff';
  userId: string;
  restaurantId: string;
  role: StaffRole;
};

export type CustomerIdentity = {
  kind: 'customer';
  sessionId: string;
  restaurantId: string;
  tableId: string;
  locale: 'ar' | 'fr' | 'en';
};

export type SocketIdentity = StaffIdentity | CustomerIdentity;

type RawHandshake = {
  auth?: Record<string, unknown>;
  headers?: Record<string, unknown>;
};

function readToken(handshake: RawHandshake): string | null {
  const fromAuth = handshake.auth?.['token'];
  if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;
  const header = handshake.headers?.['authorization'];
  if (typeof header === 'string') {
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && value) return value;
  }
  return null;
}

export async function resolveHandshakeIdentity(handshake: RawHandshake): Promise<SocketIdentity> {
  const token = readToken(handshake);
  if (!token) throw new Error('Missing auth token');

  let isStaffToken = false;
  try {
    const staff = verifyStaffAccessToken(token);
    isStaffToken = true;
    const [row] = await db
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(and(eq(users.id, staff.sub), isNull(users.disabledAt)))
      .limit(1);
    if (!row || row.tokenVersion !== staff.ver) throw new Error('Token revoked');
    return {
      kind: 'staff',
      userId: staff.sub,
      restaurantId: staff.rid,
      role: staff.role,
    };
  } catch (err) {
    if (isStaffToken) throw err; // DB check failed — reject, don't fall through to customer path
    // JWT parse failed — this isn't a staff token, try customer path
  }

  const customer = verifyCustomerSessionToken(token);
  const [session] = await db
    .select()
    .from(customerSessions)
    .where(eq(customerSessions.id, customer.sid))
    .limit(1);
  if (!session) throw new Error('Session not found');
  if (session.expiresAt.getTime() <= Date.now()) throw new Error('Session expired');

  return {
    kind: 'customer',
    sessionId: session.id,
    restaurantId: session.restaurantId,
    tableId: session.tableId,
    locale: session.locale,
  };
}
