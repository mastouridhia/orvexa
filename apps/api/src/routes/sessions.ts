import { Router } from 'express';
import { OpenCustomerSessionRequestSchema } from '@orvexa/shared';
import { CustomerSessionService } from '../services/customer-session.js';
import { requireCustomerSession } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const service = new CustomerSessionService();

export const sessionsRouter = Router();

sessionsRouter.post(
  '/sessions',
  authRateLimit,
  validate({ body: OpenCustomerSessionRequestSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as { qrToken: string; locale: 'ar' | 'fr' | 'en' };
    const result = await service.open(body);
    sendSuccess(res, result, 201);
  }),
);

sessionsRouter.post(
  '/sessions/renew',
  requireCustomerSession,
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const result = await service.renewIfNeeded(req.customerSession.id);
    if (!result) throw new UnauthorizedError('Session expired');
    sendSuccess(res, result);
  }),
);

registerTag('sessions', 'Customer QR-token sessions (no account required).');

const jsonOk = {
  '200': {
    description: 'OK',
    content: { 'application/json': { schema: { type: 'object' } } },
  },
};

registerPath('post', '/sessions', {
  summary: 'Open a customer session from a QR token',
  tags: ['sessions'],
  responses: { '201': { description: 'Created' } },
});
registerPath('post', '/sessions/renew', {
  summary: 'Renew the current customer session if it is close to expiry',
  tags: ['sessions'],
  responses: jsonOk,
});
