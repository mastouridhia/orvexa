import { Router } from 'express';
import { z } from 'zod';
import {
  CreateCategoryRequestSchema,
  ReorderCategoriesRequestSchema,
  UpdateCategoryRequestSchema,
  UuidSchema,
} from '@orvexa/shared';
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

export const categoriesRouter = Router();

categoriesRouter.get(
  '/categories',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await service.listCategories(req.user.restaurantId);
    sendSuccess(res, list);
  }),
);

categoriesRouter.post(
  '/categories',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: CreateCategoryRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const created = await service.createCategory(req.user.restaurantId, req.body);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, created, 201);
  }),
);

categoriesRouter.post(
  '/categories/reorder',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: ReorderCategoriesRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await service.reorderCategories(req.user.restaurantId, req.body);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, list);
  }),
);

categoriesRouter.patch(
  '/categories/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams, body: UpdateCategoryRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.updateCategory(req.user.restaurantId, req.params.id, req.body);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, updated);
  }),
);

categoriesRouter.delete(
  '/categories/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    await service.deleteCategory(req.user.restaurantId, req.params.id);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, { ok: true });
  }),
);

registerTag('categories', 'Menu categories.');

const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/categories', {
  summary: 'List categories (staff)',
  tags: ['categories'],
  responses: okResponses,
});
registerPath('post', '/categories', {
  summary: 'Create category',
  tags: ['categories'],
  responses: { '201': { description: 'Created' } },
});
registerPath('post', '/categories/reorder', {
  summary: 'Reorder categories — request body provides the new id sequence',
  tags: ['categories'],
  responses: okResponses,
});
registerPath('patch', '/categories/{id}', {
  summary: 'Update category',
  tags: ['categories'],
  responses: okResponses,
});
registerPath('delete', '/categories/{id}', {
  summary: 'Delete category',
  tags: ['categories'],
  responses: okResponses,
});
