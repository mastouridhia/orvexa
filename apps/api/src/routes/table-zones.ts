import { Router } from 'express';
import { z } from 'zod';
import {
  CreateTableZoneRequestSchema,
  ReorderTableZonesRequestSchema,
  UpdateTableZoneRequestSchema,
  UuidSchema,
} from '@orvexa/shared';
import { TableZoneService } from '../services/table-zone.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const service = new TableZoneService();
const IdParams = z.object({ id: UuidSchema });

export const tableZonesRouter = Router();

tableZonesRouter.get(
  '/table-zones',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await service.list(req.user.restaurantId);
    sendSuccess(res, list);
  }),
);

tableZonesRouter.post(
  '/table-zones',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: CreateTableZoneRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const created = await service.create(req.user.restaurantId, req.body);
    sendSuccess(res, created, 201);
  }),
);

tableZonesRouter.post(
  '/table-zones/reorder',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: ReorderTableZonesRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await service.reorder(req.user.restaurantId, req.body);
    sendSuccess(res, list);
  }),
);

tableZonesRouter.patch(
  '/table-zones/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams, body: UpdateTableZoneRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.update(req.user.restaurantId, req.params.id, req.body);
    sendSuccess(res, updated);
  }),
);

tableZonesRouter.delete(
  '/table-zones/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    await service.delete(req.user.restaurantId, req.params.id);
    sendSuccess(res, { ok: true });
  }),
);

registerTag('table-zones', 'Floor-plan zones (groups of tables).');

const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/table-zones', {
  summary: 'List zones (staff)',
  tags: ['table-zones'],
  responses: okResponses,
});
registerPath('post', '/table-zones', {
  summary: 'Create zone',
  tags: ['table-zones'],
  responses: { '201': { description: 'Created' } },
});
registerPath('post', '/table-zones/reorder', {
  summary: 'Reorder zones — request body provides the new id sequence',
  tags: ['table-zones'],
  responses: okResponses,
});
registerPath('patch', '/table-zones/{id}', {
  summary: 'Update zone (rename)',
  tags: ['table-zones'],
  responses: okResponses,
});
registerPath('delete', '/table-zones/{id}', {
  summary: 'Delete zone — affected tables fall back to "Unassigned"',
  tags: ['table-zones'],
  responses: okResponses,
});
