import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  StaffLoginRequestSchema,
  StaffRefreshRequestSchema,
  type StaffApp,
  type StaffLoginResponse,
} from '@orvexa/shared';
import { AuthService, toStaffUser } from '../services/auth.js';
import { StaffRepository } from '../repositories/staff.js';
import { RestaurantRepository } from '../repositories/restaurant.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit, forgotPasswordCooldown } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { NotFoundError, UnauthorizedError, BadRequestError, ConflictError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { db } from '../db/client.js';
import { passwordResets, users } from '../db/schema/index.js';
import { sendPasswordResetEmail } from '../services/email.js';

const authService = new AuthService();
const staffRepo = new StaffRepository();
const restaurantRepo = new RestaurantRepository();
const refreshTokenRepo = new RefreshTokenRepository();

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  authRateLimit,
  validate({ body: StaffLoginRequestSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, restaurantSlug, app } = req.body as {
      email: string;
      password: string;
      restaurantSlug?: string;
      app?: StaffApp;
    };

    let restaurantId: string | undefined;
    if (restaurantSlug) {
      const restaurant = await restaurantRepo.findBySlug(restaurantSlug);
      if (!restaurant) throw new NotFoundError('Restaurant not found');
      restaurantId = restaurant.id;
    }

    const result = await authService.login(email, password, restaurantId, app);
    const payload: StaffLoginResponse = {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
    sendSuccess(res, payload);
  }),
);

authRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: unknown };
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      await authService.logout(refreshToken);
    }
    sendSuccess(res, { ok: true });
  }),
);

authRouter.post(
  '/auth/refresh',
  authRateLimit,
  validate({ body: StaffRefreshRequestSchema }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens);
  }),
);

authRouter.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const row = await staffRepo.findActiveById(req.user.id);
    if (!row) throw new UnauthorizedError('User not found');
    sendSuccess(res, toStaffUser(row));
  }),
);

// ── Update own profile ────────────────────────────────────────────────────────

const UpdateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
});

authRouter.patch(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const { name, email } = UpdateMeSchema.parse(req.body);
    if (!name && !email) {
      sendSuccess(res, await staffRepo.findActiveById(req.user.id).then((r) => r && toStaffUser(r)));
      return;
    }

    if (email) {
      // Check uniqueness within the restaurant
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.restaurantId, req.user.restaurantId),
            eq(users.email, email.toLowerCase()),
          ),
        )
        .limit(1);
      if (existing.length > 0 && existing[0]!.id !== req.user.id) {
        throw new ConflictError('This email is already used by another account in this restaurant');
      }
    }

    const updated = await staffRepo.update(req.user.id, {
      ...(name ? { name } : {}),
      ...(email ? { email: email.toLowerCase() } : {}),
    });
    if (!updated) throw new UnauthorizedError('User not found');
    sendSuccess(res, toStaffUser(updated));
  }),
);

// ── Forgot / reset password ───────────────────────────────────────────────────

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  restaurantSlug: z.string().optional(),
});

authRouter.post(
  '/auth/forgot-password',
  authRateLimit,
  forgotPasswordCooldown,
  asyncHandler(async (req, res) => {
    const { email, restaurantSlug } = ForgotPasswordSchema.parse(req.body);

    let restaurantId: string | undefined;
    if (restaurantSlug) {
      const restaurant = await restaurantRepo.findBySlug(restaurantSlug);
      if (restaurant) restaurantId = restaurant.id;
    }

    // Always return 200 — don't leak whether the email exists
    const [user] = await db
      .select()
      .from(users)
      .where(
        restaurantId
          ? and(eq(users.email, email.toLowerCase()), eq(users.restaurantId, restaurantId))
          : eq(users.email, email.toLowerCase()),
      )
      .limit(1);

    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing unused tokens for this user
      await db
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)));

      await db.insert(passwordResets).values({ userId: user.id, tokenHash, expiresAt });

      const restaurant = await restaurantRepo.findById(user.restaurantId);
      // Fire-and-forget: the token is already persisted, so don't hold the HTTP
      // response hostage to a slow SMTP round-trip (Gmail handshakes can take
      // 10–15 s). A hung form is what tempts users to re-submit in the first place.
      void sendPasswordResetEmail(user.email, restaurant?.name ?? 'Orvexa', token).catch((err) => {
        console.error('[forgot-password] email send failed', err);
      });
    }

    sendSuccess(res, { ok: true });
  }),
);

authRouter.get(
  '/auth/reset-password/:token',
  asyncHandler(async (req, res) => {
    const tokenHash = createHash('sha256').update(req.params.token).digest('hex');
    const [row] = await db
      .select({ email: users.email })
      .from(passwordResets)
      .innerJoin(users, eq(users.id, passwordResets.userId))
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError('Reset link invalid or expired');
    sendSuccess(res, { email: row.email });
  }),
);

const ResetPasswordSchema = z.object({ password: z.string().min(8) });

authRouter.post(
  '/auth/reset-password/:token',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { password } = ResetPasswordSchema.parse(req.body);
    const tokenHash = createHash('sha256').update(req.params.token).digest('hex');

    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!reset) throw new NotFoundError('Reset link invalid or expired');

    const newHash = await hashPassword(password);
    await Promise.all([
      // Bump tokenVersion to invalidate any existing access tokens — a reset is
      // usually a "I lost control of this account" event, so kill all sessions.
      db
        .update(users)
        .set({ passwordHash: newHash, tokenVersion: sql`${users.tokenVersion} + 1` })
        .where(eq(users.id, reset.userId)),
      db
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, reset.id)),
      // Access tokens are now stale, but a leaked refresh token would re-mint them.
      refreshTokenRepo.deleteAllForUser(reset.userId),
    ]);

    sendSuccess(res, { ok: true });
  }),
);

// ── Change password (logged-in) ───────────────────────────────────────────────

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

authRouter.patch(
  '/auth/me/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

    const row = await staffRepo.findActiveById(req.user.id);
    if (!row) throw new UnauthorizedError('User not found');

    const ok = await verifyPassword(row.passwordHash, currentPassword);
    if (!ok) throw new BadRequestError('Current password is incorrect');

    const newHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.id));

    sendSuccess(res, { ok: true });
  }),
);

registerTag('auth', 'Staff authentication.');

const jsonOk = {
  '200': {
    description: 'OK',
    content: { 'application/json': { schema: { type: 'object' } } },
  },
};

registerPath('post', '/auth/login', {
  summary: 'Staff login (email + password)',
  tags: ['auth'],
  responses: jsonOk,
});
registerPath('post', '/auth/logout', {
  summary: 'Stateless logout acknowledgement (client discards tokens)',
  tags: ['auth'],
  responses: jsonOk,
});
registerPath('post', '/auth/refresh', {
  summary: 'Exchange a refresh token for a new access/refresh pair',
  tags: ['auth'],
  responses: jsonOk,
});
registerPath('get', '/auth/me', {
  summary: 'Current authenticated staff user',
  tags: ['auth'],
  responses: jsonOk,
});
