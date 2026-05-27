import { Router } from 'express';
import { z } from 'zod';
import {
  CreateDishRequestSchema,
  CreateVariantGroupRequestSchema,
  SetDishAvailabilityRequestSchema,
  UpdateDishRequestSchema,
  UuidSchema,
} from '@orvexa/shared';
import { MenuService } from '../services/menu.js';
import { ImageUploadService } from '../services/image-upload.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const menuService = new MenuService();
const uploadService = new ImageUploadService();
const IdParams = z.object({ id: UuidSchema });

export const dishesRouter = Router();

dishesRouter.get(
  '/dishes',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await menuService.listDishes(req.user.restaurantId);
    sendSuccess(res, list);
  }),
);

dishesRouter.get(
  '/dishes/:id',
  requireAuth,
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const dish = await menuService.getDish(req.user.restaurantId, req.params.id);
    sendSuccess(res, dish);
  }),
);

dishesRouter.post(
  '/dishes',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: CreateDishRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const created = await menuService.createDish(req.user.restaurantId, req.body);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, created, 201);
  }),
);

dishesRouter.patch(
  '/dishes/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams, body: UpdateDishRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await menuService.updateDish(req.user.restaurantId, req.params.id, req.body);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, updated);
  }),
);

dishesRouter.patch(
  '/dishes/:id/availability',
  requireAuth,
  requireRole('admin', 'manager', 'kitchen'),
  validate({ params: IdParams, body: SetDishAvailabilityRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await menuService.setDishAvailability(
      req.user.restaurantId,
      req.params.id,
      req.body,
    );
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, updated);
  }),
);

dishesRouter.delete(
  '/dishes/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const dish = await menuService.getDish(req.user.restaurantId, req.params.id);
    await menuService.deleteDish(req.user.restaurantId, req.params.id);
    for (const url of dish.imageUrls ?? []) await uploadService.deleteByUrl(url);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, { ok: true });
  }),
);

dishesRouter.post(
  '/dishes/:id/image',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams }),
  imageUpload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const file = req.file;
    if (!file) throw new ValidationError('image field is required');
    const { imageUrl } = await uploadService.uploadDishImage({
      buffer: file.buffer,
      contentType: file.mimetype,
    });
    const updated = await menuService.addDishImage(req.user.restaurantId, req.params.id, imageUrl);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, updated, 201);
  }),
);

dishesRouter.delete(
  '/dishes/:id/image',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const existing = await menuService.getDish(req.user.restaurantId, req.params.id);
    for (const url of existing.imageUrls ?? []) await uploadService.deleteByUrl(url);
    const updated = await menuService.setDishImage(req.user.restaurantId, req.params.id, null);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, updated);
  }),
);

dishesRouter.delete(
  '/dishes/:id/images/:idx',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: z.object({ id: UuidSchema, idx: z.coerce.number().int().nonnegative() }) }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const idx = Number(req.params.idx);
    const { dish, removedUrl } = await menuService.removeDishImageAt(
      req.user.restaurantId,
      req.params.id,
      idx,
    );
    if (removedUrl) await uploadService.deleteByUrl(removedUrl);
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, dish);
  }),
);

dishesRouter.get(
  '/dishes/:id/variant-groups',
  requireAuth,
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await menuService.listVariantGroups(req.user.restaurantId, req.params.id);
    sendSuccess(res, list);
  }),
);

dishesRouter.post(
  '/dishes/:id/variant-groups',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams, body: CreateVariantGroupRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const created = await menuService.createVariantGroup(
      req.user.restaurantId,
      req.params.id,
      req.body,
    );
    getBus().menuUpdated(req.user.restaurantId);
    sendSuccess(res, created, 201);
  }),
);

registerTag('dishes', 'Dish (menu item) management.');

const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/dishes', {
  summary: 'List dishes (staff)',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('get', '/dishes/{id}', {
  summary: 'Get a single dish (with variant groups)',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('post', '/dishes', {
  summary: 'Create dish (admin/manager)',
  tags: ['dishes'],
  responses: { '201': { description: 'Created' } },
});
registerPath('patch', '/dishes/{id}', {
  summary: 'Update dish (admin/manager)',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('patch', '/dishes/{id}/availability', {
  summary: 'Toggle availability (admin/manager/kitchen — kitchen toggles 86’d items)',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('delete', '/dishes/{id}', {
  summary: 'Delete dish (cascades to variant groups + image)',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('post', '/dishes/{id}/image', {
  summary:
    'Upload dish image (multipart, field name `image`) — resized to 1024px and converted to webp',
  tags: ['dishes'],
  responses: { '201': { description: 'Created' } },
});
registerPath('delete', '/dishes/{id}/image', {
  summary: 'Remove dish image',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('delete', '/dishes/{id}/images/{idx}', {
  summary: 'Remove one dish image by index',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('get', '/dishes/{id}/variant-groups', {
  summary: 'List a dish’s variant groups',
  tags: ['dishes'],
  responses: okResponses,
});
registerPath('post', '/dishes/{id}/variant-groups', {
  summary: 'Create a variant group for a dish (optionally with nested variants)',
  tags: ['dishes'],
  responses: { '201': { description: 'Created' } },
});
