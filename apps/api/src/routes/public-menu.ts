import { Router } from 'express';
import { MenuService } from '../services/menu.js';
import { RestaurantService } from '../services/restaurant.js';
import { RestaurantRepository } from '../repositories/restaurant.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { NotFoundError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const menuService = new MenuService();
const restaurantService = new RestaurantService();
const restaurantRepo = new RestaurantRepository();

export const publicMenuRouter = Router();

// Table-less, unauthenticated public menu — the link/QR a restaurant shares on
// social media. View-only: it never opens a session or binds a table, so no one
// can order through it regardless of the restaurant's plan. Ordering stays on the
// per-table QR flow (/t/:token).
publicMenuRouter.get(
  '/public/:slug/menu',
  asyncHandler(async (req, res) => {
    const row = await restaurantRepo.findBySlug(req.params.slug);
    if (!row) throw new NotFoundError('Restaurant not found');
    const [restaurant, menu] = await Promise.all([
      restaurantService.get(row.id),
      menuService.getPublicMenu(row.id),
    ]);
    sendSuccess(res, { restaurant, menu });
  }),
);

registerTag('public', 'Unauthenticated public menu (shareable link/QR).');
registerPath('get', '/public/{slug}/menu', {
  summary: 'Public view-only menu by restaurant slug (no session, no ordering)',
  tags: ['public'],
  responses: { '200': { description: 'OK' } },
});
