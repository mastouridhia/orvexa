import type {
  AuthTokens,
  KitchenSection,
  Order,
  OrderStatus,
  StaffLoginResponse,
  StaffUser,
} from '@orvexa/shared';
import { apiRequest } from './client.js';

export const api = {
  login(email: string, password: string, restaurantSlug?: string) {
    return apiRequest<StaffLoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, ...(restaurantSlug ? { restaurantSlug } : {}) },
    });
  },
  refresh(refreshToken: string) {
    return apiRequest<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },
  logout(refreshToken: string) {
    return apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST', body: { refreshToken } });
  },
  me(token: string) {
    return apiRequest<StaffUser>('/auth/me', { token });
  },
  listActive(token: string) {
    return apiRequest<Order[]>('/orders/active', { token });
  },
  updateStatus(token: string, orderId: string, status: 'preparing' | 'ready' | 'served') {
    return apiRequest<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
    });
  },
  advanceSection(
    token: string,
    orderId: string,
    section: KitchenSection,
    status: 'preparing' | 'ready',
  ) {
    return apiRequest<Order>(`/orders/${orderId}/advance-section`, {
      method: 'PATCH',
      token,
      body: { section, status },
    });
  },
  setDishAvailability(token: string, dishId: string, available: boolean) {
    return apiRequest(`/dishes/${dishId}/availability`, {
      method: 'PATCH',
      token,
      body: { available },
    });
  },
};

export type { Order, OrderStatus };
