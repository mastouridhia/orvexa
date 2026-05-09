import type {
  AuthTokens,
  Category,
  CategoryRevenueRow,
  CreateCategoryRequest,
  CreateDishRequest,
  CreateStaffRequest,
  CreateVariantGroupRequest,
  DashboardSummary,
  Dish,
  DishImageUploadResponse,
  Order,
  OrderHistoryQuery,
  OrderListQuery,
  Receipt,
  PatchRestaurantRequest,
  Restaurant,
  SalesReportQuery,
  SalesReportRow,
  SetShiftPresenceRequest,
  StaffLoginResponse,
  StaffShift,
  StaffUser,
  BulkUpdateTableLayoutRequest,
  CreateTableRequest,
  CreateTableZoneRequest,
  Table,
  TableWithDerived,
  TableZone,
  UpdateTableRequest,
  UpdateTableZoneRequest,
  TopItemRow,
  TopItemsReportQuery,
  UpdateCategoryRequest,
  UpdateDishRequest,
  UpdateStaffRequest,
  UpdateVariantGroupRequest,
  VariantGroup,
  Feedback,
  FeedbackSummary,
} from '@orvexa/shared';
import { apiRequest } from './client.js';

type PaginatedOrders = { orders: Order[]; total: number; page: number; pageSize: number };

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `?${search}`;
}

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

  // Restaurant
  getRestaurant(token: string) {
    return apiRequest<Restaurant>('/restaurant', { token });
  },
  patchRestaurant(token: string, body: PatchRestaurantRequest) {
    return apiRequest<Restaurant>('/restaurant', { method: 'PATCH', token, body });
  },

  // Dashboard + Reports
  getDashboardSummary(token: string) {
    return apiRequest<DashboardSummary>('/dashboard/summary', { token });
  },
  getSales(token: string, q: SalesReportQuery) {
    return apiRequest<SalesReportRow[]>(
      `/reports/sales${qs({ granularity: q.granularity, from: q.from, to: q.to })}`,
      { token },
    );
  },
  getTopItems(token: string, q: TopItemsReportQuery) {
    return apiRequest<TopItemRow[]>(
      `/reports/top-items${qs({ limit: q.limit, from: q.from, to: q.to })}`,
      { token },
    );
  },
  getRevenueByCategory(token: string, q: { from?: string; to?: string }) {
    return apiRequest<CategoryRevenueRow[]>(
      `/reports/revenue-by-category${qs({ from: q.from, to: q.to })}`,
      { token },
    );
  },

  // Menu
  listCategories(token: string) {
    return apiRequest<Category[]>('/categories', { token });
  },
  createCategory(token: string, body: CreateCategoryRequest) {
    return apiRequest<Category>('/categories', { method: 'POST', token, body });
  },
  updateCategory(token: string, id: string, body: UpdateCategoryRequest) {
    return apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', token, body });
  },
  deleteCategory(token: string, id: string) {
    return apiRequest<{ ok: true }>(`/categories/${id}`, { method: 'DELETE', token });
  },
  reorderCategories(token: string, ids: string[]) {
    return apiRequest<Category[]>('/categories/reorder', { method: 'POST', token, body: { ids } });
  },
  listDishes(token: string) {
    return apiRequest<Dish[]>('/dishes', { token });
  },
  getDish(token: string, id: string) {
    return apiRequest<Dish>(`/dishes/${id}`, { token });
  },
  createDish(token: string, body: CreateDishRequest) {
    return apiRequest<Dish>('/dishes', { method: 'POST', token, body });
  },
  updateDish(token: string, id: string, body: UpdateDishRequest) {
    return apiRequest<Dish>(`/dishes/${id}`, { method: 'PATCH', token, body });
  },
  deleteDish(token: string, id: string) {
    return apiRequest<{ ok: true }>(`/dishes/${id}`, { method: 'DELETE', token });
  },
  uploadDishImage(token: string, id: string, file: File) {
    const form = new FormData();
    form.append('image', file);
    return apiRequest<DishImageUploadResponse>(`/dishes/${id}/image`, {
      method: 'POST',
      token,
      formData: form,
    });
  },
  deleteDishImageAt(token: string, id: string, idx: number) {
    return apiRequest<Dish>(`/dishes/${id}/images/${idx}`, { method: 'DELETE', token });
  },
  deleteDishImage(token: string, id: string) {
    return apiRequest<Dish>(`/dishes/${id}/image`, { method: 'DELETE', token });
  },
  listVariantGroups(token: string, dishId: string) {
    return apiRequest<VariantGroup[]>(`/dishes/${dishId}/variant-groups`, { token });
  },
  createVariantGroup(token: string, dishId: string, body: CreateVariantGroupRequest) {
    return apiRequest<VariantGroup>(`/dishes/${dishId}/variant-groups`, {
      method: 'POST',
      token,
      body,
    });
  },
  updateVariantGroup(token: string, id: string, body: UpdateVariantGroupRequest) {
    return apiRequest<VariantGroup>(`/variant-groups/${id}`, { method: 'PATCH', token, body });
  },
  deleteVariantGroup(token: string, id: string) {
    return apiRequest<{ ok: true }>(`/variant-groups/${id}`, { method: 'DELETE', token });
  },

  // Tables
  listTables(token: string) {
    return apiRequest<TableWithDerived[]>('/tables', { token });
  },
  createTable(token: string, body: CreateTableRequest) {
    return apiRequest<Table>('/tables', { method: 'POST', token, body });
  },
  updateTable(token: string, id: string, body: UpdateTableRequest) {
    return apiRequest<Table>(`/tables/${id}`, { method: 'PATCH', token, body });
  },
  deleteTable(token: string, id: string) {
    return apiRequest<{ ok: true }>(`/tables/${id}`, { method: 'DELETE', token });
  },
  mergeTables(token: string, leaderId: string, memberTableIds: string[]) {
    return apiRequest<{ leader: Table; members: Table[] }>(`/tables/${leaderId}/merge`, {
      method: 'POST',
      token,
      body: { memberTableIds },
    });
  },
  unmergeTable(token: string, id: string) {
    return apiRequest<Table>(`/tables/${id}/unmerge`, { method: 'POST', token });
  },
  bulkUpdateTableLayout(token: string, body: BulkUpdateTableLayoutRequest) {
    return apiRequest<Table[]>('/tables/layout', { method: 'POST', token, body });
  },
  tableQrUrl(id: string, format: 'png' | 'svg' = 'png'): string {
    return `${id}/qr?format=${format}`;
  },

  // Table zones (floor-plan groups)
  listTableZones(token: string) {
    return apiRequest<TableZone[]>('/table-zones', { token });
  },
  createTableZone(token: string, body: CreateTableZoneRequest) {
    return apiRequest<TableZone>('/table-zones', { method: 'POST', token, body });
  },
  updateTableZone(token: string, id: string, body: UpdateTableZoneRequest) {
    return apiRequest<TableZone>(`/table-zones/${id}`, { method: 'PATCH', token, body });
  },
  deleteTableZone(token: string, id: string) {
    return apiRequest<{ ok: true }>(`/table-zones/${id}`, { method: 'DELETE', token });
  },
  reorderTableZones(token: string, zoneIds: string[]) {
    return apiRequest<TableZone[]>('/table-zones/reorder', {
      method: 'POST',
      token,
      body: { zoneIds },
    });
  },

  // Staff shifts (attendance)
  listStaffShifts(token: string, date?: string) {
    const search = date ? `?shiftDate=${encodeURIComponent(date)}` : '';
    return apiRequest<StaffShift[]>(`/staff/shifts${search}`, { token });
  },
  setStaffShiftPresence(token: string, userId: string, body: SetShiftPresenceRequest) {
    return apiRequest<StaffShift>(`/staff/${userId}/shifts`, {
      method: 'POST',
      token,
      body,
    });
  },

  // Staff
  listStaff(token: string) {
    return apiRequest<StaffUser[]>('/staff', { token });
  },
  createStaff(token: string, body: CreateStaffRequest) {
    return apiRequest<StaffUser>('/staff', { method: 'POST', token, body });
  },
  updateStaff(token: string, id: string, body: UpdateStaffRequest) {
    return apiRequest<StaffUser>(`/staff/${id}`, { method: 'PATCH', token, body });
  },
  disableStaff(token: string, id: string) {
    return apiRequest<StaffUser>(`/staff/${id}/disable`, { method: 'POST', token });
  },
  enableStaff(token: string, id: string) {
    return apiRequest<StaffUser>(`/staff/${id}/enable`, { method: 'POST', token });
  },

  // Orders
  listOrders(token: string, q: OrderListQuery) {
    return apiRequest<PaginatedOrders>(
      `/orders${qs({ status: q.status, page: q.page, pageSize: q.pageSize })}`,
      { token },
    );
  },
  listOrderHistory(token: string, q: OrderHistoryQuery) {
    return apiRequest<PaginatedOrders>(
      `/orders/history${qs({ from: q.from, to: q.to, page: q.page, pageSize: q.pageSize })}`,
      { token },
    );
  },
  getReceipt(token: string, orderId: string) {
    return apiRequest<Receipt>(`/orders/${orderId}/receipt`, { token });
  },

  // Feedback
  listFeedback(token: string, q: { page?: number; pageSize?: number } = {}) {
    return apiRequest<{
      rows: Feedback[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/feedback${qs({ page: q.page, pageSize: q.pageSize })}`, { token });
  },
  getFeedbackSummary(token: string) {
    return apiRequest<FeedbackSummary>('/feedback/summary', { token });
  },
};
