import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const StaffRoleSchema = z.enum([
  'admin',
  'manager',
  'kitchen',
  'waiter',
  'cashier',
  // Plus-tier lightweight role: handles the order inbox only (accept/advance/reject).
  'employee',
]);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

// Which staff-facing app a login is coming from. Each app is locked to a
// specific set of roles so an account can only sign in to its own surface.
export const StaffAppSchema = z.enum(['admin', 'kitchen', 'waiter']);
export type StaffApp = z.infer<typeof StaffAppSchema>;

// Single source of truth for role → app access, shared by the server (enforced
// at login) and the frontends. Strict separation: one role family per app.
export const APP_ROLES: Record<StaffApp, readonly StaffRole[]> = {
  admin: ['admin', 'manager'],
  kitchen: ['kitchen'],
  waiter: ['waiter', 'employee'],
};

export function roleAllowedForApp(role: StaffRole, app: StaffApp): boolean {
  return APP_ROLES[app].includes(role);
}

export const StaffUserSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  email: z.email(),
  name: z.string().min(1),
  role: StaffRoleSchema,
  disabledAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type StaffUser = z.infer<typeof StaffUserSchema>;

export const CreateStaffRequestSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: StaffRoleSchema,
  password: z.string().min(6),
});
export type CreateStaffRequest = z.infer<typeof CreateStaffRequestSchema>;

export const UpdateStaffRequestSchema = z
  .object({
    name: z.string().min(1),
    role: StaffRoleSchema,
    password: z.string().min(6),
  })
  .partial();
export type UpdateStaffRequest = z.infer<typeof UpdateStaffRequestSchema>;

// ── Staff shifts (attendance) ──────────────────────────────────────
export const StaffShiftSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  userId: UuidSchema,
  shiftDate: z.iso.date(),
  present: z.boolean(),
  checkedInAt: IsoDateTimeSchema.nullable(),
  checkedOutAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type StaffShift = z.infer<typeof StaffShiftSchema>;

export const SetShiftPresenceRequestSchema = z.object({
  shiftDate: z.iso.date(),
  present: z.boolean(),
});
export type SetShiftPresenceRequest = z.infer<typeof SetShiftPresenceRequestSchema>;

export const ListShiftsQuerySchema = z.object({
  shiftDate: z.iso.date().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type ListShiftsQuery = z.infer<typeof ListShiftsQuerySchema>;
