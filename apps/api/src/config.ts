import 'dotenv/config';

function parseList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const DEV_FALLBACK = 'change-me-dev-only';

function requiredSecret(name: string, fallback: string): string {
  const v = process.env[name];
  if (v && v.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      if (v.length < 32) throw new Error(`${name} must be at least 32 characters`);
      if (v === DEV_FALLBACK)
        throw new Error(`${name} must not be the development fallback in production`);
    }
    return v;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInteger(process.env.PORT, 4000),

  clientOrigins: parseList(process.env.CLIENT_ORIGINS ?? process.env.CLIENT_ORIGIN, [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
  ]),

  logLevel: process.env.LOG_LEVEL ?? 'info',
  bodyLimit: process.env.BODY_LIMIT ?? '100kb',

  rateLimit: {
    windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: parseInteger(process.env.RATE_LIMIT_MAX, 120),
  },

  shutdown: {
    timeoutMs: parseInteger(process.env.SHUTDOWN_TIMEOUT_MS, 10_000),
  },

  auth: {
    jwtSecret: requiredSecret('JWT_SECRET', 'change-me-dev-only'),
    accessTokenTtl: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
    refreshTokenTtl: process.env.JWT_REFRESH_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '7d',
    sessionSecret: requiredSecret('SESSION_JWT_SECRET', 'change-me-dev-only'),
    sessionTtl: process.env.SESSION_JWT_EXPIRES_IN ?? '12h',
    sessionRenewThreshold: process.env.SESSION_RENEW_THRESHOLD ?? '1h',
  },

  customer: {
    appUrl: process.env.CUSTOMER_APP_URL ?? 'http://localhost:5173',
  },

  uploads: {
    dir: process.env.UPLOADS_DIR ?? 'uploads',
    publicBaseUrl:
      process.env.PUBLIC_BASE_URL ?? `http://localhost:${parseInteger(process.env.PORT, 4000)}`,
    maxBytes: parseInteger(process.env.UPLOADS_MAX_BYTES, 5 * 1024 * 1024),
  },

  /**
   * When true, surfaces a "demo mode" banner across all frontends and is reported in
   * `/version`. Pair with the seed script (`npm run db:seed`) and a daily reset cron
   * to provide a sandboxed evaluation environment. Frontends read this from
   * `GET /version` so a single env flag drives the UX everywhere.
   */
  db: {
    maxConnections: parseInteger(process.env.DB_POOL_MAX, 20),
    idleTimeoutMs: parseInteger(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMs: parseInteger(process.env.DB_CONNECT_TIMEOUT_MS, 5_000),
  },

  slowRequest: {
    thresholdMs: parseInteger(process.env.SLOW_REQUEST_THRESHOLD_MS, 500),
  },

  demoMode: (process.env.DEMO_MODE ?? '').toLowerCase() === 'true',
} as const;

export type Config = typeof config;
