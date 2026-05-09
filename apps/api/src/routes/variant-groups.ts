import { Router } from 'express';
import { z } from 'zod';
import { UpdateVariantGroupRequestSchema, UuidSchema } from '@orvexa/shared';
import { MenuService } from '../services/menu.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const service = new MenuService();
const IdParams = z.object({ id: UuidSchema });

export const variantGroupsRouter = Router();

variantGroupsRouter.patch(
  '/variant-groups/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams, body: UpdateVariantGroupRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.updateVariantGroup(
      req.user.restaurantId,
      req.params.id,
      req.body,
    );
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, updated);
  }),
);

variantGroupsRouter.delete(
  '/variant-groups/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    await service.deleteVariantGroup(req.user.restaurantId, req.params.id);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, { ok: true });
  }),
);

registerTag('variant-groups', 'Variant group management (modifier groups).');

const okResponses = { '200': { description: 'OK' } };
registerPath('patch', '/variant-groups/{id}', {
  summary: 'Update variant group + diff its variants in a single transaction',
  tags: ['variant-groups'],
  responses: okResponses,
});
registerPath('delete', '/variant-groups/{id}', {
  summary: 'Delete variant group (cascades to variants)',
  tags: ['variant-groups'],
  responses: okResponses,
});
