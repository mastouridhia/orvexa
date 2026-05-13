import { Router } from 'express';
import { z } from 'zod';
import { RecordPaymentRequestSchema, UuidSchema } from '@orvexa/shared';
import { PaymentService } from '../services/payment.js';
import { TableService } from '../services/table.js';
import { renderReceiptHtml } from '../services/receipt-html.js';
import {
  requireAnyAuth,
  requireAuth,
  requireRole,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const service = new PaymentService();
const tableService = new TableService();

export const paymentsRouter = Router();

const IdParams = z.object({ id: UuidSchema });

paymentsRouter.post(
  '/orders/:id/pay',
  requireAuth,
  requireRole('admin', 'manager', 'waiter', 'cashier'),
  validate({ params: IdParams, body: RecordPaymentRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const result = await service.record({
      restaurantId: req.user.restaurantId,
      orderId: req.params.id,
      collectedByUserId: req.user.id,
      body: req.body,
    });
    if (result.fullyPaid) {
      await tableService.markNeedsCleaning(
        result.order.restaurantId,
        result.order.tableId,
      );
      const status = await tableService.deriveForTable(
        result.order.restaurantId,
        result.order.tableId,
      );
      if (status) {
        getBus().tableStatusChanged(result.order.restaurantId, result.order.tableId, status);
      }
    }
    sendSuccess(res, result, 201);
  }),
);

paymentsRouter.post(
  '/payments/:id/confirm',
  requireAuth,
  requireRole('admin', 'manager', 'waiter', 'cashier'),
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const result = await service.confirm({
      restaurantId: req.user.restaurantId,
      paymentId: req.params.id,
    });
    if (result.fullyPaid) {
      await tableService.markNeedsCleaning(
        result.order.restaurantId,
        result.order.tableId,
      );
      const status = await tableService.deriveForTable(
        result.order.restaurantId,
        result.order.tableId,
      );
      if (status) {
        getBus().tableStatusChanged(result.order.restaurantId, result.order.tableId, status);
      }
    }
    sendSuccess(res, result);
  }),
);

paymentsRouter.get(
  '/orders/:id/receipt',
  requireAnyAuth,
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (req.user) {
      const receipt = await service.getReceipt(req.user.restaurantId, req.params.id);
      sendSuccess(res, receipt);
      return;
    }
    if (req.customerSession) {
      const receipt = await service.getReceiptForCustomer(req.customerSession.id, req.params.id);
      sendSuccess(res, receipt);
      return;
    }
    throw new ForbiddenError('No auth context');
  }),
);

paymentsRouter.get(
  '/orders/:id/receipt.html',
  requireAnyAuth,
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    const receipt = req.user
      ? await service.getReceipt(req.user.restaurantId, req.params.id)
      : req.customerSession
      ? await service.getReceiptForCustomer(req.customerSession.id, req.params.id)
      : null;
    if (!receipt) throw new ForbiddenError('No auth context');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(renderReceiptHtml(receipt));
  }),
);

registerTag('payments', 'Payment recording and receipts.');

const okResponses = { '200': { description: 'OK' } };
const createdResponse = { '201': { description: 'Created' } };

registerPath('post', '/orders/{id}/pay', {
  summary:
    'Record a payment against an order (waiter/admin/manager). Cash settles immediately as `paid`; card / mobile pay records as `pending` and must be confirmed via /payments/:id/confirm.',
  tags: ['payments'],
  responses: createdResponse,
});
registerPath('post', '/payments/{id}/confirm', {
  summary:
    'Confirm a `pending` payment (card / mobile-pay). Flips it to `paid` and re-derives the order paymentStatus + table state.',
  tags: ['payments'],
  responses: okResponses,
});
registerPath('get', '/orders/{id}/receipt', {
  summary: 'Receipt JSON (staff OR owning customer session)',
  tags: ['payments'],
  responses: okResponses,
});
registerPath('get', '/orders/{id}/receipt.html', {
  summary: 'Printable HTML receipt (browser print-to-PDF supported)',
  tags: ['payments'],
  responses: { '200': { description: 'OK', content: { 'text/html': {} } } },
});
