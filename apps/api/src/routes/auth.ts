import { Router } from 'express';
import {
  StaffLoginRequestSchema,
  StaffRefreshRequestSchema,
  type StaffLoginResponse,
} from '@orvexa/shared';
import { AuthService, toStaffUser } from '../services/auth.js';
import { StaffRepository } from '../repositories/staff.js';
import { RestaurantRepository } from '../repositories/restaurant.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const authService = new AuthService();
const staffRepo = new StaffRepository();
const restaurantRepo = new RestaurantRepository();

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  authRateLimit,
  validate({ body: StaffLoginRequestSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, restaurantSlug } = req.body as {
      email: string;
      password: string;
      restaurantSlug?: string;
    };

    let restaurantId: string | undefined;
    if (restaurantSlug) {
      const restaurant = await restaurantRepo.findBySlug(restaurantSlug);
      if (!restaurant) throw new NotFoundError('Restaurant not found');
      restaurantId = restaurant.id;
    }

    const result = await authService.login(email, password, restaurantId);
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
