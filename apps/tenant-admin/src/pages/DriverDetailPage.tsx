import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  Car,
  Calendar,
  Clock,
  TrendingUp,
  Edit,
  Settings
} from 'lucide-react';
import { api, endpoints } from '../lib/api';
import type { Driver, Booking } from '../types';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Fetch driver details
  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const response = await api.get(`${endpoints.drivers}/${id}`);
      return response.data.data.driver as Driver;
    },
    enabled: !!id
  });

  // Fetch driver's recent bookings
  const { data: bookings } = useQuery({
    queryKey: ['driver-bookings', id],
    queryFn: async () => {
      const response = await api.get(endpoints.bookings, {
        params: { driverId: id, limit: 10 }
      });
      return response.data.data.bookings as Booking[];
    },
    enabled: !!id,
    placeholderData: []
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="card h-64 bg-gray-100" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Chauffeur non trouvé</p>
        <Link to="/drivers" className="btn btn-primary mt-4">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    available: { label: 'Disponible', className: 'badge-success' },
    busy: { label: 'En course', className: 'badge-warning' },
    offline: { label: 'Hors ligne', className: 'badge-neutral' },
    on_break: { label: 'En pause', className: 'badge-info' },
  };

  const status = statusConfig[driver.status];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/drivers" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {driver.firstName} {driver.lastName}
          </h1>
          <p className="text-gray-500">Détails du chauffeur</p>
        </div>
        <button className="btn btn-outline">
          <Edit size={18} />
          Modifier
        </button>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">
                {driver.firstName[0]}{driver.lastName[0]}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {driver.firstName} {driver.lastName}
            </h2>
            <span className={`badge ${status.className} mt-2`}>{status.label}</span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Phone size={18} className="text-gray-400" />
              <span>{driver.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail size={18} className="text-gray-400" />
              <span>{driver.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Car size={18} className="text-gray-400" />
              <span className="capitalize">{driver.vehicleType}</span>
              <span className="text-gray-400">•</span>
              <span className="font-mono text-sm">{driver.vehiclePlate}</span>
            </div>
            {driver.vehicleBrand && (
              <div className="text-gray-500 text-sm pl-8">
                {driver.vehicleBrand} {driver.vehicleModel}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-amber-500">
                <Star size={20} className="fill-amber-500" />
                <span className="text-2xl font-bold text-gray-900">{driver.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500">Note moyenne</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{driver.totalRides}</p>
              <p className="text-xs text-gray-500">Courses totales</p>
            </div>
          </div>
        </div>

        {/* Stats & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <Calendar size={24} className="mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-xs text-gray-500">Courses ce mois</p>
            </div>
            <div className="card p-4 text-center">
              <TrendingUp size={24} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">420 €</p>
              <p className="text-xs text-gray-500">Gains ce mois</p>
            </div>
            <div className="card p-4 text-center">
              <Clock size={24} className="mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">24h</p>
              <p className="text-xs text-gray-500">Temps en ligne</p>
            </div>
            <div className="card p-4 text-center">
              <MapPin size={24} className="mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">156 km</p>
              <p className="text-xs text-gray-500">Distance totale</p>
            </div>
          </div>

          {/* Preferences */}
          {driver.preferences && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings size={18} />
                Préférences
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Accepte aéroport</span>
                  <span className={`badge ${driver.preferences.acceptsAirport ? 'badge-success' : 'badge-neutral'}`}>
                    {driver.preferences.acceptsAirport ? 'Oui' : 'Non'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Longue distance</span>
                  <span className={`badge ${driver.preferences.acceptsLongDistance ? 'badge-success' : 'badge-neutral'}`}>
                    {driver.preferences.acceptsLongDistance ? 'Oui' : 'Non'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg col-span-2">
                  <span className="text-gray-600">Distance max acceptée</span>
                  <span className="font-medium text-gray-900">{driver.preferences.maxDistance} km</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Bookings */}
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Courses récentes</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {bookings && bookings.length > 0 ? (
                bookings.slice(0, 5).map((booking) => (
                  <Link 
                    key={booking.id}
                    to={`/bookings/${booking.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{booking.customerName}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {booking.pickup.address} → {booking.dropoff.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{booking.estimatedPrice.toFixed(2)} €</p>
                      <p className="text-xs text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Aucune course récente
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
