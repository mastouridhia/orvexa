import type {
  AuthTokens,
  Category,
  Dish,
  Order,
  Receipt,
  RecordPaymentRequest,
  StaffLoginResponse,
  StaffUser,
  TableWithDerived,
  TableZone,
  WaiterCall,
} from '@orvexa/shared';
import { apiRequest } from './client.js';

export type MenuTreeCategory = Category & { dishes: Dish[] };

export type RecordPaymentResult = {
  order: Order;
  payment: {
    id: string;
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    amountMillimes: number;
    tipMillimes: number;
  };
  fullyPaid: boolean;
};

export const api = {
  login(email: string, password: string, restaurantSlug?: string) {
    return apiRequest<StaffLoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, ...(restaurantSlug ? { restaurantSlug } : {}) },
    });
  },
  refresh(refreshToken: string) {
    return apiRequest<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } });
  },
  logout(refreshToken: string) {
    return apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST', body: { refreshToken } });
  },
  me(token: string) {
    return apiRequest<StaffUser>('/auth/me', { token });
  },
  listTables(token: string) {
    return apiRequest<TableWithDerived[]>('/tables', { token });
  },
  listTableZones(token: string) {
    return apiRequest<TableZone[]>('/table-zones', { token });
  },
  listActiveOrders(token: string) {
    return apiRequest<Order[]>('/orders/active', { token });
  },
  listOpenBills(token: string) {
    return apiRequest<Order[]>('/orders/open-bills', { token });
  },
  getMenuPublic(token: string) {
    return apiRequest<MenuTreeCategory[]>('/menu', { token });
  },
  getOrder(token: string, orderId: string) {
    return apiRequest<Order>(`/orders/${orderId}`, { token });
  },
  placeOrderForTable(
    token: string,
    tableId: string,
    body: {
      items: Array<{ dishId: string; quantity: number; variantIds: string[]; notes?: string }>;
    },
  ) {
    return apiRequest<Order[]>(`/tables/${tableId}/orders`, { method: 'POST', token, body });
  },
  addItemsStaff(
    token: string,
    orderId: string,
    body: {
      items: Array<{ dishId: string; quantity: number; variantIds: string[]; notes?: string }>;
    },
  ) {
    return apiRequest<Order>(`/orders/${orderId}/items/staff`, { method: 'POST', token, body });
  },
  updateOrderStatus(token: string, orderId: string, status: 'preparing' | 'ready' | 'served') {
    return apiRequest<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
    });
  },
  cancelOrder(token: string, orderId: string) {
    return apiRequest<Order>(`/orders/${orderId}/cancel`, { method: 'POST', token });
  },
  removeOrderItem(token: string, orderId: string, itemId: string) {
    return apiRequest<Order>(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE', token });
  },
  recordPayment(token: string, orderId: string, body: RecordPaymentRequest) {
    return apiRequest<RecordPaymentResult>(`/orders/${orderId}/pay`, {
      method: 'POST',
      token,
      body,
    });
  },
  confirmPayment(token: string, paymentId: string) {
    return apiRequest<RecordPaymentResult>(`/payments/${paymentId}/confirm`, {
      method: 'POST',
      token,
    });
  },
  listOrderPayments(token: string, orderId: string): Promise<Receipt['payments']> {
    return apiRequest<Receipt>(`/orders/${orderId}/receipt`, { token }).then((r) => r.payments);
  },
  listOpenWaiterCalls(token: string) {
    return apiRequest<WaiterCall[]>('/waiter-calls?status=open', { token });
  },
  clearWaiterCall(token: string, id: string) {
    return apiRequest<WaiterCall>(`/waiter-calls/${id}/clear`, { method: 'POST', token });
  },
  markTableClean(token: string, tableId: string) {
    return apiRequest<TableWithDerived>(`/tables/${tableId}/clean`, {
      method: 'POST',
      token,
    });
  },
  requestBillForTable(token: string, tableId: string) {
    return apiRequest<{ id: string; createdAt: string }>(`/tables/${tableId}/request-bill`, {
      method: 'POST',
      token,
    });
  },
};
