import { Router } from 'express';
import { eq } from 'drizzle-orm';
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
import { db } from '../db/index.js';
import { orders } from '../db/schema/orders.js';
import { feedback } from '../db/schema/feedback.js';
import { payments } from '../db/schema/payments.js';

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

restaurantRouter.delete(
  '/restaurant/operational-data',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const { restaurantId } = req.user;

    const result = await db.transaction(async (tx) => {
      const deletedFeedback = await tx
        .delete(feedback)
        .where(eq(feedback.restaurantId, restaurantId))
        .returning({ id: feedback.id });

      const deletedPayments = await tx
        .delete(payments)
        .where(eq(payments.restaurantId, restaurantId))
        .returning({ id: payments.id });

      const deletedOrders = await tx
        .delete(orders)
        .where(eq(orders.restaurantId, restaurantId))
        .returning({ id: orders.id });

      return {
        deletedOrders: deletedOrders.length,
        deletedPayments: deletedPayments.length,
        deletedFeedback: deletedFeedback.length,
      };
    });

    sendSuccess(res, result);
  }),
);

registerPath('delete', '/restaurant/operational-data', {
  summary: 'Wipe all orders, payments and feedback for the restaurant (admin only)',
  tags: ['restaurant'],
  responses: jsonOk,
});
