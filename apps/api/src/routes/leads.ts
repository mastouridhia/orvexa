import { Router } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ApiErrorCode } from '@orvexa/shared';
import { sendLeadEmail } from '../services/email.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess, errorEnvelope } from '../utils/envelope.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  restaurant: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal('').transform(() => undefined)),
  message: z.string().trim().max(1000).optional(),
});

// Public, unauthenticated endpoint — keep a tight per-IP limit so the form
// can't be used to spam the inbox.
const leadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `lead:${ipKeyGenerator(req.ip ?? '')}`,
  handler: (_req: Request, res: Response) =>
    res
      .status(429)
      .json(errorEnvelope({ code: ApiErrorCode.RATE_LIMITED, message: 'Too many requests' })),
});

export const leadsRouter = Router();

leadsRouter.post(
  '/leads',
  leadRateLimit,
  validate({ body: LeadSchema }),
  asyncHandler(async (req, res) => {
    await sendLeadEmail(req.body);
    sendSuccess(res, { received: true }, 201);
  }),
);

registerTag('leads', 'Public sales lead capture (landing page contact form).');
registerPath('post', '/leads', {
  summary: 'Submit a sales lead from the public landing page',
  tags: ['leads'],
  responses: { '201': { description: 'Created' } },
});
