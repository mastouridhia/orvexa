import { useEffect, useRef } from 'react';
import type { CartUpdatedPayload } from '@orvexa/shared';
import { api } from '../api/queries.js';
import { useCartStore, type CartLine } from '../store/cart.js';
import { useSessionStore } from '../store/session.js';
import { connectCustomerSocket } from '../socket/client.js';

/**
 * Keeps the local Zustand cart in sync with the server-side shared cart so all
 * sessions at the same table see each other's additions in real-time.
 *
 * Call once in Menu (the primary cart-building screen). Not idempotent across
 * multiple simultaneous mounts — it should only be mounted in one place.
 *
 * Flow:
 *  1. On mount: GET /carts/me → load server state (or push local state up if
 *     server is empty and local isn't).
 *  2. On every user-driven cart mutation: debounced PUT /carts/me.
 *  3. On cart:updated socket event from a peer: replace local cart from payload.
 */
export function useSharedCart() {
  const token = useSessionStore((s) => s.token);
  const sessionId = useSessionStore((s) => s.session?.id);
  const lines = useCartStore((s) => s.lines);
  const replaceFromServer = useCartStore((s) => s.replaceFromServer);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents the sync effect from echoing back a change that just came from
  // the server (either hydration or a peer's cart:updated event).
  const isServerUpdate = useRef(false);

  // Hydrate on mount.
  useEffect(() => {
    if (!token) return;
    api
      .getCart(token)
      .then((cart) => {
        if (cart.items.length > 0) {
          isServerUpdate.current = true;
          replaceFromServer(cart.items as unknown as CartLine[], cart.ownerSessionId);
        } else {
          // Server cart is empty — first scan. Push any local state up so
          // subsequent scanners at this table see what was already in the cart.
          const local = useCartStore.getState().lines;
          if (local.length > 0) {
            void api.putCart(token, local);
          }
        }
      })
      .catch(() => {});
  }, [token, replaceFromServer]);

  // Sync to server on user-driven cart changes (debounced 400 ms).
  // Empty-cart clears are handled explicitly by CartDrawer via DELETE /carts/me.
  useEffect(() => {
    if (!token || lines.length === 0) return;
    if (isServerUpdate.current) {
      isServerUpdate.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void api.putCart(token, lines);
    }, 400);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [token, lines]);

  // Listen for peer updates via socket.
  useEffect(() => {
    if (!token || !sessionId) return;
    const socket = connectCustomerSocket(token);
    const handler = (payload: CartUpdatedPayload) => {
      if (payload.bySessionId === sessionId) return; // ignore own echo
      isServerUpdate.current = true;
      replaceFromServer(payload.items as unknown as CartLine[], payload.ownerSessionId);
    };
    socket.on('cart:updated', handler);
    return () => {
      socket.off('cart:updated', handler);
    };
  }, [token, sessionId, replaceFromServer]);
}
