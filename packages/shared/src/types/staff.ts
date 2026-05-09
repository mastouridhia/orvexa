import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const StaffRoleSchema = z.enum(['admin', 'manager', 'kitchen', 'waiter']);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

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
