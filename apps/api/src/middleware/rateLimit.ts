import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ApiErrorCode } from '@orvexa/shared';
import { config } from '../config.js';
import { errorEnvelope } from '../utils/envelope.js';

const tooManyRequestsHandler = (_req: unknown, res: { status: (n: number) => { json: (o: unknown) => unknown } }): void => {
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
  handler: tooManyRequestsHandler as never,
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
  handler: tooManyRequestsHandler as never,
});

/**
 * Stricter limiter for the auth surface — login + refresh + sessions issuance.
 * Sized for low double-digit attempts per IP per minute (default 10/min) to slow
 * credential-stuffing without inconveniencing legitimate users on flaky networks.
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Skip successful auth — only count failures + early aborts. Keeps a busy
  // logged-in session from being self-throttled when the access token expires.
  skipSuccessfulRequests: true,
  handler: tooManyRequestsHandler as never,
});
