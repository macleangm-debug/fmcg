import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

// API Functions
export const productsApi = {
  getAll: (params?: { category_id?: string; search?: string; low_stock_only?: boolean; skip?: number; limit?: number }) =>
    api.get('/products', { params }),
  getOne: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  bulkImport: (products: any[]) => api.post('/products/bulk', products),
};

// Invoicing products API (separate from retail products)
export const invoiceProductsApi = {
  getAll: (params?: { search?: string; skip?: number; limit?: number }) =>
    api.get('/invoices/products', { params }),
  getOne: (id: string) => api.get(`/invoices/products/${id}`),
  create: (data: any) => api.post('/invoices/products', data),
  update: (id: string, data: any) => api.put(`/invoices/products/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/products/${id}`),
};

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const businessApi = {
  get: () => api.get('/business'),
  update: (data: any) => api.put('/business', data),
};

// Business Settings API (SKU, Service Code, Invoice Number formats)
export const businessSettingsApi = {
  get: () => api.get('/business/settings'),
  update: (data: any) => api.put('/business/settings', data),
  generateSku: (category?: string) => api.get('/business/settings/generate-sku', { params: { category } }),
  generateServiceCode: () => api.get('/business/settings/generate-service-code'),
  generateInvoiceNumber: () => api.get('/business/settings/generate-invoice-number'),
};

export const expensesApi = {
  getAll: (params?: { skip?: number; limit?: number }) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  getSummary: (period: string = 'month') => api.get('/expenses/summary', { params: { period } }),
};

export const subscriptionApi = {
  getStatus: () => api.get('/subscription/current'),
  getPlans: () => api.get('/subscription/plans'),
  checkFeature: (featureId: string) => api.get(`/subscription/check-feature/${featureId}`),
  upgrade: (planId: string, billingCycle: string = 'monthly') => 
    api.post(`/subscription/upgrade?plan_id=${planId}&billing_cycle=${billingCycle}`),
  upgradePreview: (planId: string, billingCycle: string = 'monthly') =>
    api.get(`/subscription/upgrade-preview?plan_id=${planId}&billing_cycle=${billingCycle}`),
  linkApp: (appId: string, planId: string = 'starter', startTrial: boolean = true) =>
    api.post(`/subscription/link-app?app_id=${appId}&plan_id=${planId}&start_trial=${startTrial}`),
  unlinkApp: (appId: string) =>
    api.post(`/subscription/unlink-app?app_id=${appId}`),
  convertTrial: (appId: string) =>
    api.post(`/subscription/convert-trial?app_id=${appId}`),
  getAvailableApps: () => api.get('/subscription/available-apps'),
  recordPayment: (data: any) => api.post('/subscription/pay', data),
  getHistory: () => api.get('/subscription/history'),
  getGraceStatus: () => api.get('/subscription/grace-status'),
  simulatePayment: (appId: string) => api.post(`/subscription/simulate-payment?app_id=${appId}`),
  // Sync APIs
  getSyncStatus: () => api.get('/sync/status'),
  syncCustomersToClients: () => api.post('/sync/customers-to-clients'),
  syncInventoryToProducts: () => api.post('/sync/inventory-to-products'),
};

export const paymentApi = {
  getConfig: () => api.get('/payment/config'),
  initiatePayment: (data: {
    payment_type: 'subscription' | 'linked_app' | 'upgrade';
    payment_method: 'stripe' | 'mpesa' | 'mobile_money';
    amount: number;
    currency: string;
    app_id?: string;
    plan_id?: string;
    phone_number?: string;
  }) => api.post('/payment/initiate', data),
  getTransactions: (limit?: number) => api.get('/payment/transactions', { params: { limit } }),
  getTransaction: (transactionId: string) => api.get(`/payment/transaction/${transactionId}`),
};

export const exchangeRatesApi = {
  getAll: () => api.get('/exchange-rates'),
  refresh: () => api.post('/exchange-rates/refresh'),
  setOverride: (currency: string, rate: number) => 
    api.post('/exchange-rates/override', { currency, rate }),
  removeOverride: (currency: string) => 
    api.delete(`/exchange-rates/override/${currency}`),
};

export const notificationsApi = {
  getAll: (unreadOnly?: boolean, limit?: number) => 
    api.get('/notifications', { params: { unread_only: unreadOnly, limit } }),
  markAsRead: (notificationId: string) => api.post(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

export const customersApi = {
  getAll: (params?: { search?: string; skip?: number; limit?: number }) => api.get('/customers', { params }),
  getOne: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  search: (phone: string) => api.get('/customers', { params: { search: phone, limit: 5 } }),
};

export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  processRefund: (data: {
    order_id: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }>;
    refund_method: string;
    notes?: string;
    restock_items?: boolean;
  }) => api.post('/orders/refund', data),
  getRefunds: (orderId: string) => api.get(`/orders/${orderId}/refunds`),
};

export const dashboardApi = {
  getStats: (locationId?: string | null) => 
    api.get('/dashboard/stats', { params: locationId ? { location_id: locationId } : {} }),
  getSalesSummary: (days?: number, locationId?: string | null) => 
    api.get('/dashboard/sales-summary', { params: { days, ...(locationId ? { location_id: locationId } : {}) } }),
};

// RetailPro Linked Apps API
export const retailproApi = {
  getLinkedApps: () => api.get('/retailpro/linked-apps'),
  updateLinkedApp: (appId: string, action: 'link' | 'unlink') => 
    api.post('/retailpro/linked-apps', { app_id: appId, action }),
  getTrialStatus: (appId: string) => api.get(`/retailpro/trial-status/${appId}`),
  upgradeApp: (appId: string, plan: 'starter' | 'professional' | 'enterprise') =>
    api.post('/retailpro/upgrade', { app_id: appId, plan }),
};

export const inventoryApi = {
  adjustStock: (productId: string, quantity: number, reason: string) =>
    api.post('/inventory/stock-adjustment', null, { params: { product_id: productId, quantity, reason } }),
  getLowStock: () => api.get('/inventory/low-stock'),
};

// Admin User Management
export const adminUsersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  delete: (id: string) => api.delete(`/users/${id}?permanent=true`),
  assignLocation: (userId: string, locationId: string | null) => 
    api.put(`/users/${userId}`, { assigned_location_id: locationId }),
};

// Promotions/Campaigns
export const promotionsApi = {
  getAll: (activeOnly?: boolean) => api.get('/promotions', { params: { active_only: activeOnly } }),
  getOne: (id: string) => api.get(`/promotions/${id}`),
  create: (data: any) => api.post('/promotions', data),
  update: (id: string, data: any) => api.put(`/promotions/${id}`, data),
  deactivate: (id: string) => api.put(`/promotions/${id}/deactivate`),
  delete: (id: string) => api.delete(`/promotions/${id}`),
  calculate: (items: any[]) => api.post('/promotions/calculate', items),
};

export const reportsApi = {
  getSummary: (startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/admin/reports/summary', { params });
  },
  getProductReport: (startDate?: string, endDate?: string) => api.get('/admin/reports/products', { params: { start_date: startDate, end_date: endDate } }),
  getStaffReport: (startDate?: string, endDate?: string) => api.get('/admin/reports/staff', { params: { start_date: startDate, end_date: endDate } }),
  getCustomerReport: (startDate?: string, endDate?: string) => api.get('/admin/reports/customers', { params: { start_date: startDate, end_date: endDate } }),
  getPaymentReport: (startDate?: string, endDate?: string) => api.get('/admin/reports/payments', { params: { start_date: startDate, end_date: endDate } }),
};

// Multi-Business Management
export const businessesApi = {
  getUserBusinesses: () => api.get('/user/businesses'),
  switchBusiness: (businessId: string) => api.post('/user/businesses/switch', { business_id: businessId }),
  addBusiness: (data: {
    name: string;
    phone?: string;
    country: string;
    city?: string;
    address?: string;
    industry?: string;
  }) => api.post('/user/businesses/add', data),
};

// Locations API (Multi-location support)
export const locationsApi = {
  getAll: () => api.get('/locations'),
  getOne: (id: string) => api.get(`/locations/${id}`),
  create: (data: { name: string; address?: string; phone?: string; email?: string }) => 
    api.post('/locations', data),
  update: (id: string, data: { name?: string; address?: string; phone?: string; email?: string; is_active?: boolean }) => 
    api.put(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};
