import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { previewCloseDay, closeDayForRestaurant } from '../services/close-day.js';
import { getBus } from '../realtime/bus.js';

export const closeDayRouter = Router();

closeDayRouter.get(
  '/admin/close-day/preview',
  requireAuth,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const preview = await previewCloseDay(req.user!.restaurantId);
    sendSuccess(res, preview);
  }),
);

closeDayRouter.post(
  '/admin/close-day',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: z.object({}) }),
  asyncHandler(async (req, res) => {
    const result = await closeDayForRestaurant(req.user!.restaurantId);
    getBus().dayClosed(req.user!.restaurantId, result.closedAt);
    sendSuccess(res, result);
  }),
);
