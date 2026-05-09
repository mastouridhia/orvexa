import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@orvexa/shared';
import { apiBaseUrl } from '../api/client.js';

export type StaffSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let current: StaffSocket | null = null;
let currentToken: string | null = null;

export function connectAdminSocket(token: string): StaffSocket {
  if (current && currentToken === token && current.connected) return current;
  if (current) current.disconnect();
  currentToken = token;
  const s: StaffSocket = io(apiBaseUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });
  current = s;
  return s;
}

export function disconnectAdminSocket(): void {
  if (current) {
    current.disconnect();
    current = null;
    currentToken = null;
  }
}
