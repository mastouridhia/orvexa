import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const TableStatusSchema = z.enum([
  'free',
  'seated',
  'ordering',
  'waiting',
  'call_waiter',
  'needs_bill',
  'needs_cleaning',
]);
export type TableStatus = z.infer<typeof TableStatusSchema>;

// Normalized canvas coordinates. 0..1 keeps the layout resolution-independent
// so admin and waiter views can render the same plan at any size.
export const TablePositionCoordSchema = z.number().min(0).max(1);

export const TableSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  label: z.string().min(1),
  seats: z.number().int().positive(),
  status: TableStatusSchema,
  mergedIntoTableId: UuidSchema.nullable(),
  zoneId: UuidSchema.nullable(),
  x: TablePositionCoordSchema.nullable(),
  y: TablePositionCoordSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type Table = z.infer<typeof TableSchema>;

export const MergeTablesRequestSchema = z.object({
  /** The other tables to fold into this one (this table becomes the leader) */
  memberTableIds: z.array(UuidSchema).min(1).max(10),
});
export type MergeTablesRequest = z.infer<typeof MergeTablesRequestSchema>;

export const TableDayTokenSchema = z.object({
  id: UuidSchema,
  tableId: UuidSchema,
  restaurantId: UuidSchema,
  day: z.iso.date(),
  token: z.string().min(1),
  createdAt: IsoDateTimeSchema,
});
export type TableDayToken = z.infer<typeof TableDayTokenSchema>;

export const CreateTableRequestSchema = z.object({
  label: z.string().min(1).max(64),
  seats: z.number().int().positive().max(50),
  zoneId: UuidSchema.nullable().optional(),
  x: TablePositionCoordSchema.nullable().optional(),
  y: TablePositionCoordSchema.nullable().optional(),
});
export type CreateTableRequest = z.infer<typeof CreateTableRequestSchema>;

export const UpdateTableRequestSchema = z
  .object({
    label: z.string().min(1).max(64),
    seats: z.number().int().positive().max(50),
    status: TableStatusSchema,
    zoneId: UuidSchema.nullable(),
    x: TablePositionCoordSchema.nullable(),
    y: TablePositionCoordSchema.nullable(),
  })
  .partial();
export type UpdateTableRequest = z.infer<typeof UpdateTableRequestSchema>;

export const TableWithDerivedSchema = TableSchema.extend({
  derivedStatus: TableStatusSchema,
  /** Tables merged INTO this one (only populated for the leader) */
  mergedTableIds: z.array(UuidSchema).default([]),
});
export type TableWithDerived = z.infer<typeof TableWithDerivedSchema>;

// ---------- Zones ----------

export const TableZoneSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  name: z.string().min(1),
  sortOrder: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type TableZone = z.infer<typeof TableZoneSchema>;

export const CreateTableZoneRequestSchema = z.object({
  name: z.string().min(1).max(64),
});
export type CreateTableZoneRequest = z.infer<typeof CreateTableZoneRequestSchema>;

export const UpdateTableZoneRequestSchema = z
  .object({
    name: z.string().min(1).max(64),
  })
  .partial();
export type UpdateTableZoneRequest = z.infer<typeof UpdateTableZoneRequestSchema>;

export const ReorderTableZonesRequestSchema = z.object({
  zoneIds: z.array(UuidSchema).min(1),
});
export type ReorderTableZonesRequest = z.infer<typeof ReorderTableZonesRequestSchema>;

// ---------- Bulk layout (drag-drop save) ----------

export const TableLayoutEntrySchema = z.object({
  id: UuidSchema,
  zoneId: UuidSchema.nullable(),
  x: TablePositionCoordSchema.nullable(),
  y: TablePositionCoordSchema.nullable(),
});
export type TableLayoutEntry = z.infer<typeof TableLayoutEntrySchema>;

export const BulkUpdateTableLayoutRequestSchema = z.object({
  tables: z.array(TableLayoutEntrySchema).min(1).max(500),
});
export type BulkUpdateTableLayoutRequest = z.infer<typeof BulkUpdateTableLayoutRequestSchema>;
