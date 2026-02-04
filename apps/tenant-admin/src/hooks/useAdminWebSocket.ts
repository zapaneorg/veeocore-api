/**
 * Hook WebSocket pour le Dashboard Admin
 * Notifications temps réel des activités
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

interface DriverLocationEvent {
  driverId: string;
  location: { lat: number; lng: number };
  timestamp: string;
}

interface DriverStatusEvent {
  driverId: string;
  status: string;
  timestamp: string;
}

interface BookingEvent {
  bookingId: string;
  status?: string;
  driverId?: string;
  timestamp: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  passengerName?: string;
  estimatedPrice?: number;
}

interface Notification {
  id: string;
  type: 'booking' | 'driver' | 'payment' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface UseAdminWebSocketReturn {
  isConnected: boolean;
  notifications: Notification[];
  driverLocations: Map<string, { lat: number; lng: number; timestamp: string }>;
  
  // Actions
  assignDriver: (bookingId: string, driverId: string) => void;
  sendMessageToDriver: (driverId: string, message: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Event listeners
  onDriverLocationUpdate: (callback: (data: DriverLocationEvent) => void) => () => void;
  onBookingCreated: (callback: (data: BookingEvent) => void) => () => void;
  onBookingStatusChanged: (callback: (data: BookingEvent) => void) => () => void;
}

export function useAdminWebSocket(): UseAdminWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [driverLocations, setDriverLocations] = useState<Map<string, { lat: number; lng: number; timestamp: string }>>(new Map());
  
  const { token, tenant } = useAuthStore();
  
  // Callbacks storage
  const callbacksRef = useRef<{
    driverLocation: ((data: DriverLocationEvent) => void)[];
    bookingCreated: ((data: BookingEvent) => void)[];
    bookingStatus: ((data: BookingEvent) => void)[];
  }>({
    driverLocation: [],
    bookingCreated: [],
    bookingStatus: []
  });

  // Ajouter une notification
  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ) => {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      data
    };
    
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Garder max 50
  }, []);

  // Connexion WebSocket
  useEffect(() => {
    if (!token || !tenant) {
      return;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Admin WebSocket connected');
      setIsConnected(true);
    });

    socket.on('connected', (data) => {
      console.log('Admin authenticated:', data);
      addNotification('alert', 'Connecté', 'Connexion temps réel établie');
    });

    socket.on('disconnect', (reason) => {
      console.log('Admin WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Admin connection error:', err.message);
      setIsConnected(false);
    });

    // Événements chauffeurs
    socket.on('driver:location_updated', (data: DriverLocationEvent) => {
      setDriverLocations(prev => {
        const newMap = new Map(prev);
        newMap.set(data.driverId, {
          lat: data.location.lat,
          lng: data.location.lng,
          timestamp: data.timestamp
        });
        return newMap;
      });
      callbacksRef.current.driverLocation.forEach(cb => cb(data));
    });

    socket.on('driver:status_changed', (data: DriverStatusEvent) => {
      const statusText = data.status === 'available' ? 'disponible' : 
                        data.status === 'busy' ? 'en course' : 'hors ligne';
      addNotification('driver', 'Statut chauffeur', `Chauffeur est maintenant ${statusText}`, data);
    });

    // Événements réservations
    socket.on('booking:created', (data: BookingEvent) => {
      addNotification(
        'booking',
        'Nouvelle réservation',
        `Course de ${data.pickupAddress || 'N/A'} vers ${data.dropoffAddress || 'N/A'}`,
        data
      );
      callbacksRef.current.bookingCreated.forEach(cb => cb(data));
    });

    socket.on('booking:status_changed', (data: BookingEvent) => {
      const statusText: Record<string, string> = {
        'confirmed': 'confirmée',
        'driver_assigned': 'chauffeur assigné',
        'driver_arrived': 'chauffeur arrivé',
        'in_progress': 'en cours',
        'completed': 'terminée',
        'cancelled': 'annulée'
      };
      
      addNotification(
        'booking',
        'Mise à jour course',
        `Réservation ${data.bookingId.slice(0, 8)}... : ${statusText[data.status || ''] || data.status}`,
        data
      );
      callbacksRef.current.bookingStatus.forEach(cb => cb(data));
    });

    // Événements paiements
    socket.on('payment:received', (data: any) => {
      addNotification(
        'payment',
        'Paiement reçu',
        `${data.amount?.toFixed(2) || '?'}€ pour la réservation ${data.bookingId?.slice(0, 8)}...`,
        data
      );
    });

    socket.on('payment:failed', (data: any) => {
      addNotification(
        'alert',
        'Échec paiement',
        `Le paiement pour ${data.bookingId?.slice(0, 8)}... a échoué`,
        data
      );
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, tenant, addNotification]);

  // Actions
  const assignDriver = useCallback((bookingId: string, driverId: string) => {
    socketRef.current?.emit('dispatch:assign', { bookingId, driverId });
  }, []);

  const sendMessageToDriver = useCallback((driverId: string, message: string) => {
    socketRef.current?.emit('driver:message', { driverId, message });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Event listeners
  const onDriverLocationUpdate = useCallback((callback: (data: DriverLocationEvent) => void) => {
    callbacksRef.current.driverLocation.push(callback);
    return () => {
      callbacksRef.current.driverLocation = callbacksRef.current.driverLocation.filter(cb => cb !== callback);
    };
  }, []);

  const onBookingCreated = useCallback((callback: (data: BookingEvent) => void) => {
    callbacksRef.current.bookingCreated.push(callback);
    return () => {
      callbacksRef.current.bookingCreated = callbacksRef.current.bookingCreated.filter(cb => cb !== callback);
    };
  }, []);

  const onBookingStatusChanged = useCallback((callback: (data: BookingEvent) => void) => {
    callbacksRef.current.bookingStatus.push(callback);
    return () => {
      callbacksRef.current.bookingStatus = callbacksRef.current.bookingStatus.filter(cb => cb !== callback);
    };
  }, []);

  return {
    isConnected,
    notifications,
    driverLocations,
    assignDriver,
    sendMessageToDriver,
    markNotificationRead,
    clearNotifications,
    onDriverLocationUpdate,
    onBookingCreated,
    onBookingStatusChanged
  };
}

export default useAdminWebSocket;
