import { ApiErrorCode } from '@orvexa/shared';

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: { details?: unknown; expose?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.expose = options.expose ?? status < 500;
    if (options.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Invalid request', details?: unknown) {
    super(400, ApiErrorCode.VALIDATION_ERROR, message, { details });
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(401, ApiErrorCode.UNAUTHORIZED, message, { details });
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, ApiErrorCode.FORBIDDEN, message, { details });
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found', details?: unknown) {
    super(404, ApiErrorCode.NOT_FOUND, message, { details });
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, ApiErrorCode.CONFLICT, message, { details });
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(429, ApiErrorCode.RATE_LIMITED, message, { details });
  }
}

export class NotOnPremisesError extends HttpError {
  constructor(message = 'You must be at the restaurant to place an order', details?: unknown) {
    super(403, ApiErrorCode.NOT_ON_PREMISES, message, { details });
  }
}

export class TableNotOpenError extends HttpError {
  constructor(message = 'Ask your waiter for the table code to start ordering', details?: unknown) {
    super(403, ApiErrorCode.TABLE_NOT_OPEN, message, { details });
  }
}

export class InternalError extends HttpError {
  constructor(message = 'Internal server error', options: { cause?: unknown } = {}) {
    super(500, ApiErrorCode.INTERNAL, message, { expose: false, cause: options.cause });
  }
}
