import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler<
  P = Request['params'],
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Request['query'],
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
