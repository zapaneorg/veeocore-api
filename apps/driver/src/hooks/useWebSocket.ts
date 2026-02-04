/**
 * Hook WebSocket pour l'application Chauffeur
 * Gère la connexion temps réel avec le serveur
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

interface WebSocketEvents {
  'booking:new': (data: NewBookingEvent) => void;
  'booking:assigned': (data: BookingAssignedEvent) => void;
  'booking:status_changed': (data: BookingStatusEvent) => void;
  'booking:cancelled': (data: { bookingId: string }) => void;
  'message:received': (data: MessageEvent) => void;
  'connected': (data: { status: string; driverId: string }) => void;
  'disconnect': () => void;
}

interface NewBookingEvent {
  bookingId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupTime: string;
  estimatedPrice: number;
  vehicleType: string;
  distance?: number;
  passengerName?: string;
}

interface BookingAssignedEvent {
  bookingId: string;
  timestamp: string;
}

interface BookingStatusEvent {
  bookingId: string;
  status: string;
  timestamp: string;
}

interface MessageEvent {
  message: string;
  from: string;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastEvent: any | null;
  error: string | null;
  
  // Actions
  updateLocation: (lat: number, lng: number) => void;
  updateStatus: (status: 'available' | 'busy' | 'offline') => void;
  acceptBooking: (bookingId: string) => void;
  updateBookingStatus: (bookingId: string, status: string) => void;
  
  // Event listeners
  onNewBooking: (callback: (data: NewBookingEvent) => void) => () => void;
  onBookingAssigned: (callback: (data: BookingAssignedEvent) => void) => () => void;
  onMessage: (callback: (data: MessageEvent) => void) => () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { token, driver } = useAuthStore();
  
  // Stockage des callbacks
  const callbacksRef = useRef<{
    newBooking: ((data: NewBookingEvent) => void)[];
    bookingAssigned: ((data: BookingAssignedEvent) => void)[];
    message: ((data: MessageEvent) => void)[];
  }>({
    newBooking: [],
    bookingAssigned: [],
    message: []
  });

  // Connexion WebSocket
  useEffect(() => {
    if (!token || !driver) {
      return;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('connected', (data) => {
      console.log('Authenticated:', data);
      setLastEvent({ type: 'connected', data });
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    // Événements métier
    socket.on('booking:new', (data: NewBookingEvent) => {
      console.log('New booking received:', data);
      setLastEvent({ type: 'booking:new', data });
      callbacksRef.current.newBooking.forEach(cb => cb(data));
    });

    socket.on('booking:assigned', (data: BookingAssignedEvent) => {
      console.log('Booking assigned:', data);
      setLastEvent({ type: 'booking:assigned', data });
      callbacksRef.current.bookingAssigned.forEach(cb => cb(data));
    });

    socket.on('booking:status_changed', (data: BookingStatusEvent) => {
      console.log('Booking status changed:', data);
      setLastEvent({ type: 'booking:status_changed', data });
    });

    socket.on('message:received', (data: MessageEvent) => {
      console.log('Message received:', data);
      setLastEvent({ type: 'message', data });
      callbacksRef.current.message.forEach(cb => cb(data));
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, driver]);

  // Actions
  const updateLocation = useCallback((lat: number, lng: number) => {
    socketRef.current?.emit('location:update', { lat, lng });
  }, []);

  const updateStatus = useCallback((status: 'available' | 'busy' | 'offline') => {
    socketRef.current?.emit('status:change', { status });
  }, []);

  const acceptBooking = useCallback((bookingId: string) => {
    socketRef.current?.emit('booking:accept', { bookingId });
  }, []);

  const updateBookingStatus = useCallback((bookingId: string, status: string) => {
    socketRef.current?.emit('booking:status', { bookingId, status });
  }, []);

  // Event listeners
  const onNewBooking = useCallback((callback: (data: NewBookingEvent) => void) => {
    callbacksRef.current.newBooking.push(callback);
    return () => {
      callbacksRef.current.newBooking = callbacksRef.current.newBooking.filter(cb => cb !== callback);
    };
  }, []);

  const onBookingAssigned = useCallback((callback: (data: BookingAssignedEvent) => void) => {
    callbacksRef.current.bookingAssigned.push(callback);
    return () => {
      callbacksRef.current.bookingAssigned = callbacksRef.current.bookingAssigned.filter(cb => cb !== callback);
    };
  }, []);

  const onMessage = useCallback((callback: (data: MessageEvent) => void) => {
    callbacksRef.current.message.push(callback);
    return () => {
      callbacksRef.current.message = callbacksRef.current.message.filter(cb => cb !== callback);
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    error,
    updateLocation,
    updateStatus,
    acceptBooking,
    updateBookingStatus,
    onNewBooking,
    onBookingAssigned,
    onMessage
  };
}

export default useWebSocket;
