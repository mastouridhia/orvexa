import { Router } from 'express';
import { z } from 'zod';
import {
  BulkUpdateTableLayoutRequestSchema,
  CreateTableRequestSchema,
  MergeTablesRequestSchema,
  RequestExtrasRequestSchema,
  UpdateTableRequestSchema,
  UuidSchema,
} from '@orvexa/shared';
import { TableService } from '../services/table.js';
import {
  requireAnyAuth,
  requireAuth,
  requireCustomerSession,
  requireRole,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { redis } from '../cache/client.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const service = new TableService();

async function emitTableStatus(restaurantId: string, tableId: string): Promise<void> {
  const status = await service.deriveForTable(restaurantId, tableId);
  if (status) getBus().tableStatusChanged(restaurantId, tableId, status);
}

export const tablesRouter = Router();

const IdParamsSchema = z.object({ id: UuidSchema });
const QrQuerySchema = z.object({ format: z.enum(['png', 'svg']).default('png') }).partial();

tablesRouter.get(
  '/tables',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const tables = await service.list(req.user.restaurantId);
    sendSuccess(res, tables);
  }),
);

tablesRouter.post(
  '/tables',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: CreateTableRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const created = await service.create(req.user.restaurantId, req.body);
    sendSuccess(res, created, 201);
  }),
);

tablesRouter.post(
  '/tables/layout',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ body: BulkUpdateTableLayoutRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.bulkUpdateLayout(req.user.restaurantId, req.body);
    sendSuccess(res, updated);
  }),
);

tablesRouter.patch(
  '/tables/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParamsSchema, body: UpdateTableRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.update(req.user.restaurantId, req.params.id, req.body);
    sendSuccess(res, updated);
  }),
);

tablesRouter.delete(
  '/tables/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    await service.delete(req.user.restaurantId, req.params.id);
    sendSuccess(res, { ok: true });
  }),
);

tablesRouter.post(
  '/tables/:id/merge',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParamsSchema, body: MergeTablesRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const result = await service.mergeTables({
      restaurantId: req.user.restaurantId,
      leaderId: req.params.id,
      memberTableIds: req.body.memberTableIds,
    });
    await emitTableStatus(req.user.restaurantId, req.params.id);
    for (const m of result.members) {
      await emitTableStatus(req.user.restaurantId, m.id);
    }
    sendSuccess(res, result);
  }),
);

tablesRouter.post(
  '/tables/:id/unmerge',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const updated = await service.unmergeTable(req.user.restaurantId, req.params.id);
    await emitTableStatus(req.user.restaurantId, req.params.id);
    sendSuccess(res, updated);
  }),
);

tablesRouter.get(
  '/tables/:id/qr',
  requireAuth,
  validate({ params: IdParamsSchema, query: QrQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const format = (req.query.format as 'png' | 'svg' | undefined) ?? 'png';
    const qr = await service.qr(req.user.restaurantId, req.params.id, format);
    res.setHeader('content-type', qr.contentType);
    res.setHeader('x-qr-url', qr.url);
    res.status(200).send(qr.body);
  }),
);

tablesRouter.post(
  '/tables/:id/call-waiter',
  requireCustomerSession,
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    if (req.customerSession.tableId !== req.params.id) {
      throw new ForbiddenError('Session is for a different table');
    }
    const call = await service.callWaiter(req.customerSession.restaurantId, req.params.id);
    const atIso = call.createdAt.toISOString();
    getBus().waiterCalled(call.restaurantId, call.tableId, atIso);
    await emitTableStatus(call.restaurantId, call.tableId);
    sendSuccess(res, { id: call.id, createdAt: atIso }, 201);
  }),
);

tablesRouter.post(
  '/tables/:id/request-code',
  requireCustomerSession,
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    if (req.customerSession.tableId !== req.params.id) {
      throw new ForbiddenError('Session is for a different table');
    }
    const call = await service.requestCode(req.customerSession.restaurantId, req.params.id);
    const atIso = call.createdAt.toISOString();
    getBus().waiterCalled(call.restaurantId, call.tableId, atIso);
    await emitTableStatus(call.restaurantId, call.tableId);
    sendSuccess(res, { id: call.id, createdAt: atIso }, 201);
  }),
);

tablesRouter.post(
  '/tables/:id/request-bill',
  requireAnyAuth,
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    let restaurantId: string;
    if (req.customerSession) {
      if (req.customerSession.tableId !== req.params.id) {
        throw new ForbiddenError('Session is for a different table');
      }
      restaurantId = req.customerSession.restaurantId;
    } else if (req.user) {
      restaurantId = req.user.restaurantId;
    } else {
      throw new UnauthorizedError('Authentication required');
    }
    const call = await service.requestBill(restaurantId, req.params.id);
    const atIso = call.createdAt.toISOString();
    getBus().billRequested(call.restaurantId, call.tableId, null, atIso);
    await emitTableStatus(call.restaurantId, call.tableId);
    sendSuccess(res, { id: call.id, createdAt: atIso }, 201);
  }),
);

tablesRouter.post(
  '/tables/:id/request-extras',
  requireAnyAuth,
  validate({ params: IdParamsSchema, body: RequestExtrasRequestSchema }),
  asyncHandler(async (req, res) => {
    let restaurantId: string;
    if (req.customerSession) {
      if (req.customerSession.tableId !== req.params.id) {
        throw new ForbiddenError('Session is for a different table');
      }
      restaurantId = req.customerSession.restaurantId;
    } else if (req.user) {
      restaurantId = req.user.restaurantId;
    } else {
      throw new UnauthorizedError('Authentication required');
    }
    const body = req.body as { items: string[]; note?: string };
    const itemsLine = body.items.length ? body.items.join(', ') : '';
    const noteLine = body.note?.trim() ?? '';
    const merged = [itemsLine, noteLine].filter(Boolean).join(' — ');
    const call = await service.requestExtras(restaurantId, req.params.id, merged || 'extras');
    const atIso = call.createdAt.toISOString();
    getBus().waiterCalled(call.restaurantId, call.tableId, atIso);
    sendSuccess(res, { id: call.id, createdAt: atIso }, 201);
  }),
);

tablesRouter.post(
  '/tables/:id/clean',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const table = await service.markClean(req.user.restaurantId, req.params.id);
    await emitTableStatus(table.restaurantId, table.id);
    sendSuccess(res, table);
  }),
);

tablesRouter.post(
  '/tables/:id/ordering-code',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const result = await service.issueOrderingCode(req.user.restaurantId, req.params.id);
    sendSuccess(res, result, 201);
  }),
);

tablesRouter.delete(
  '/tables/:id/order-ceiling',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    // Grant a 30-min bypass so the waiter can unlock ordering for this table
    // after visually verifying the guests.
    try {
      await redis.set(`ceiling:bypass:${req.params.id}`, '1', 'EX', 1800);
    } catch { /* Redis down — bypass won't persist; acceptable */ }
    sendSuccess(res, { ok: true });
  }),
);

registerTag('tables', 'Table CRUD, QR codes, and customer signals.');

const jsonOk = {
  '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } },
};

registerPath('get', '/tables', {
  summary: 'List tables (staff)',
  tags: ['tables'],
  responses: jsonOk,
});
registerPath('post', '/tables', {
  summary: 'Create table (admin/manager)',
  tags: ['tables'],
  responses: { '201': { description: 'Created' } },
});
registerPath('patch', '/tables/{id}', {
  summary: 'Update table (admin/manager)',
  tags: ['tables'],
  responses: jsonOk,
});
registerPath('delete', '/tables/{id}', {
  summary: 'Delete table (admin)',
  tags: ['tables'],
  responses: jsonOk,
});
registerPath('post', '/tables/{id}/request-extras', {
  summary:
    'Customer (or staff) requests extras at the table — preset items list and/or free-text note. Records a waiter_call with kind=request_extras.',
  tags: ['tables'],
  responses: { '201': { description: 'Created' } },
});
registerPath('post', '/tables/{id}/clean', {
  summary: 'Mark a table as cleaned (waiter/admin/manager) — clears `needs_cleaning`',
  tags: ['tables'],
  responses: jsonOk,
});
registerPath('post', '/tables/{id}/ordering-code', {
  summary: 'Issue/rotate the short ordering code for a table (waiter/admin/manager)',
  tags: ['tables'],
  responses: { '201': { description: 'Created' } },
});
registerPath('delete', '/tables/{id}/order-ceiling', {
  summary: 'Unlock ordering above the per-table ceiling for 30 min (waiter/admin/manager)',
  tags: ['tables'],
  responses: jsonOk,
});
registerPath('get', '/tables/{id}/qr', {
  summary: 'QR image (PNG default, or ?format=svg). Issues today’s session token if missing.',
  tags: ['tables'],
  responses: {
    '200': { description: 'QR image', content: { 'image/png': {}, 'image/svg+xml': {} } },
  },
});
registerPath('post', '/tables/{id}/call-waiter', {
  summary: 'Customer calls a waiter to their table',
  tags: ['tables'],
  responses: { '201': { description: 'Created' } },
});
registerPath('post', '/tables/{id}/request-bill', {
  summary: 'Customer requests the bill',
  tags: ['tables'],
  responses: { '201': { description: 'Created' } },
});
registerPath('post', '/tables/layout', {
  summary: 'Bulk-save floor-plan layout (zone + x/y per table)',
  tags: ['tables'],
  responses: jsonOk,
});
