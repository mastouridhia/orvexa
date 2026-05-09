import { Router } from 'express';
import { z } from 'zod';
import { TableCartService } from '../services/table-cart.js';
import { requireCustomerSession } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const service = new TableCartService();

export const cartsRouter = Router();

// `passthrough()` lets the customer client persist its enriched display
// snapshot (name, unitPriceMillimes, imageUrl, variant labels) so peer
// sessions can render the cart without re-resolving every dish.
const ItemSchema = z
  .object({
    uid: z.string().min(1).max(64),
    dishId: z.string().uuid(),
    quantity: z.number().int().positive().max(99),
    variantIds: z.array(z.string().uuid()).default([]),
    notes: z.string().max(500).optional(),
  })
  .passthrough();

const SetItemsBody = z.object({
  items: z.array(ItemSchema).max(60),
});

cartsRouter.get(
  '/carts/me',
  requireCustomerSession,
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const cart = await service.getOrCreate({
      restaurantId: req.customerSession.restaurantId,
      tableId: req.customerSession.tableId,
      tableDayTokenId: req.customerSession.tableDayTokenId,
      sessionId: req.customerSession.id,
    });
    sendSuccess(res, cart);
  }),
);

cartsRouter.put(
  '/carts/me',
  requireCustomerSession,
  validate({ body: SetItemsBody }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const body = req.body as z.infer<typeof SetItemsBody>;
    const cart = await service.setItems({
      tableId: req.customerSession.tableId,
      sessionId: req.customerSession.id,
      items: body.items,
    });
    getBus().cartUpdated({
      tableId: cart.tableId,
      ownerSessionId: cart.ownerSessionId,
      items: cart.items,
      bySessionId: req.customerSession.id,
      updatedAt: cart.updatedAt,
    });
    sendSuccess(res, cart);
  }),
);

cartsRouter.delete(
  '/carts/me',
  requireCustomerSession,
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    await service.clear({
      tableId: req.customerSession.tableId,
      sessionId: req.customerSession.id,
    });
    getBus().cartUpdated({
      tableId: req.customerSession.tableId,
      ownerSessionId: req.customerSession.id,
      items: [],
      bySessionId: req.customerSession.id,
      updatedAt: new Date().toISOString(),
    });
    sendSuccess(res, { ok: true });
  }),
);

registerTag('carts', 'Shared table cart (multiple sessions on the same QR token).');
const okResponses = { '200': { description: 'OK' } };
registerPath('get', '/carts/me', {
  summary: 'Get (or create) the shared cart for the caller table',
  tags: ['carts'],
  responses: okResponses,
});
registerPath('put', '/carts/me', {
  summary: 'Replace the shared cart items (any session on the same day-token)',
  tags: ['carts'],
  responses: okResponses,
});
registerPath('delete', '/carts/me', {
  summary: 'Clear the shared cart (cart owner only)',
  tags: ['carts'],
  responses: okResponses,
});
