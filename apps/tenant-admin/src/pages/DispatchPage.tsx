import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Send, 
  MapPin, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { api, endpoints } from '../lib/api';
import type { Booking, Driver, DispatchRequest } from '../types';

export default function DispatchPage() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  // Fetch pending bookings
  const { data: pendingBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['pending-bookings'],
    queryFn: async () => {
      const response = await api.get(endpoints.bookings, {
        params: { status: 'pending', limit: 20 }
      });
      return response.data.data.bookings as Booking[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    placeholderData: []
  });

  // Fetch available drivers
  const { data: availableDrivers, isLoading: driversLoading } = useQuery({
    queryKey: ['available-drivers-dispatch'],
    queryFn: async () => {
      const response = await api.get(endpoints.driversAvailable);
      return response.data.data.drivers as Driver[];
    },
    refetchInterval: 10000,
    placeholderData: []
  });

  // Fetch active dispatch requests
  const { data: activeRequests } = useQuery({
    queryKey: ['active-dispatch-requests'],
    queryFn: async () => {
      const response = await api.get(endpoints.dispatch);
      return response.data.data.requests as DispatchRequest[];
    },
    refetchInterval: 5000,
    placeholderData: []
  });

  const stats = {
    pendingBookings: pendingBookings?.length || 0,
    availableDrivers: availableDrivers?.length || 0,
    activeDispatches: activeRequests?.filter(r => r.status === 'searching').length || 0,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-500">Assignation des chauffeurs en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-emerald-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Temps réel actif
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Clock size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingBookings}</p>
            <p className="text-sm text-gray-500">Courses en attente</p>
          </div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Users size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.availableDrivers}</p>
            <p className="text-sm text-gray-500">Chauffeurs disponibles</p>
          </div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Zap size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeDispatches}</p>
            <p className="text-sm text-gray-500">Recherches actives</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bookings */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Courses en attente</h3>
            <span className="badge badge-warning">{stats.pendingBookings}</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {bookingsLoading ? (
              <div className="p-8 text-center">
                <RefreshCw size={24} className="mx-auto text-gray-400 animate-spin" />
              </div>
            ) : pendingBookings && pendingBookings.length > 0 ? (
              pendingBookings.map((booking) => (
                <div 
                  key={booking.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedBooking === booking.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                  }`}
                  onClick={() => setSelectedBooking(booking.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{booking.customerName}</p>
                      <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{booking.estimatedPrice.toFixed(0)} €</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 mt-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                      <span className="text-gray-600 truncate">{booking.pickup.address}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full flex-shrink-0" />
                      <span className="text-gray-600 truncate">{booking.dropoff.address}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400 capitalize">{booking.vehicleType}</span>
                    <button 
                      className="btn btn-primary btn-sm text-xs py-1 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Trigger dispatch
                      }}
                    >
                      <Send size={12} />
                      Dispatch
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
                <p>Aucune course en attente</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Drivers */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Chauffeurs disponibles</h3>
            <span className="badge badge-success">{stats.availableDrivers}</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {driversLoading ? (
              <div className="p-8 text-center">
                <RefreshCw size={24} className="mx-auto text-gray-400 animate-spin" />
              </div>
            ) : availableDrivers && availableDrivers.length > 0 ? (
              availableDrivers.map((driver) => (
                <div key={driver.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {driver.firstName[0]}{driver.lastName[0]}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        <span className="capitalize">{driver.vehicleType}</span>
                        <span className="mx-2">•</span>
                        <span className="font-mono">{driver.vehiclePlate}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">⭐ {driver.rating.toFixed(1)}</p>
                      {driver.currentLocation && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <MapPin size={10} />
                          Position connue
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p>Aucun chauffeur disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Dispatch Requests */}
      {activeRequests && activeRequests.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recherches en cours</h3>
          </div>
          <div className="p-4 space-y-4">
            {activeRequests.map((request) => (
              <div 
                key={request.id}
                className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <RefreshCw size={20} className="text-blue-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Recherche pour #{request.bookingId.substring(0, 8)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {request.notifiedDrivers.length} chauffeur(s) notifié(s)
                  </p>
                </div>
                <button className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle size={14} />
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
