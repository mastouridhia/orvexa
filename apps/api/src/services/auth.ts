import ms, { type StringValue } from 'ms';
import type { AuthTokens, StaffApp, StaffRole, StaffUser } from '@orvexa/shared';
import { roleAllowedForApp } from '@orvexa/shared';
import { config } from '../config.js';
import { StaffRepository, type StaffRow } from '../repositories/staff.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.js';
import { RestaurantRepository } from '../repositories/restaurant.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { verifyPassword } from '../utils/password.js';
import {
  signStaffAccessToken,
  signStaffRefreshToken,
  verifyStaffRefreshToken,
} from '../utils/jwt.js';

export type LoginResult = AuthTokens & { user: StaffUser };

export function toStaffUser(row: StaffRow): StaffUser {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    email: row.email,
    name: row.name,
    role: row.role as StaffRole,
    disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class AuthService {
  private readonly staffRepo: StaffRepository;
  private readonly tokenRepo: RefreshTokenRepository;
  private readonly restaurantRepo: RestaurantRepository;

  constructor(
    staffRepo: StaffRepository = new StaffRepository(),
    tokenRepo: RefreshTokenRepository = new RefreshTokenRepository(),
    restaurantRepo: RestaurantRepository = new RestaurantRepository(),
  ) {
    this.staffRepo = staffRepo;
    this.tokenRepo = tokenRepo;
    this.restaurantRepo = restaurantRepo;
  }

  async login(
    email: string,
    password: string,
    restaurantId?: string,
    app?: StaffApp,
  ): Promise<LoginResult> {
    const row = await this.staffRepo.findActiveByEmail(email, restaurantId);
    if (!row) throw new UnauthorizedError('Invalid credentials');

    // Check account lockout
    if (row.lockedUntil && row.lockedUntil > new Date()) {
      const remainingMs = row.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60_000);
      throw new UnauthorizedError(
        `Account temporarily locked. Try again in ${remainingMins} minute${remainingMins === 1 ? '' : 's'}.`,
      );
    }

    const ok = await verifyPassword(row.passwordHash, password);
    if (!ok) {
      await this.staffRepo.recordFailedLogin(row.id);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Successful login — clear any previous failed attempts
    if (row.failedLoginAttempts > 0) {
      await this.staffRepo.clearLoginAttempts(row.id);
    }

    // Strict per-app account separation: a valid credential can only sign in to
    // the app that matches its role. Checked after the password so we never
    // reveal account/role existence to an unauthenticated caller.
    if (app && !roleAllowedForApp(row.role as StaffRole, app)) {
      throw new ForbiddenError(`This account can't sign in to the ${app} app.`);
    }

    const restaurant = await this.restaurantRepo.findById(row.restaurantId);
    const plan = restaurant?.plan ?? 1;

    const tokens = this.issueTokens(row, plan);
    const ttlMs = ms(config.auth.refreshTokenTtl as StringValue);
    // Persist hash; lazily clean up this user's expired tokens in parallel
    await Promise.all([
      this.tokenRepo.store(tokens.refreshToken, row.id, new Date(Date.now() + ttlMs)),
      this.tokenRepo.deleteExpiredForUser(row.id),
    ]);

    return { ...tokens, user: toStaffUser(row) };
  }

  /**
   * Mint a staff session for a restaurant's admin user without a password — used by the
   * Orvexa platform team (gated behind the platform key at the route level) to view an
   * account exactly as its owner sees it. Skips lockout/failed-attempt bookkeeping.
   */
  async impersonate(restaurantId: string): Promise<LoginResult> {
    const row = await this.staffRepo.findAdminByRestaurant(restaurantId);
    if (!row) throw new NotFoundError('No admin account for this restaurant');

    const restaurant = await this.restaurantRepo.findById(restaurantId);
    const plan = restaurant?.plan ?? 1;

    const tokens = this.issueTokens(row, plan);
    const ttlMs = ms(config.auth.refreshTokenTtl as StringValue);
    await this.tokenRepo.store(tokens.refreshToken, row.id, new Date(Date.now() + ttlMs));

    return { ...tokens, user: toStaffUser(row) };
  }

  async logout(refreshToken: string): Promise<void> {
    let userId: string | undefined;
    try {
      userId = verifyStaffRefreshToken(refreshToken).sub;
    } catch {
      // Expired or malformed token — still revoke the hash if it's in the DB
    }
    await Promise.all([
      this.tokenRepo.revoke(refreshToken),
      // Bump tokenVersion so the outstanding access token is rejected immediately
      userId ? this.staffRepo.bumpTokenVersion(userId) : Promise.resolve(),
    ]);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyStaffRefreshToken(refreshToken);

    const [row, tokenExists, restaurant] = await Promise.all([
      this.staffRepo.findActiveById(payload.sub),
      this.tokenRepo.exists(refreshToken),
      this.restaurantRepo.findById(payload.rid),
    ]);

    if (!row || row.restaurantId !== payload.rid) {
      throw new UnauthorizedError('Refresh token no longer valid');
    }
    if (!tokenExists) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    const plan = restaurant?.plan ?? 1;

    // Rotate: revoke old token, issue and persist new one
    const tokens = this.issueTokens(row, plan);
    const ttlMs = ms(config.auth.refreshTokenTtl as StringValue);
    await Promise.all([
      this.tokenRepo.revoke(refreshToken),
      this.tokenRepo.store(tokens.refreshToken, row.id, new Date(Date.now() + ttlMs)),
    ]);

    return tokens;
  }

  async me(userId: string): Promise<StaffUser> {
    const row = await this.staffRepo.findActiveById(userId);
    if (!row) throw new UnauthorizedError('User not found');
    return toStaffUser(row);
  }

  private issueTokens(row: StaffRow, plan: number): AuthTokens {
    const accessToken = signStaffAccessToken({
      sub: row.id,
      rid: row.restaurantId,
      role: row.role as StaffRole,
      ver: row.tokenVersion,
      plan,
    });
    const refreshToken = signStaffRefreshToken({ sub: row.id, rid: row.restaurantId });
    return { accessToken, refreshToken };
  }
}
