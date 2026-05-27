import type {
  AddOrderItemsRequest,
  Category,
  Dish,
  LanguageCode,
  Order,
  PlaceOrderRequest,
} from '@orvexa/shared';
import { apiRequest } from './client.js';

export type MenuTreeCategory = Category & { dishes: Dish[] };

export type CustomerSessionResponse = {
  session: {
    id: string;
    restaurantId: string;
    tableId: string;
    tableLabel: string;
    locale: LanguageCode;
    expiresAt: string;
  };
  token: string;
};

export type RestaurantInfo = {
  id: string;
  slug: string;
  name: string;
  defaultLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  currency: 'TND';
  taxPercent: number;
  servicePercent: number;
  timezone: string;
};

export const api = {
  openSession(qrToken: string, locale: LanguageCode) {
    return apiRequest<CustomerSessionResponse>('/sessions', {
      method: 'POST',
      body: { qrToken, locale },
    });
  },
  renewSession(token: string) {
    return apiRequest<CustomerSessionResponse>('/sessions/renew', {
      method: 'POST',
      token,
    });
  },
  getRestaurant(token: string) {
    return apiRequest<RestaurantInfo>('/restaurant', { token });
  },
  getMenu(token: string) {
    return apiRequest<MenuTreeCategory[]>('/menu', { token });
  },
  placeOrder(token: string, body: PlaceOrderRequest) {
    return apiRequest<Order[]>('/orders', { method: 'POST', token, body });
  },
  addItemsToOrder(token: string, orderId: string, body: AddOrderItemsRequest) {
    return apiRequest<Order>(`/orders/${orderId}/items`, { method: 'POST', token, body });
  },
  cancelOrder(token: string, orderId: string) {
    return apiRequest<Order>(`/orders/${orderId}/cancel`, { method: 'POST', token });
  },
  removeOrderItem(token: string, orderId: string, itemId: string) {
    return apiRequest<Order>(`/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      token,
    });
  },
  getOrder(token: string, orderId: string) {
    return apiRequest<Order>(`/orders/${orderId}`, { token });
  },
  callWaiter(token: string, tableId: string) {
    return apiRequest<{ id: string; createdAt: string }>(`/tables/${tableId}/call-waiter`, {
      method: 'POST',
      token,
    });
  },
  getCart(token: string) {
    return apiRequest<{
      id: string;
      restaurantId: string;
      tableId: string;
      ownerSessionId: string;
      items: Array<{
        uid: string;
        dishId: string;
        quantity: number;
        variantIds: string[];
        notes?: string;
      }>;
      updatedAt: string;
    }>(`/carts/me`, { token });
  },
  putCart(token: string, items: unknown[]) {
    // Items are stored verbatim on the server (passthrough). Caller passes
    // their enriched CartLine snapshot so peers can render without re-fetch.
    const payload = items.map((line) => {
      const l = line as {
        uid: string;
        dishId: string;
        quantity: number;
        variants?: Array<{ variantId: string }>;
        variantIds?: string[];
        notes?: string;
      };
      return {
        ...l,
        variantIds: l.variantIds ?? (l.variants ?? []).map((v) => v.variantId),
      };
    });
    return apiRequest<{
      ownerSessionId: string;
      items: unknown[];
      updatedAt: string;
    }>(`/carts/me`, { method: 'PUT', token, body: { items: payload } });
  },
  clearCart(token: string) {
    return apiRequest<{ ok: true }>(`/carts/me`, { method: 'DELETE', token });
  },
  requestExtras(token: string, tableId: string, body: { items: string[]; note?: string }) {
    return apiRequest<{ id: string; createdAt: string }>(`/tables/${tableId}/request-extras`, {
      method: 'POST',
      token,
      body,
    });
  },
  requestBill(token: string, tableId: string) {
    return apiRequest<{ id: string; createdAt: string }>(`/tables/${tableId}/request-bill`, {
      method: 'POST',
      token,
    });
  },
  submitFeedback(token: string, orderId: string, body: { rating: number; comment?: string }) {
    return apiRequest<{ id: string; createdAt: string }>(`/orders/${orderId}/feedback`, {
      method: 'POST',
      token,
      body,
    });
  },
};
