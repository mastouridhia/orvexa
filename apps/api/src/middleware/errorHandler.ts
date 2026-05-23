import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiErrorCode } from '@orvexa/shared';
import { HttpError, NotFoundError } from '../utils/errors.js';
import { errorEnvelope } from '../utils/envelope.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  req.log?.debug({ method: req.method, path: req.path }, 'route not found');
  next(new NotFoundError('Not found'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    req.log.error({ err }, 'error after headers sent');
    return;
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) req.log.error({ err }, err.message);
    else req.log.warn({ err }, err.message);

    res.status(err.status).json(
      errorEnvelope({
        code: err.code,
        message: err.expose ? err.message : 'Internal server error',
        ...(err.details !== undefined ? { details: err.details } : {}),
      }),
    );
    return;
  }

  req.log.error({ err }, 'unhandled error');
  res.status(500).json(
    errorEnvelope({
      code: ApiErrorCode.INTERNAL,
      message: 'Internal server error',
    }),
  );
};
