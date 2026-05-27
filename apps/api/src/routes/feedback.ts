import { Router } from 'express';
import { z } from 'zod';
import {
  FeedbackListQuerySchema,
  SubmitFeedbackRequestSchema,
  UuidSchema,
  type LanguageCode,
} from '@orvexa/shared';
import { FeedbackService } from '../services/feedback.js';
import { requireAuth, requireCustomerSession, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const service = new FeedbackService();
const OrderIdParams = z.object({ id: UuidSchema });

export const feedbackRouter = Router();

feedbackRouter.post(
  '/orders/:id/feedback',
  requireCustomerSession,
  validate({ params: OrderIdParams, body: SubmitFeedbackRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const created = await service.submitForOrder({
      orderId: req.params.id,
      sessionId: req.customerSession.id,
      locale: req.customerSession.locale as LanguageCode,
      body: req.body,
    });
    sendSuccess(res, created, 201);
  }),
);

feedbackRouter.get(
  '/feedback',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ query: FeedbackListQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const { page, pageSize } = req.query as unknown as z.infer<typeof FeedbackListQuerySchema>;
    const result = await service.list(req.user.restaurantId, page, pageSize);
    sendSuccess(res, result);
  }),
);

feedbackRouter.get(
  '/feedback/summary',
  requireAuth,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const summary = await service.summary(req.user.restaurantId);
    sendSuccess(res, summary);
  }),
);

registerTag('feedback', 'Customer feedback (post-bill ratings).');
const okResponses = { '200': { description: 'OK' } };
registerPath('post', '/orders/{id}/feedback', {
  summary: 'Submit feedback for the customer’s own order',
  tags: ['feedback'],
  responses: { '201': { description: 'Created' } },
});
registerPath('get', '/feedback', {
  summary: 'List feedback for the staff’s restaurant (admin/manager)',
  tags: ['feedback'],
  responses: okResponses,
});
registerPath('get', '/feedback/summary', {
  summary: 'Aggregate count + average + breakdown (admin/manager)',
  tags: ['feedback'],
  responses: okResponses,
});
