import { Router } from 'express';
import {
  ReportRangeQuerySchema,
  SalesReportQuerySchema,
  TopItemsReportQuerySchema,
} from '@orvexa/shared';
import { ReportsService } from '../services/reports.js';
import { requireAuth, requireCapability, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const service = new ReportsService();

export const reportsRouter = Router();

function parseRange(q: { from?: string; to?: string }): { from?: Date; to?: Date } {
  return {
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
  };
}

reportsRouter.get(
  '/dashboard/summary',
  requireAuth,
  requireRole('admin', 'manager'),
  requireCapability('analytics.sales_basic'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const summary = await service.dashboardSummary(req.user.restaurantId);
    sendSuccess(res, summary);
  }),
);

reportsRouter.get(
  '/analytics/menu',
  requireAuth,
  requireRole('admin', 'manager'),
  requireCapability('analytics.views'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const summary = await service.menuAnalytics(req.user.restaurantId);
    sendSuccess(res, summary);
  }),
);

reportsRouter.get(
  '/reports/sales',
  requireAuth,
  requireRole('admin', 'manager'),
  requireCapability('analytics.sales_basic'),
  validate({ query: SalesReportQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const q = req.query as { granularity: 'day' | 'week' | 'month'; from?: string; to?: string };
    const { from, to } = parseRange(q);
    const rows = await service.sales(req.user.restaurantId, q.granularity, from, to);
    sendSuccess(res, rows);
  }),
);

reportsRouter.get(
  '/reports/top-items',
  requireAuth,
  requireRole('admin', 'manager'),
  requireCapability('analytics.sales_basic'),
  validate({ query: TopItemsReportQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const q = req.query as unknown as { limit: number; from?: string; to?: string };
    const { from, to } = parseRange(q);
    const rows = await service.topItems(req.user.restaurantId, q.limit, from, to);
    sendSuccess(res, rows);
  }),
);

reportsRouter.get(
  '/reports/revenue-by-category',
  requireAuth,
  requireRole('admin', 'manager'),
  requireCapability('analytics.advanced'),
  validate({ query: ReportRangeQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const q = req.query as { from?: string; to?: string };
    const { from, to } = parseRange(q);
    const rows = await service.revenueByCategory(req.user.restaurantId, from, to);
    sendSuccess(res, rows);
  }),
);

registerTag('reports', 'Aggregated sales/items/revenue reporting (admin/manager).');

const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/dashboard/summary', {
  summary: 'Today snapshot: sales, orders, active tables, top items',
  tags: ['reports'],
  responses: okResponses,
});
registerPath('get', '/analytics/menu', {
  summary: 'Essentiel basic analytics: QR scan counts + 7-day activity',
  tags: ['reports'],
  responses: okResponses,
});
registerPath('get', '/reports/sales', {
  summary: 'Sales buckets by day/week/month (defaults to day)',
  tags: ['reports'],
  responses: okResponses,
});
registerPath('get', '/reports/top-items', {
  summary: 'Top dishes by quantity (default limit=10, max=50)',
  tags: ['reports'],
  responses: okResponses,
});
registerPath('get', '/reports/revenue-by-category', {
  summary: 'Revenue grouped by menu category',
  tags: ['reports'],
  responses: okResponses,
});
