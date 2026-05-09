import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@orvexa/shared';
import { apiBaseUrl } from '../api/client.js';

export type CustomerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let current: CustomerSocket | null = null;

export function connectCustomerSocket(token: string): CustomerSocket {
  if (current) {
    if (current.connected) return current;
    current.disconnect();
  }
  const s: CustomerSocket = io(apiBaseUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 700,
    reconnectionDelayMax: 5000,
  });
  current = s;
  return s;
}

export function getCustomerSocket(): CustomerSocket | null {
  return current;
}

export function disconnectCustomerSocket(): void {
  if (current) {
    current.disconnect();
    current = null;
  }
}
