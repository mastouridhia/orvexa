import { Router } from 'express';
import { z } from 'zod';
import {
  ListWaiterCallsQuerySchema,
  UuidSchema,
  type WaiterCall,
  type WaiterCallKind,
} from '@orvexa/shared';
import {
  WaiterCallRepository,
  type WaiterCallRow,
} from '../repositories/waiter-call.js';
import { TableService } from '../services/table.js';
import {
  requireAuth,
  requireRole,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const repo = new WaiterCallRepository();
const tableService = new TableService();

export const waiterCallsRouter = Router();

const IdParams = z.object({ id: UuidSchema });

function rowToWaiterCall(row: WaiterCallRow): WaiterCall {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    kind: row.kind as WaiterCallKind,
    note: row.note ?? null,
    clearedAt: row.clearedAt ? row.clearedAt.toISOString() : null,
    clearedByUserId: row.clearedByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

waiterCallsRouter.get(
  '/waiter-calls',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ query: ListWaiterCallsQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const status = (req.query.status as 'open' | 'all' | undefined) ?? 'open';
    const rows =
      status === 'open'
        ? await repo.listOpenForRestaurant(req.user.restaurantId)
        : await repo.listAllForRestaurant(req.user.restaurantId);
    sendSuccess(res, rows.map(rowToWaiterCall));
  }),
);

waiterCallsRouter.post(
  '/waiter-calls/:id/clear',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const existing = await repo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Waiter call not found');
    if (existing.restaurantId !== req.user.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    if (existing.clearedAt !== null) {
      throw new ConflictError('Waiter call already cleared');
    }
    const updated = await repo.clear(req.params.id, req.user.id);
    if (!updated) throw new NotFoundError('Waiter call not found');
    const status = await tableService.deriveForTable(
      updated.restaurantId,
      updated.tableId,
    );
    if (status) {
      getBus().tableStatusChanged(updated.restaurantId, updated.tableId, status);
    }
    sendSuccess(res, rowToWaiterCall(updated));
  }),
);

registerTag('waiter-calls', 'Open call-waiter / request-bill signals from customers.');

const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/waiter-calls', {
  summary: 'List waiter calls (?status=open|all, default open) — staff only',
  tags: ['waiter-calls'],
  responses: okResponses,
});
registerPath('post', '/waiter-calls/{id}/clear', {
  summary: 'Mark a waiter call as handled (admin/manager/waiter)',
  tags: ['waiter-calls'],
  responses: okResponses,
});
