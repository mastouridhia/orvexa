import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { ApiErrorCode } from '@orvexa/shared';
import { successEnvelope, errorEnvelope, sendSuccess, sendError } from './envelope.js';

describe('envelope', () => {
  it('successEnvelope wraps data with null error and no meta key by default', () => {
    const env = successEnvelope({ id: 'x' });
    expect(env).toEqual({ data: { id: 'x' }, error: null });
    expect(Object.prototype.hasOwnProperty.call(env, 'meta')).toBe(false);
  });

  it('successEnvelope includes meta when provided', () => {
    const env = successEnvelope([1, 2], { pagination: { page: 1, pageSize: 10, total: 2 } });
    expect(env).toEqual({
      data: [1, 2],
      error: null,
      meta: { pagination: { page: 1, pageSize: 10, total: 2 } },
    });
  });

  it('errorEnvelope wraps an ApiError and nulls data', () => {
    const env = errorEnvelope({ code: ApiErrorCode.NOT_FOUND, message: 'gone' });
    expect(env).toEqual({ data: null, error: { code: ApiErrorCode.NOT_FOUND, message: 'gone' } });
  });

  it('sendSuccess writes the envelope to the response with default 200', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    sendSuccess(res, { ok: true });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ data: { ok: true }, error: null });
  });

  it('sendError writes an error envelope at the given status', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    sendError(res, 422, { code: ApiErrorCode.VALIDATION_ERROR, message: 'bad' });
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: ApiErrorCode.VALIDATION_ERROR, message: 'bad' },
    });
  });
});
