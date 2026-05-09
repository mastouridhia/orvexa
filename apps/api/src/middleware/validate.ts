import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Invalid request', { issues: err.issues }));
        return;
      }
      next(err);
    }
  };
}
