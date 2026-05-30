import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ApiErrorCode } from '@orvexa/shared';
import { config } from '../config.js';
import { errorEnvelope } from '../utils/envelope.js';

const tooManyRequestsHandler = (_req: Request, res: Response): void => {
  res.status(429).json(
    errorEnvelope({
      code: ApiErrorCode.RATE_LIMITED,
      message: 'Too many requests',
    }),
  );
};

export const globalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
});

/**
 * Per-session order limiter: all tables share the same WiFi exit IP so a
 * per-IP global limit would let one table starve every other. Keyed on the
 * customer session id (falls back to IP for requests without a session).
 */
export const orderRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.customerSession?.id ?? ipKeyGenerator(req.ip ?? ''),
  handler: tooManyRequestsHandler,
});

/**
 * Stricter limiter for the auth surface — login + refresh only.
 * Skips successful requests so a legitimate session cycling access tokens
 * doesn't self-throttle. Never use this on POST /sessions — that route needs
 * to count successes too (see sessionMintLimit below).
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: tooManyRequestsHandler,
});

/**
 * Session-mint limiter for POST /sessions (QR-token → JWT exchange).
 * Does NOT skip successful requests so bulk session creation is bounded.
 * 20/min handles a full-room scan burst on a shared café NAT IP without
 * blocking individual legitimate customers.
 */
export const sessionMintLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
});
