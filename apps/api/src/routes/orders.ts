import { Router } from 'express';
import { z } from 'zod';
import {
  AddOrderItemsRequestSchema,
  AdvanceSectionRequestSchema,
  OrderHistoryQuerySchema,
  OrderListQuerySchema,
  PlaceOrderRequestSchema,
  UpdateOrderStatusRequestSchema,
  UuidSchema,
} from '@orvexa/shared';
import { OrderService } from '../services/order.js';
import { RestaurantService } from '../services/restaurant.js';
import { TableService } from '../services/table.js';
import {
  requireAnyAuth,
  requireAuth,
  requireCustomerSession,
  requireRole,
  resolveRestaurantId,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { orderCooldown, orderRateLimit } from '../middleware/rateLimit.js';
import { requirePresence } from '../middleware/presence.js';
import { redis } from '../cache/client.js';
import { OrderRepository } from '../repositories/order.js';
import { RateLimitError } from '../utils/errors.js';
import { registerPath, registerTag } from '../utils/openapi.js';
import { getBus } from '../realtime/bus.js';

const service = new OrderService();
const restaurantService = new RestaurantService();
const tableService = new TableService();
const orderRepo = new OrderRepository();

async function emitTableStatus(restaurantId: string, tableId: string): Promise<void> {
  const status = await tableService.deriveForTable(restaurantId, tableId);
  if (status) getBus().tableStatusChanged(restaurantId, tableId, status);
}
const IdParams = z.object({ id: UuidSchema });
const OrderItemIdParams = z.object({ id: UuidSchema, itemId: UuidSchema });
const TableParams = z.object({ tableId: UuidSchema });

export const ordersRouter = Router();

// ─── Customer ───────────────────────────────────────────────

ordersRouter.post(
  '/orders',
  requireCustomerSession,
  orderRateLimit,
  orderCooldown,
  requirePresence,
  validate({ body: PlaceOrderRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const { restaurantId, tableId } = req.customerSession;

    // 23.14 Idempotency: return the cached response if this key was seen in the last 2 min.
    const idemHeader = req.headers['x-idempotency-key'];
    const idemKey = typeof idemHeader === 'string' ? idemHeader.slice(0, 128) : undefined;
    if (idemKey) {
      const rKey = `idem:${restaurantId}:${idemKey}`;
      try {
        const cached = await redis.get(rKey);
        if (cached) {
          sendSuccess(res, JSON.parse(cached));
          return;
        }
      } catch { /* Redis down — proceed normally */ }
    }

    // 23.13 Per-table order ceiling (waiter can bypass for 30 min via DELETE /tables/:id/order-ceiling).
    try {
      const bypass = await redis.get(`ceiling:bypass:${tableId}`);
      if (!bypass) {
        const [restaurant, active] = await Promise.all([
          restaurantService.get(restaurantId),
          orderRepo.countActiveForTable(restaurantId, tableId),
        ]);
        if (active >= restaurant.orderCeiling) {
          throw new RateLimitError(
            'Too many open orders at this table — ask your waiter to unlock more.',
          );
        }
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      // Redis/DB glitch — skip ceiling rather than blocking the customer.
    }

    const placedOrders = await service.placeMulti({
      restaurantId,
      tableId,
      tableDayTokenId: null,
      sessionId: req.customerSession.id,
      body: req.body,
    });
    for (const o of placedOrders) getBus().orderCreated(o);
    await emitTableStatus(placedOrders[0]!.restaurantId, placedOrders[0]!.tableId);

    if (idemKey) {
      const rKey = `idem:${restaurantId}:${idemKey}`;
      try {
        await redis.set(rKey, JSON.stringify(placedOrders), 'EX', 120);
      } catch { /* ignore */ }
    }

    sendSuccess(res, placedOrders, 201);
  }),
);

// ─── Staff placing orders on behalf of a table ─────────────────────────────

ordersRouter.post(
  '/tables/:tableId/orders',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: TableParams, body: PlaceOrderRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const orders = await service.placeMulti({
      restaurantId: req.user.restaurantId,
      tableId: req.params.tableId,
      tableDayTokenId: null,
      sessionId: null,
      body: req.body,
    });
    for (const o of orders) getBus().orderCreated(o);
    await emitTableStatus(orders[0]!.restaurantId, orders[0]!.tableId);
    sendSuccess(res, orders, 201);
  }),
);

ordersRouter.post(
  '/orders/:id/items',
  requireCustomerSession,
  orderRateLimit,
  requirePresence,
  validate({ params: IdParams, body: AddOrderItemsRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const order = await service.addItems({
      restaurantId: req.customerSession.restaurantId,
      orderId: req.params.id,
      sessionId: req.customerSession.id,
      body: req.body,
    });
    sendSuccess(res, order);
  }),
);

ordersRouter.post(
  '/orders/:id/items/staff',
  requireAuth,
  requireRole('admin', 'manager', 'waiter'),
  validate({ params: IdParams, body: AddOrderItemsRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const order = await service.addItems({
      restaurantId: req.user.restaurantId,
      orderId: req.params.id,
      sessionId: null,
      body: req.body,
    });
    sendSuccess(res, order);
  }),
);

ordersRouter.delete(
  '/orders/:id/items/:itemId',
  requireCustomerSession,
  validate({ params: OrderItemIdParams }),
  asyncHandler(async (req, res) => {
    if (!req.customerSession) throw new UnauthorizedError('Customer session required');
    const order = await service.removeItem({
      restaurantId: req.customerSession.restaurantId,
      orderId: req.params.id,
      itemId: req.params.itemId,
      sessionId: req.customerSession.id,
    });
    sendSuccess(res, order);
  }),
);

// ─── Shared (customer sees own order, staff sees any within restaurant) ─

ordersRouter.get(
  '/orders/active',
  requireAuth,
  requireRole('admin', 'manager', 'kitchen', 'waiter', 'cashier'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await service.listActive(req.user.restaurantId);
    sendSuccess(res, list);
  }),
);

ordersRouter.get(
  '/orders/open-bills',
  requireAuth,
  requireRole('admin', 'manager', 'cashier', 'waiter'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const list = await service.listOpenBills(req.user.restaurantId);
    sendSuccess(res, list);
  }),
);

ordersRouter.get(
  '/orders/history',
  requireAuth,
  requireRole('admin', 'manager'),
  validate({ query: OrderHistoryQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const result = await service.history(req.user.restaurantId, req.query as never);
    sendSuccess(res, result);
  }),
);

ordersRouter.get(
  '/orders',
  requireAuth,
  requireRole('admin', 'manager', 'waiter', 'kitchen'),
  validate({ query: OrderListQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const result = await service.list(req.user.restaurantId, req.query as never);
    sendSuccess(res, result);
  }),
);

ordersRouter.get(
  '/orders/:id',
  requireAnyAuth,
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (req.user) {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) throw new UnauthorizedError('No restaurant context');
      const order = await service.get(restaurantId, req.params.id);
      sendSuccess(res, order);
      return;
    }
    if (req.customerSession) {
      const order = await service.getForCustomer(req.customerSession.id, req.params.id);
      sendSuccess(res, order);
      return;
    }
    throw new ForbiddenError('No auth context');
  }),
);

// ─── Staff ──────────────────────────────────────────────────

ordersRouter.patch(
  '/orders/:id/status',
  requireAuth,
  requireRole('admin', 'manager', 'kitchen', 'waiter'),
  validate({ params: IdParams, body: UpdateOrderStatusRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const order = await service.updateStatus(
      req.user.restaurantId,
      req.params.id,
      req.body,
      req.user.role,
    );
    getBus().orderStatusChanged(order);
    await emitTableStatus(order.restaurantId, order.tableId);
    sendSuccess(res, order);
  }),
);

ordersRouter.patch(
  '/orders/:id/advance-section',
  requireAuth,
  requireRole('admin', 'manager', 'kitchen', 'waiter'),
  validate({ params: IdParams, body: AdvanceSectionRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const order = await service.advanceSection(req.user.restaurantId, req.params.id, req.body);
    getBus().orderStatusChanged(order);
    await emitTableStatus(order.restaurantId, order.tableId);
    sendSuccess(res, order);
  }),
);

ordersRouter.post(
  '/orders/:id/cancel',
  requireAnyAuth,
  validate({ params: IdParams }),
  asyncHandler(async (req, res) => {
    if (req.user) {
      const order = await service.cancel(req.user.restaurantId, req.params.id);
      getBus().orderStatusChanged(order);
      await emitTableStatus(order.restaurantId, order.tableId);
      sendSuccess(res, order);
      return;
    }
    if (req.customerSession) {
      const order = await service.cancelForCustomer(req.customerSession.id, req.params.id);
      getBus().orderStatusChanged(order);
      await emitTableStatus(order.restaurantId, order.tableId);
      sendSuccess(res, order);
      return;
    }
    throw new ForbiddenError('No auth context');
  }),
);

registerTag('orders', 'Order placement, lifecycle, and history.');

const okResponses = { '200': { description: 'OK' } };
const createdResponse = { '201': { description: 'Created' } };
registerPath('post', '/orders', {
  summary: 'Place an order (customer session)',
  tags: ['orders'],
  responses: createdResponse,
});
registerPath('post', '/tables/{tableId}/orders', {
  summary: 'Place an order for a table (staff)',
  tags: ['orders'],
  responses: createdResponse,
});
registerPath('post', '/orders/{id}/items', {
  summary: 'Append items to an order that is still `received`',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('post', '/orders/{id}/items/staff', {
  summary: 'Append items to an order that is still `received` (staff)',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('delete', '/orders/{id}/items/{itemId}', {
  summary: 'Remove an item from an order that is still `received`',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('get', '/orders/active', {
  summary: 'Live feed of active orders (received/preparing/ready)',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('get', '/orders/open-bills', {
  summary:
    'Cross-table list of unpaid (non-cancelled) orders — used by cashier and waiter to settle bills',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('get', '/orders/history', {
  summary: 'Terminal orders with optional date range (admin/manager)',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('get', '/orders', {
  summary: 'Paginated orders list, optionally filtered by status',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('get', '/orders/{id}', {
  summary: 'Get an order by id (staff OR customer session owning the order)',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('patch', '/orders/{id}/status', {
  summary: 'Advance the order through the state machine (kitchen/waiter/admin/manager)',
  tags: ['orders'],
  responses: okResponses,
});
registerPath('post', '/orders/{id}/cancel', {
  summary:
    'Cancel an order (customer can cancel while `received`; staff while `received` or `preparing`)',
  tags: ['orders'],
  responses: okResponses,
});
