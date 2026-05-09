import rateLimit from 'express-rate-limit';
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
