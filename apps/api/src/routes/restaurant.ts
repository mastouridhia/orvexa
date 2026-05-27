import { Router } from 'express';
import { PatchRestaurantRequestSchema } from '@orvexa/shared';
import { RestaurantService } from '../services/restaurant.js';
import {
  requireAnyAuth,
  requireAuth,
  requireRole,
  resolveRestaurantId,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const service = new RestaurantService();

export const restaurantRouter = Router();

restaurantRouter.get(
  '/restaurant',
  requireAnyAuth,
  asyncHandler(async (req, res) => {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) throw new UnauthorizedError('No restaurant context');
    const restaurant = await service.get(restaurantId);
    sendSuccess(res, restaurant);
  }),
);

restaurantRouter.patch(
  '/restaurant',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: PatchRestaurantRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.patch(req.user.restaurantId, req.body);
    sendSuccess(res, updated);
  }),
);

registerTag('restaurant', 'Restaurant settings.');

const jsonOk = {
  '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } },
};

registerPath('get', '/restaurant', {
  summary: 'Get the caller’s restaurant (staff JWT or customer session)',
  tags: ['restaurant'],
  responses: jsonOk,
});
registerPath('patch', '/restaurant', {
  summary: 'Update restaurant settings (admin/manager)',
  tags: ['restaurant'],
  responses: jsonOk,
});
