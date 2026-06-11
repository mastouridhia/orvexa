import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, StaffRole } from '@orvexa/shared';
import { corsOptions } from '../middleware/cors.js';
import { logger } from '../utils/logger.js';
import { resolveHandshakeIdentity, type SocketIdentity } from './auth.js';
import { kitchenRoom, restaurantRoom, tableRoom, waiterRoom } from './rooms.js';
import {
  RealtimeBus,
  setBus,
  type InterServerEvents,
  type SocketData,
  type OrvexaIo,
} from './bus.js';

const KITCHEN_ROLES = new Set<StaffRole>(['admin', 'manager', 'kitchen']);
const WAITER_ROLES = new Set<StaffRole>(['admin', 'manager', 'waiter']);

function joinRoomsForIdentity(
  socket: Parameters<Parameters<OrvexaIo['on']>[1]>[0],
  identity: SocketIdentity,
): string[] {
  const rooms: string[] = [restaurantRoom(identity.restaurantId)];
  if (identity.kind === 'customer') {
    rooms.push(tableRoom(identity.tableId));
  } else {
    if (KITCHEN_ROLES.has(identity.role)) rooms.push(kitchenRoom(identity.restaurantId));
    if (WAITER_ROLES.has(identity.role)) rooms.push(waiterRoom(identity.restaurantId));
  }
  for (const room of rooms) void socket.join(room);
  return rooms;
}

export function attachRealtime(httpServer: HttpServer): { io: OrvexaIo; bus: RealtimeBus } {
  const io: OrvexaIo = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, { cors: corsOptions });

  io.use((socket, next) => {
    resolveHandshakeIdentity(socket.handshake)
      .then((identity) => {
        socket.data.identity = identity;
        next();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unauthorized';
        logger.debug({ err: msg, socketId: socket.id }, 'socket handshake rejected');
        next(new Error(msg));
      });
  });

  io.on('connection', (socket) => {
    const identity = socket.data.identity;
    if (!identity) {
      socket.disconnect(true);
      return;
    }
    const rooms = joinRoomsForIdentity(socket, identity);
    logger.debug(
      {
        socketId: socket.id,
        identityKind: identity.kind,
        restaurantId: identity.restaurantId,
        rooms,
      },
      'socket connected',
    );

    // Throttle subscribe events: max 5 per 10 s per socket. A legitimate
    // client subscribes once on connect; anything more is a reconnect loop.
    let subscribeCount = 0;
    let subscribeWindowStart = Date.now();
    const guardSubscribe = (): boolean => {
      const now = Date.now();
      if (now - subscribeWindowStart > 10_000) {
        subscribeCount = 0;
        subscribeWindowStart = now;
      }
      subscribeCount++;
      if (subscribeCount > 5) {
        socket.disconnect(true);
        return false;
      }
      return true;
    };

    socket.on('customer:subscribe', () => { guardSubscribe(); });
    socket.on('staff:subscribe', () => { guardSubscribe(); });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  const bus = new RealtimeBus(io);
  setBus(bus);
  return { io, bus };
}
