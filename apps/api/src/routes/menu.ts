import { Router } from 'express';
import { MenuService } from '../services/menu.js';
import { requireAnyAuth, resolveRestaurantId } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const service = new MenuService();

export const menuRouter = Router();

menuRouter.get(
  '/menu',
  requireAnyAuth,
  asyncHandler(async (req, res) => {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) throw new UnauthorizedError('No restaurant context');
    const tree = await service.getPublicMenu(restaurantId);
    sendSuccess(res, tree);
  }),
);

registerTag('menu', 'Public menu read (filtered to active categories + available dishes).');
registerPath('get', '/menu', {
  summary: 'Public menu tree (categories → dishes → variant groups → variants)',
  tags: ['menu'],
  responses: { '200': { description: 'OK' } },
});
