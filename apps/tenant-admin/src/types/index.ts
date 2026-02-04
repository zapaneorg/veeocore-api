// Types communs pour l'application Tenant Admin

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'business' | 'enterprise';
  stripeConfigured: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'dispatcher';
  tenantId: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleType: 'standard' | 'premium' | 'van';
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  status: 'available' | 'busy' | 'offline' | 'on_break';
  isActive: boolean;
  rating: number;
  totalRides: number;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
  preferences?: {
    acceptsAirport: boolean;
    acceptsLongDistance: boolean;
    maxDistance: number;
  };
  createdAt: string;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoff: {
    address: string;
    lat: number;
    lng: number;
  };
  stops?: Array<{
    address: string;
    lat: number;
    lng: number;
  }>;
  vehicleType: 'standard' | 'premium' | 'van';
  passengers: number;
  luggage: number;
  scheduledFor?: string;
  estimatedPrice: number;
  finalPrice?: number;
  estimatedDistance: number;
  estimatedDuration: number;
  paymentMethod: 'cash' | 'card' | 'invoice';
  paymentStatus: PaymentStatus;
  customerNotes?: string;
  driver?: Driver;
  driverId?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export type BookingStatus = 
  | 'pending'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'partially_refunded'
  | 'failed';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentIntentId?: string;
  paymentMethod: 'cash' | 'card' | 'invoice';
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  booking?: Booking;
}

export interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  activeDrivers: number;
  inProgressRides: number;
  weeklyBookings: number[];
  weeklyRevenue: number[];
  bookingsByStatus: Record<BookingStatus, number>;
  revenueByVehicleType: Record<string, number>;
}

export interface DispatchRequest {
  id: string;
  bookingId: string;
  status: 'searching' | 'assigned' | 'no_drivers' | 'expired';
  notifiedDrivers: string[];
  acceptedBy?: string;
  createdAt: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
