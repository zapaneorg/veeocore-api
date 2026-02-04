import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const API_URL = import.meta.env.VITE_API_URL || 'https://api-core.veeo-stras.fr/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs d'auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// API Methods
export const driverApi = {
  // Réservations
  getActiveBooking: () => api.get('/driver/booking/active'),
  getPendingBookings: () => api.get('/driver/bookings/pending'),
  acceptBooking: (bookingId: string) => api.post(`/driver/booking/${bookingId}/accept`),
  declineBooking: (bookingId: string) => api.post(`/driver/booking/${bookingId}/decline`),
  updateBookingStatus: (bookingId: string, status: string) => 
    api.put(`/driver/booking/${bookingId}/status`, { status }),
  
  // Historique
  getHistory: (page = 1, limit = 20) => 
    api.get(`/driver/bookings/history?page=${page}&limit=${limit}`),
  
  // Notifications
  getNotifications: () => api.get('/driver/notifications'),
  markNotificationRead: (id: string) => api.put(`/driver/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/driver/notifications/read-all'),
  
  // Stats
  getDailyStats: () => api.get('/driver/stats/today'),
  getWeeklyStats: () => api.get('/driver/stats/week'),
  
  // Position
  updateLocation: (lat: number, lng: number) => 
    api.post('/driver/location', { lat, lng }),
  
  // Profil
  getProfile: () => api.get('/driver/profile'),
  updateProfile: (data: any) => api.put('/driver/profile', data),
}
