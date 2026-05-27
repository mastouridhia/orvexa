import { ConflictError, InternalError } from './errors.js';

interface PgError {
  code?: string;
  constraint?: string;
  detail?: string;
}

/**
 * Maps known Postgres error codes to typed HttpErrors so callers get a
 * meaningful status code instead of a generic 500.
 *
 * Call this inside a catch block before re-throwing:
 *   try { ... } catch (err) { throw wrapDbError(err); }
 */
export function wrapDbError(err: unknown): unknown {
  if (!isPgError(err)) return new InternalError('Database error', { cause: err });

  switch (err.code) {
    case '23505': // unique_violation
      return new ConflictError(
        err.detail ? `Duplicate value: ${err.detail}` : 'A record with that value already exists',
      );
    case '23503': // foreign_key_violation
      return new ConflictError(
        err.detail
          ? `Referenced record not found: ${err.detail}`
          : 'Referenced record does not exist',
      );
    case '23502': // not_null_violation
      return new InternalError('Required field missing', { cause: err });
    case '23514': // check_violation
      return new InternalError('Data integrity check failed', { cause: err });
    default:
      return new InternalError('Database error', { cause: err });
  }
}

function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string'
  );
}
