import { describe, it, expect, beforeEach } from 'vitest';
import { resetTransactionalState } from '../helpers/db.js';
import { AuthService } from '../../src/services/auth.js';
import { UnauthorizedError } from '../../src/utils/errors.js';
import { verifyStaffAccessToken, verifyStaffRefreshToken } from '../../src/utils/jwt.js';

describe('AuthService', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('logs in a staff user with correct credentials and returns matching tokens', async () => {
    const auth = new AuthService();
    const result = await auth.login('admin@demo.tn', 'orvexa');
    expect(result.user.email).toBe('admin@demo.tn');
    expect(result.user.role).toBe('admin');
    expect(result.user.disabledAt).toBeNull();

    const access = verifyStaffAccessToken(result.accessToken);
    expect(access.sub).toBe(result.user.id);
    expect(access.role).toBe('admin');
    expect(access.rid).toBe(result.user.restaurantId);

    const refresh = verifyStaffRefreshToken(result.refreshToken);
    expect(refresh.sub).toBe(result.user.id);
  });

  it('rejects a wrong password with UnauthorizedError', async () => {
    const auth = new AuthService();
    await expect(auth.login('admin@demo.tn', 'nope')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an unknown email with UnauthorizedError', async () => {
    const auth = new AuthService();
    await expect(auth.login('nobody@demo.tn', 'orvexa')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('refresh issues new tokens for a valid refresh token', async () => {
    const auth = new AuthService();
    const first = await auth.login('manager@demo.tn', 'orvexa');
    const next = await auth.refresh(first.refreshToken);
    expect(next.accessToken).toBeTypeOf('string');
    expect(next.refreshToken).toBeTypeOf('string');
    const access = verifyStaffAccessToken(next.accessToken);
    expect(access.role).toBe('manager');
  });

  it('refresh rejects a access-typ token (cross-typ attack)', async () => {
    const auth = new AuthService();
    const first = await auth.login('admin@demo.tn', 'orvexa');
    await expect(auth.refresh(first.accessToken)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('me returns the current user', async () => {
    const auth = new AuthService();
    const first = await auth.login('kitchen@demo.tn', 'orvexa');
    const u = await auth.me(first.user.id);
    expect(u.email).toBe('kitchen@demo.tn');
    expect(u.role).toBe('kitchen');
  });

  it('me throws when the user id is unknown', async () => {
    const auth = new AuthService();
    await expect(auth.me('00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
