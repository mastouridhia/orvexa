import ms, { type StringValue } from 'ms';
import type { AuthTokens, StaffRole, StaffUser } from '@orvexa/shared';
import { config } from '../config.js';
import { StaffRepository, type StaffRow } from '../repositories/staff.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.js';
import { UnauthorizedError } from '../utils/errors.js';
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

  constructor(
    staffRepo: StaffRepository = new StaffRepository(),
    tokenRepo: RefreshTokenRepository = new RefreshTokenRepository(),
  ) {
    this.staffRepo = staffRepo;
    this.tokenRepo = tokenRepo;
  }

  async login(email: string, password: string, restaurantId?: string): Promise<LoginResult> {
    const row = await this.staffRepo.findActiveByEmail(email, restaurantId);
    if (!row) throw new UnauthorizedError('Invalid credentials');
    const ok = await verifyPassword(row.passwordHash, password);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    const tokens = this.issueTokens(row);
    const ttlMs = ms(config.auth.refreshTokenTtl as StringValue);
    // Persist hash; lazily clean up this user's expired tokens in parallel
    await Promise.all([
      this.tokenRepo.store(tokens.refreshToken, row.id, new Date(Date.now() + ttlMs)),
      this.tokenRepo.deleteExpiredForUser(row.id),
    ]);

    return { ...tokens, user: toStaffUser(row) };
  }

  async logout(refreshToken: string): Promise<void> {
    // Best-effort — silently ignore if token is already expired or unknown
    await this.tokenRepo.revoke(refreshToken);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyStaffRefreshToken(refreshToken);

    const [row, tokenExists] = await Promise.all([
      this.staffRepo.findActiveById(payload.sub),
      this.tokenRepo.exists(refreshToken),
    ]);

    if (!row || row.restaurantId !== payload.rid) {
      throw new UnauthorizedError('Refresh token no longer valid');
    }
    if (!tokenExists) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    // Rotate: revoke old token, issue and persist new one
    const tokens = this.issueTokens(row);
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

  private issueTokens(row: StaffRow): AuthTokens {
    const accessToken = signStaffAccessToken({
      sub: row.id,
      rid: row.restaurantId,
      role: row.role as StaffRole,
      ver: row.tokenVersion,
    });
    const refreshToken = signStaffRefreshToken({ sub: row.id, rid: row.restaurantId });
    return { accessToken, refreshToken };
  }
}
