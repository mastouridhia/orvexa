import { Router } from 'express';
import { config } from '../config.js';
import { pool } from '../db/index.js';
import { sendSuccess } from '../utils/envelope.js';
import { versionInfo } from '../utils/version.js';
import { registerPath, registerTag } from '../utils/openapi.js';

const startedAt = Date.now();

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  sendSuccess(res, {
    ok: true,
    service: versionInfo.name,
    uptimeMs: Date.now() - startedAt,
  });
});

healthRouter.get('/health/db', async (_req, res, next) => {
  try {
    const result = await pool.query<{ now: string }>('select now() as now');
    sendSuccess(res, { ok: true, dbTime: result.rows[0]?.now ?? null });
  } catch (err) {
    next(err);
  }
});

healthRouter.get('/version', (_req, res) => {
  sendSuccess(res, { ...versionInfo, demoMode: config.demoMode, env: config.env });
});

registerTag('system', 'Health, version, and operational endpoints.');

const okResponse = {
  '200': {
    description: 'OK',
    content: { 'application/json': { schema: { type: 'object' } } },
  },
};

registerPath('get', '/health', {
  summary: 'Liveness check',
  tags: ['system'],
  responses: okResponse,
});

registerPath('get', '/health/db', {
  summary: 'Database readiness check (pings Postgres)',
  tags: ['system'],
  responses: okResponse,
});

registerPath('get', '/version', {
  summary: 'API version + runtime info',
  tags: ['system'],
  responses: okResponse,
});
