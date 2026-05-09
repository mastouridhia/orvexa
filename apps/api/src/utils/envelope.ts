import type { Response } from 'express';
import type { ApiError, ApiResponse, Pagination } from '@orvexa/shared';

export type EnvelopeMeta = { pagination?: Pagination } & Record<string, unknown>;

export function successEnvelope<T>(data: T, meta?: EnvelopeMeta): ApiResponse<T> {
  return meta ? { data, error: null, meta } : { data, error: null };
}

export function errorEnvelope(error: ApiError): ApiResponse<null> {
  return { data: null, error };
}

export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: EnvelopeMeta): void {
  res.status(status).json(successEnvelope(data, meta));
}

export function sendError(res: Response, status: number, error: ApiError): void {
  res.status(status).json(errorEnvelope(error));
}
