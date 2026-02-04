export interface Driver {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  phone: string
  status: 'available' | 'busy' | 'offline'
  vehicleType: string
  vehiclePlate: string
  vehicleBrand?: string
  vehicleModel?: string
  vehicleColor?: string
  rating: number
  totalRides: number
  earningsToday: number
  earningsMonth: number
}

export interface Booking {
  id: string
  reference: string
  status: 'pending' | 'assigned' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  
  // Client
  customerName: string
  customerPhone: string
  
  // Adresses
  pickupAddress: string
  pickupLat?: number
  pickupLng?: number
  dropoffAddress: string
  dropoffLat?: number
  dropoffLng?: number
  
  // Détails
  distanceKm: number
  durationMinutes: number
  totalPrice: number
  passengers: number
  vehicleType: string
  
  // Dates
  scheduledAt: string
  createdAt: string
  
  // Notes
  notes?: string
}

export interface Notification {
  id: string
  type: 'new_booking' | 'booking_update' | 'booking_cancelled' | 'message' | 'alert'
  title: string
  message: string
  bookingId?: string
  isRead: boolean
  createdAt: string
}

export interface DailyStats {
  rides: number
  earnings: number
  rating: number
  acceptanceRate: number
}

export interface AuthState {
  driver: Driver | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateStatus: (status: Driver['status']) => void
  checkAuth: () => Promise<void>
}
