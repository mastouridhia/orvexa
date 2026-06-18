import { z } from 'zod';
import { LocalizedStringSchema, UuidSchema } from './common.js';

export const ReportGranularitySchema = z.enum(['15min', 'hour', 'day', 'week', 'month']);
export type ReportGranularity = z.infer<typeof ReportGranularitySchema>;

// Essentiel-tier "basic analytics" derived from customer sessions (QR scans).
export const MenuActivityPointSchema = z.object({
  date: z.string(), // ISO date (start of day)
  count: z.number().int(),
});
export type MenuActivityPoint = z.infer<typeof MenuActivityPointSchema>;

export const MenuAnalyticsSummarySchema = z.object({
  scansToday: z.number().int(),
  scans7d: z.number().int(),
  activity: z.array(MenuActivityPointSchema), // last 7 days, one point per day
});
export type MenuAnalyticsSummary = z.infer<typeof MenuAnalyticsSummarySchema>;

export const ReportRangeQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type ReportRangeQuery = z.infer<typeof ReportRangeQuerySchema>;

export const SalesReportQuerySchema = ReportRangeQuerySchema.extend({
  granularity: ReportGranularitySchema.default('day'),
});
export type SalesReportQuery = z.infer<typeof SalesReportQuerySchema>;

export const TopItemsReportQuerySchema = ReportRangeQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type TopItemsReportQuery = z.infer<typeof TopItemsReportQuerySchema>;

export const SalesReportRowSchema = z.object({
  bucket: z.string(),
  orderCount: z.number().int().nonnegative(),
  subtotalMillimes: z.number().int().nonnegative(),
  taxMillimes: z.number().int().nonnegative(),
  serviceMillimes: z.number().int().nonnegative(),
  totalMillimes: z.number().int().nonnegative(),
});
export type SalesReportRow = z.infer<typeof SalesReportRowSchema>;

export const TopItemRowSchema = z.object({
  dishId: UuidSchema,
  name: LocalizedStringSchema,
  quantity: z.number().int().nonnegative(),
  revenueMillimes: z.number().int().nonnegative(),
});
export type TopItemRow = z.infer<typeof TopItemRowSchema>;

export const CategoryRevenueRowSchema = z.object({
  categoryId: UuidSchema.nullable(),
  name: LocalizedStringSchema.nullable(),
  quantity: z.number().int().nonnegative(),
  revenueMillimes: z.number().int().nonnegative(),
});
export type CategoryRevenueRow = z.infer<typeof CategoryRevenueRowSchema>;

export const DashboardSummarySchema = z.object({
  salesTodayMillimes: z.number().int().nonnegative(),
  ordersTodayCount: z.number().int().nonnegative(),
  activeOrdersCount: z.number().int().nonnegative(),
  activeTablesCount: z.number().int().nonnegative(),
  tablesTotal: z.number().int().nonnegative(),
  topItemsToday: z.array(TopItemRowSchema),
  avgDwellMinutesToday: z.number().int().nonnegative().nullable(),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
