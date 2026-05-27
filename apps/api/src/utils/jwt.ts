import { randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { StaffRole } from '@orvexa/shared';
import { config } from '../config.js';
import { UnauthorizedError } from './errors.js';

type SignExpires = SignOptions['expiresIn'];

export type StaffAccessPayload = {
  typ: 'access';
  sub: string;
  rid: string;
  role: StaffRole;
  ver: number;
};

export type StaffRefreshPayload = {
  typ: 'refresh';
  sub: string;
  rid: string;
  jti?: string;
};

export type CustomerSessionPayload = {
  typ: 'customer';
  sid: string;
  rid: string;
  tid: string;
  locale: 'ar' | 'fr' | 'en';
};

function sign<T extends object>(payload: T, secret: string, expiresIn: SignExpires): string {
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });
}

function verify<T>(token: string, secret: string, expectedTyp: string): T {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || decoded === null) {
      throw new UnauthorizedError('Invalid token');
    }
    const typed = decoded as { typ?: unknown };
    if (typed.typ !== expectedTyp) {
      throw new UnauthorizedError('Invalid token type');
    }
    return decoded as T;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw err;
  }
}

export function signStaffAccessToken(
  payload: Omit<StaffAccessPayload, 'typ'>,
  ttl: SignExpires = config.auth.accessTokenTtl as SignExpires,
): string {
  return sign<StaffAccessPayload>({ ...payload, typ: 'access' }, config.auth.jwtSecret, ttl);
}

export function signStaffRefreshToken(
  payload: Omit<StaffRefreshPayload, 'typ'>,
  ttl: SignExpires = config.auth.refreshTokenTtl as SignExpires,
): string {
  // jti ensures each issued token is unique even when iat resolves to the same second,
  // which is required for rotation to reliably invalidate the previous token.
  return sign<StaffRefreshPayload>(
    { ...payload, typ: 'refresh', jti: randomUUID() },
    config.auth.jwtSecret,
    ttl,
  );
}

export function verifyStaffAccessToken(token: string): StaffAccessPayload {
  return verify<StaffAccessPayload>(token, config.auth.jwtSecret, 'access');
}

export function verifyStaffRefreshToken(token: string): StaffRefreshPayload {
  return verify<StaffRefreshPayload>(token, config.auth.jwtSecret, 'refresh');
}

export function signCustomerSessionToken(
  payload: Omit<CustomerSessionPayload, 'typ'>,
  ttl: SignExpires = config.auth.sessionTtl as SignExpires,
): string {
  return sign<CustomerSessionPayload>(
    { ...payload, typ: 'customer' },
    config.auth.sessionSecret,
    ttl,
  );
}

export function verifyCustomerSessionToken(token: string): CustomerSessionPayload {
  return verify<CustomerSessionPayload>(token, config.auth.sessionSecret, 'customer');
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
