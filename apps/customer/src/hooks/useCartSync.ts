import { useEffect, useRef } from 'react';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import { isSessionExpiredError } from '../api/errorMessage.js';
import { useCartStore, type CartLine } from '../store/cart.js';
import { useSessionStore } from '../store/session.js';
import { connectCustomerSocket } from '../socket/client.js';

/**
 * Phase 20.19 — keeps the local cart store in sync with the server-side
 * shared cart for the table.
 *
 * - On mount: GET /carts/me to learn the owner session id (and pulls any
 *   existing items from the server, replacing the local snapshot).
 * - Subscribes to `cart:updated` socket events on the table room and merges
 *   non-self updates into the local store.
 * - Pushes local changes back via PUT /carts/me, debounced 350ms.
 *
 * Items are persisted server-side as the same enriched `CartLine` shape the
 * customer renders (name, unitPriceMillimes, imageUrl, variants), so peer
 * sessions can display the cart without re-fetching the menu.
 */
export function useCartSync(): void {
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const lines = useCartStore((s) => s.lines);
  const editingOrderId = useCartStore((s) => s.editingOrderId);
  const replaceFromServer = useCartStore((s) => s.replaceFromServer);
  const setOwner = useCartStore((s) => s.setOwner);

  const lastPushedRef = useRef<string>('');
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  // Boot: hydrate from server.
  useEffect(() => {
    if (!token || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        const cart = await api.getCart(token);
        if (cancelled) return;
        const incoming = cart.items as unknown as CartLine[];
        // Trust the server snapshot (it carries the enriched fields).
        replaceFromServer(incoming, cart.ownerSessionId);
        lastPushedRef.current = JSON.stringify(incoming);
      } catch (err) {
        // 401 here means the session is expired — clear it so the app
        // falls back to the QR-scan prompt.
        if (isSessionExpiredError(err)) {
          useSessionStore.getState().clear();
          return;
        }
        // Other network errors are silent — local cart still works.
        if (!(err instanceof ApiError)) return;
      }
    })();
    return () => {
      cancelled = true;
    };
    // session.id is the stable identity; re-run when the user re-scans.
  }, [token, session?.id, replaceFromServer, session]);

  // Subscribe to cart:updated socket pushes.
  useEffect(() => {
    if (!token || !session) return;
    const socket = connectCustomerSocket(token);
    type CartPush = {
      tableId: string;
      ownerSessionId: string;
      items: unknown[];
      bySessionId: string;
    };
    const onPush = (payload: CartPush) => {
      if (payload.bySessionId === session.id) return; // ignore self-echo
      const incoming = payload.items as CartLine[];
      replaceFromServer(incoming, payload.ownerSessionId);
      lastPushedRef.current = JSON.stringify(incoming);
    };
    socket.on('cart:updated', onPush);
    return () => {
      socket.off('cart:updated', onPush);
    };
  }, [token, session?.id, replaceFromServer, session]);

  // Push local changes (debounced) — but never while the user is editing an
  // existing placed order, that flow is per-order, not the shared cart.
  useEffect(() => {
    if (!token || !session || editingOrderId) return;
    const serialized = JSON.stringify(lines);
    if (serialized === lastPushedRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void api
        .putCart(token, lines as unknown[])
        .then((res) => {
          lastPushedRef.current = serialized;
          setOwner(res.ownerSessionId);
        })
        .catch(() => {
          // Drop — next change attempt will retry.
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    }, 350);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [lines, token, session, editingOrderId, setOwner]);
}
