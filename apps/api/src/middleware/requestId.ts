import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const HEADER = 'x-request-id';

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get(HEADER);
  const id = incoming && incoming.length > 0 && incoming.length <= 128 ? incoming : randomUUID();
  req.id = id;
  res.setHeader(HEADER, id);
  next();
};
