import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is set in auth store
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('veeo-tenant-auth');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const endpoints = {
  // Auth
  login: '/api/v1/auth/tenant/login',
  me: '/api/v1/auth/tenant/me',
  
  // Dashboard
  stats: '/api/v1/tenant/stats',
  
  // Drivers
  drivers: '/api/v1/drivers',
  driversAvailable: '/api/v1/drivers/available',
  driverLocation: (id: string) => `/api/v1/drivers/${id}/location`,
  driverStatus: (id: string) => `/api/v1/drivers/${id}/status`,
  
  // Bookings
  bookings: '/api/v1/bookings',
  bookingDetail: (id: string) => `/api/v1/bookings/${id}`,
  bookingCancel: (id: string) => `/api/v1/bookings/${id}/cancel`,
  bookingAssign: (id: string) => `/api/v1/bookings/${id}/assign`,
  
  // Payments
  payments: '/api/v1/payments',
  paymentStatus: (bookingId: string) => `/api/v1/payments/${bookingId}/status`,
  paymentRefund: '/api/v1/payments/refund',
  
  // Dispatch
  dispatch: '/api/v1/dispatch',
  dispatchRequest: '/api/v1/dispatch/request',
  dispatchCancel: (id: string) => `/api/v1/dispatch/${id}/cancel`,
  
  // Analytics
  analytics: '/api/v1/analytics',
  
  // Settings
  settings: '/api/v1/tenant/settings',
  stripeConfig: '/api/v1/tenant/stripe',
  webhooks: '/api/v1/tenant/webhooks',
};

export default api;
