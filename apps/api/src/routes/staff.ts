import { Router } from 'express';
import { z } from 'zod';
import {
  CreateStaffRequestSchema,
  ListShiftsQuerySchema,
  SetShiftPresenceRequestSchema,
  UpdateStaffRequestSchema,
  UuidSchema,
  type StaffRole,
  type StaffShift,
  type StaffUser,
} from '@orvexa/shared';
import {
  StaffRepository,
  StaffShiftRepository,
  type StaffRow,
  type StaffShiftRow,
} from '../repositories/staff.js';
import { hashPassword } from '../utils/password.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const repo = new StaffRepository();
const shiftRepo = new StaffShiftRepository();

function rowToShift(row: StaffShiftRow): StaffShift {
  // drizzle types `date` columns as `string` in select shape; defensive in case the runtime returns Date
  const shiftDate =
    typeof row.shiftDate === 'string'
      ? row.shiftDate
      : (row.shiftDate as unknown as Date).toISOString().slice(0, 10);
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    userId: row.userId,
    shiftDate,
    present: row.present,
    checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    checkedOutAt: row.checkedOutAt ? row.checkedOutAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function todayDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const IdParams = z.object({ id: UuidSchema });

function rowToUser(row: StaffRow): StaffUser {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    email: row.email,
    name: row.name,
    role: row.role as StaffRole,
    disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const staffRouter = Router();

staffRouter.get(
  '/staff',
  requireAuth,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const rows = await repo.listForRestaurant(req.user.restaurantId);
    sendSuccess(res, rows.map(rowToUser));
  }),
);

staffRouter.post(
  '/staff',
  requireAuth,
  requireRole('admin'),
  validate({ body: CreateStaffRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const body = req.body as {
      email: string;
      name: string;
      role: StaffRole;
      password: string;
    };
    const existing = await repo.findByEmail(body.email, req.user.restaurantId);
    if (existing) throw new ConflictError('A staff user with this email already exists');
    const passwordHash = await hashPassword(body.password);
    const row = await repo.create({
      restaurantId: req.user.restaurantId,
      email: body.email,
      name: body.name,
      role: body.role,
      passwordHash,
    });
    sendSuccess(res, rowToUser(row), 201);
  }),
);

staffRouter.patch(
  '/staff/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: IdParams, body: UpdateStaffRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const existing = await repo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Staff user not found');
    if (existing.restaurantId !== req.user.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    const body = req.body as { name?: string; role?: StaffRole; password?: string };
    const patch: Partial<{ name: string; role: StaffRole; passwordHash: string }> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.role !== undefined) patch.role = body.role;
    if (body.password !== undefined) patch.passwordHash = await hashPassword(body.password);
    if (Object.keys(patch).length === 0) {
      throw new ValidationError('At least one field is required');
    }
    const row = await repo.update(req.params.id, patch);
    if (!row) throw new NotFoundError('Staff user not found');
    // Role change invalidates outstanding access tokens immediately
    if (body.role !== undefined) {
      await repo.bumpTokenVersion(req.params.id);
      getBus().staffRevoked(req.params.id);
    }
    sendSuccess(res, rowToUser(row));
  }),
);

staffRouter.post(
  '/staff/:id/disable',
  requireAuth,
  requireRole('admin'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (req.params.id === req.user.id) {
      throw new ConflictError('Cannot disable your own account');
    }
    const existing = await repo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Staff user not found');
    if (existing.restaurantId !== req.user.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    if (existing.disabledAt) throw new ConflictError('Staff user is already disabled');
    const row = await repo.update(req.params.id, { disabledAt: new Date() });
    if (!row) throw new NotFoundError('Staff user not found');
    // Bump version so outstanding access tokens are rejected immediately
    await repo.bumpTokenVersion(req.params.id);
    getBus().staffRevoked(req.params.id);
    sendSuccess(res, rowToUser(row));
  }),
);

staffRouter.post(
  '/staff/:id/enable',
  requireAuth,
  requireRole('admin'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const existing = await repo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Staff user not found');
    if (existing.restaurantId !== req.user.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    if (!existing.disabledAt) throw new ConflictError('Staff user is not disabled');
    const row = await repo.update(req.params.id, { disabledAt: null });
    if (!row) throw new NotFoundError('Staff user not found');
    // Bump version to force a fresh login after re-enabling
    await repo.bumpTokenVersion(req.params.id);
    sendSuccess(res, rowToUser(row));
  }),
);

// ─── Shift attendance ───────────────────────────────────

staffRouter.get(
  '/staff/shifts',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ query: ListShiftsQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const q = req.query as { shiftDate?: string; from?: string; to?: string };
    if (q.from && q.to) {
      const rows = await shiftRepo.listForRestaurantRange(req.user.restaurantId, q.from, q.to);
      sendSuccess(res, rows.map(rowToShift));
      return;
    }
    const date = q.shiftDate ?? todayDateIso();
    const rows = await shiftRepo.listForRestaurantDate(req.user.restaurantId, date);
    sendSuccess(res, rows.map(rowToShift));
  }),
);

staffRouter.post(
  '/staff/:id/shifts',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ params: IdParams, body: SetShiftPresenceRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const target = await repo.findById(req.params.id);
    if (!target) throw new NotFoundError('Staff user not found');
    if (target.restaurantId !== req.user.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    const body = req.body as { shiftDate: string; present: boolean };
    const row = await shiftRepo.upsertPresence({
      restaurantId: req.user.restaurantId,
      userId: req.params.id,
      shiftDate: body.shiftDate,
      present: body.present,
    });
    sendSuccess(res, rowToShift(row));
  }),
);

registerTag('staff', 'Staff user CRUD (admin/manager read, admin write).');

const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/staff', {
  summary: 'List staff users (admin/manager)',
  tags: ['staff'],
  responses: okResponses,
});
registerPath('post', '/staff', {
  summary: 'Create a staff user (admin)',
  tags: ['staff'],
  responses: { '201': { description: 'Created' } },
});
registerPath('patch', '/staff/{id}', {
  summary: 'Update name / role / password (admin)',
  tags: ['staff'],
  responses: okResponses,
});
registerPath('post', '/staff/{id}/disable', {
  summary: 'Soft-disable a staff account (admin); cannot disable self',
  tags: ['staff'],
  responses: okResponses,
});
registerPath('post', '/staff/{id}/enable', {
  summary: 'Re-enable a previously disabled account (admin)',
  tags: ['staff'],
  responses: okResponses,
});
registerPath('get', '/staff/shifts', {
  summary: 'List staff shift attendance for a date or date range (admin/manager)',
  tags: ['staff'],
  responses: okResponses,
});
registerPath('post', '/staff/{id}/shifts', {
  summary: "Set a staff member's shift presence (admin/manager)",
  tags: ['staff'],
  responses: okResponses,
});
