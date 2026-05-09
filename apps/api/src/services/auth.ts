import type { AuthTokens, StaffRole, StaffUser } from '@orvexa/shared';
import { StaffRepository, type StaffRow } from '../repositories/staff.js';
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

  constructor(staffRepo: StaffRepository = new StaffRepository()) {
    this.staffRepo = staffRepo;
  }

  async login(email: string, password: string, restaurantId?: string): Promise<LoginResult> {
    const row = await this.staffRepo.findActiveByEmail(email, restaurantId);
    if (!row) throw new UnauthorizedError('Invalid credentials');
    const ok = await verifyPassword(row.passwordHash, password);
    if (!ok) throw new UnauthorizedError('Invalid credentials');
    return { ...this.issueTokens(row), user: toStaffUser(row) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyStaffRefreshToken(refreshToken);
    const row = await this.staffRepo.findActiveById(payload.sub);
    if (!row || row.restaurantId !== payload.rid) {
      throw new UnauthorizedError('Refresh token no longer valid');
    }
    return this.issueTokens(row);
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
    });
    const refreshToken = signStaffRefreshToken({ sub: row.id, rid: row.restaurantId });
    return { accessToken, refreshToken };
  }
}
