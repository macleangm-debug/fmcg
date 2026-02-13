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

export const expensesApi = {
  getAll: (params?: { skip?: number; limit?: number }) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  getSummary: (period: string = 'month') => api.get('/expenses/summary', { params: { period } }),
};

export const subscriptionApi = {
  getStatus: () => api.get('/subscription'),
  recordPayment: (data: any) => api.post('/subscription/pay', data),
  getHistory: () => api.get('/subscription/history'),
};

export const customersApi = {
  getAll: (params?: { search?: string; skip?: number; limit?: number }) => api.get('/customers', { params }),
  getOne: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesSummary: (days?: number) => api.get('/dashboard/sales-summary', { params: { days } }),
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
  getSummary: (period: string = 'today') => api.get('/admin/reports/summary', { params: { period } }),
};
