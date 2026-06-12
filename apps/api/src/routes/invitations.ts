import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { db } from '../db/client.js';
import { invitations, restaurants, users } from '../db/schema/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { signStaffAccessToken, signStaffRefreshToken } from '../utils/jwt.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.js';
import { config } from '../config.js';
import ms, { type StringValue } from 'ms';

const tokenRepo = new RefreshTokenRepository();

const AcceptSchema = z.object({
  password: z.string().min(8),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
});

export const invitationsRouter = Router();

invitationsRouter.get(
  '/invitations/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new NotFoundError('Invitation invalid or expired');
    }

    sendSuccess(res, { email: invite.email, restaurantName: invite.restaurantName });
  }),
);

invitationsRouter.post(
  '/invitations/:token/accept',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password, slug } = AcceptSchema.parse(req.body);

    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new NotFoundError('Invitation invalid or expired');
    }

    // Check slug uniqueness
    const existing = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, slug));
    if (existing.length > 0) throw new ConflictError('This URL identifier is already taken');

    // Provision restaurant + admin user atomically
    const [restaurant] = await db
      .insert(restaurants)
      .values({ slug, name: invite.restaurantName })
      .returning();
    if (!restaurant) throw new Error('Failed to create restaurant');

    const passwordHash = await hash(password);
    const [user] = await db
      .insert(users)
      .values({
        restaurantId: restaurant.id,
        email: invite.email,
        name: 'Admin',
        role: 'admin',
        passwordHash,
      })
      .returning();
    if (!user) throw new Error('Failed to create admin user');

    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.token, token));

    // Issue tokens so the client is immediately logged in
    const accessToken = signStaffAccessToken({
      sub: user.id,
      rid: restaurant.id,
      role: 'admin',
      ver: user.tokenVersion,
    });
    const refreshToken = signStaffRefreshToken({ sub: user.id, rid: restaurant.id });
    const ttlMs = ms(config.auth.refreshTokenTtl as StringValue);
    await tokenRepo.store(refreshToken, user.id, new Date(Date.now() + ttlMs));

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        restaurantId: restaurant.id,
        email: user.email,
        name: user.name,
        role: user.role,
        disabledAt: null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  }),
);
