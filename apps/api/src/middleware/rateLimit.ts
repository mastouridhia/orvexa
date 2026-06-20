import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ApiErrorCode } from '@orvexa/shared';
import { config } from '../config.js';
import { errorEnvelope } from '../utils/envelope.js';

// Integration tests drive many orders from one session in tight loops to exercise
// the per-table ceiling + idempotency code paths; the per-session order limiters
// (8 s cooldown / 10-per-min) would short-circuit those before the logic under test
// runs. Skip them under NODE_ENV=test only — never in dev or production.
const skipInTest = (): boolean => process.env.NODE_ENV === 'test';

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
  // Authenticated staff all share one restaurant IP — skip the IP-based global
  // limit for them; their JWT auth is the throttle. Unauthenticated requests
  // (customer, public) still get rate-limited.
  skip: (req: Request) => !!req.headers.authorization?.startsWith('Bearer '),
  handler: tooManyRequestsHandler,
});

/**
 * Per-session order limiter: all tables share the same WiFi exit IP so a
 * per-IP global limit would let one table starve every other. Keyed on the
 * customer session id (falls back to IP for requests without a session).
 * 10 submissions/min ≈ one every 6 s — more than enough for any real customer.
 */
export const orderRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.customerSession?.id ?? ipKeyGenerator(req.ip ?? ''),
  skip: skipInTest,
  handler: tooManyRequestsHandler,
});

/**
 * Enforces a minimum gap between consecutive order submissions from the same
 * session. Prevents rapid double-taps or client retry loops from creating
 * duplicate orders even when the idempotency key is missing.
 * Window = 8 s, limit = 1 → at most one submission per 8 s per session.
 */
export const orderCooldown = rateLimit({
  windowMs: 8 * 1000,
  limit: 1,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `cooldown:${req.customerSession?.id ?? ipKeyGenerator(req.ip ?? '')}`,
  skip: skipInTest,
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
 * Hard cooldown for password-reset requests: one per email address per minute.
 * authRateLimit alone isn't enough here — it has skipSuccessfulRequests, so a
 * stream of *successful* forgot-password posts is never counted and a user can
 * spam reset emails. Each new request invalidates the previous reset link, so
 * spamming leaves a trail of dead links and confusing 404s on the reset page.
 * This limiter counts successes and is keyed on the target email so a shared
 * NAT IP doesn't block unrelated users (falls back to IP when email is absent).
 */
export const forgotPasswordCooldown = rateLimit({
  windowMs: 60 * 1000,
  limit: 1,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `forgot:${email || ipKeyGenerator(req.ip ?? '')}`;
  },
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
