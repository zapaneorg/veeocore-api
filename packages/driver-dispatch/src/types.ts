/**
 * Types pour le système de dispatch chauffeurs
 */

// Statut du chauffeur
export type DriverStatus = 
  | 'available'      // Disponible pour courses
  | 'busy'           // En course
  | 'offline'        // Hors ligne
  | 'on_break'       // En pause
  | 'going_pickup';  // En route vers client

// Chauffeur
export interface Driver {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: DriverStatus;
  vehicleType: string;
  vehiclePlate: string;
  rating: number;
  totalRides: number;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  fcmToken?: string;        // Firebase Cloud Messaging
  apnsToken?: string;       // Apple Push Notifications
  preferences: {
    acceptsAirport: boolean;
    acceptsLongDistance: boolean;
    maxDistance: number;     // km max depuis position
    workHours?: {
      start: string;        // "08:00"
      end: string;          // "20:00"
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Demande de course
export interface RideRequest {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  // Trajet
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
  
  // Détails
  vehicleType: string;
  passengers: number;
  luggage: number;
  estimatedPrice: number;
  estimatedDistance: number;
  estimatedDuration: number;
  
  // Timing
  requestedAt: Date;
  scheduledFor?: Date;      // Si réservation programmée
  
  // Statut
  status: RideRequestStatus;
  assignedDriverId?: string;
  
  // Notes
  customerNotes?: string;
  internalNotes?: string;
}

export type RideRequestStatus = 
  | 'pending'           // En attente d'assignation
  | 'searching'         // Recherche chauffeur
  | 'assigned'          // Chauffeur assigné
  | 'driver_accepted'   // Chauffeur a accepté
  | 'driver_declined'   // Chauffeur a refusé
  | 'driver_en_route'   // Chauffeur en route
  | 'driver_arrived'    // Chauffeur arrivé
  | 'in_progress'       // Course en cours
  | 'completed'         // Terminée
  | 'cancelled'         // Annulée
  | 'no_driver';        // Aucun chauffeur trouvé

// Notification
export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string;
  recipientType: 'driver' | 'customer' | 'admin';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
}

export type NotificationType = 
  | 'new_ride_request'
  | 'ride_assigned'
  | 'ride_accepted'
  | 'ride_declined'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'ride_started'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'payment_received'
  | 'rating_received'
  | 'custom';

export type NotificationChannel = 'push' | 'sms' | 'email' | 'webhook';

// Configuration du dispatch
export interface DispatchConfig {
  // Recherche de chauffeurs
  searchRadiusKm: number;           // Rayon de recherche initial
  maxSearchRadiusKm: number;        // Rayon max
  searchRadiusIncrement: number;    // Incrément si pas de chauffeur trouvé
  maxSearchAttempts: number;        // Nombre max de tentatives
  
  // Timeout
  driverResponseTimeout: number;    // Secondes pour répondre
  maxWaitingTime: number;           // Secondes max en recherche
  
  // Assignment
  assignmentStrategy: 'nearest' | 'queue' | 'rating' | 'balanced';
  maxDriversToNotify: number;       // Nombre de chauffeurs notifiés en parallèle
  
  // Notifications
  enablePush: boolean;
  enableSMS: boolean;
  enableEmail: boolean;
  enableWebhook: boolean;
  webhookUrl?: string;
  
  // Sons
  notificationSound?: string;
  
  // Auto-accept
  autoAcceptEnabled: boolean;
  autoAcceptDelay: number;          // Secondes avant auto-accept
}

// Événement dispatch
export interface DispatchEvent {
  type: DispatchEventType;
  rideRequestId: string;
  driverId?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type DispatchEventType = 
  | 'search_started'
  | 'driver_notified'
  | 'driver_responded'
  | 'driver_assigned'
  | 'search_expanded'
  | 'search_completed'
  | 'search_failed';

// Callback pour événements
export type DispatchCallback = (event: DispatchEvent) => void | Promise<void>;

// Stats dispatch
export interface DispatchStats {
  totalRequests: number;
  successfulAssignments: number;
  failedAssignments: number;
  averageResponseTime: number;
  averageSearchTime: number;
  acceptanceRate: number;
}
