import { pino } from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'orvexa-api', env: config.env },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      '*.password',
      '*.token',
    ],
    remove: true,
  },
});

export type Logger = typeof logger;
