import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle plan restriction errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'PLAN_UPGRADE_REQUIRED') {
      // Handle plan upgrade required
      const upgradeData = error.response.data;
      
      // Show upgrade prompt (integrate with your notification system)
      console.log('Plan upgrade required:', upgradeData);
      
      // Optionally redirect to upgrade page
      // window.location.href = upgradeData.upgradeUrl;
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Customer API
export const customerAPI = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// Upselling API (Standard Plan)
export const upsellingAPI = {
  getSuggestions: (customerId: number) => 
    api.get(`/upselling/suggestions/${customerId}`),
  
  updateSuggestion: (suggestionId: number, status: 'accepted' | 'rejected') =>
    api.put(`/upselling/suggestions/${suggestionId}`, { status }),
  
  getAnalytics: (startDate?: string, endDate?: string) =>
    api.get('/upselling/analytics', { params: { startDate, endDate } }),
  
  analyzeCustomer: (customerId: number) =>
    api.post(`/upselling/analyze/${customerId}`),
};

// Membership API (Standard Plan)
export const membershipAPI = {
  getTiers: () => api.get('/memberships/tiers'),
  
  createTier: (data: any) => api.post('/memberships/tiers', data),
  
  updateTier: (tierId: number, data: any) => 
    api.put(`/memberships/tiers/${tierId}`, data),
  
  getCustomerMemberships: (customerId: number) =>
    api.get(`/memberships/customers/${customerId}`),
  
  subscribeMember: (customerId: number, data: any) =>
    api.post(`/memberships/customers/${customerId}/subscribe`, data),
  
  cancelMembership: (customerId: number) =>
    api.put(`/memberships/customers/${customerId}/cancel`),
  
  getAnalytics: (startDate?: string, endDate?: string) =>
    api.get('/memberships/analytics', { params: { startDate, endDate } }),
  
  processRenewals: () => api.post('/memberships/process-renewals'),
};

// Referral API (Standard Plan)
export const referralAPI = {
  getCustomerReferrals: (customerId: number) =>
    api.get(`/referrals/customer/${customerId}`),
  
  createReferral: (data: any) => api.post('/referrals/create', data),
  
  convertReferral: (referralCode: string, customerId: number) =>
    api.post(`/referrals/convert/${referralCode}`, { customer_id: customerId }),
  
  getRewards: (customerId: number) =>
    api.get(`/referrals/rewards/${customerId}`),
  
  applyReward: (rewardId: number, appointmentId?: number) =>
    api.post(`/referrals/rewards/${rewardId}/apply`, { appointment_id: appointmentId }),
  
  getAnalytics: (startDate?: string, endDate?: string) =>
    api.get('/referrals/analytics', { params: { startDate, endDate } }),
};

// Inventory API (Standard Plan)
export const inventoryAPI = {
  getProducts: (params?: { search?: string; category_id?: number; low_stock?: boolean }) =>
    api.get('/inventory/products', { params }),
  
  getProduct: (productId: number) =>
    api.get(`/inventory/products/${productId}`),
  
  createProduct: (data: any) => api.post('/inventory/products', data),
  
  updateProduct: (productId: number, data: any) =>
    api.put(`/inventory/products/${productId}`, data),
  
  recordTransaction: (data: any) =>
    api.post('/inventory/transactions', data),
  
  getLowStockAlerts: () => api.get('/inventory/alerts/low-stock'),
  
  getReport: (reportType: 'summary' | 'movement' | 'valuation', startDate?: string, endDate?: string) =>
    api.get('/inventory/reports', { params: { reportType, startDate, endDate } }),
  
  importProducts: (products: any[]) =>
    api.post('/inventory/import', { products }),
};

// Plan Features API
export const planAPI = {
  getCurrentFeatures: () => api.get('/plan/features'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Appointments API
export const appointmentAPI = {
  getAll: (params?: any) => api.get('/appointments', { params }),
  create: (data: any) => api.post('/appointments', data),
};

// Staff API
export const staffAPI = {
  getAll: () => api.get('/staff'),
};

export default api;