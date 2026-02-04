import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter,
  Calendar,
  Plus,
  Download,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api, endpoints } from '../lib/api';
import BookingCard from '../components/BookingCard';
import type { Booking, BookingStatus } from '../types';

const statusOptions: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'assigned', label: 'Assignée' },
  { value: 'en_route', label: 'En route' },
  { value: 'arrived', label: 'Arrivé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
];

export default function BookingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Fetch bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', statusFilter, dateFilter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '50' };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.from = dateFilter;
      
      const response = await api.get(endpoints.bookings, { params });
      return response.data.data.bookings as Booking[];
    },
    placeholderData: []
  });

  // Filter by search
  const filteredBookings = bookings?.filter(booking => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      booking.customerName.toLowerCase().includes(searchLower) ||
      booking.customerPhone.includes(search) ||
      booking.pickup.address.toLowerCase().includes(searchLower) ||
      booking.dropoff.address.toLowerCase().includes(searchLower) ||
      booking.id.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    inProgress: bookings?.filter(b => ['assigned', 'en_route', 'arrived', 'in_progress'].includes(b.status)).length || 0,
    completed: bookings?.filter(b => b.status === 'completed').length || 0,
    totalRevenue: bookings?.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.estimatedPrice, 0) || 0,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-500">Gérez toutes vos courses</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-outline">
            <Download size={18} />
            Exporter
          </button>
          <button className="btn btn-primary">
            <Plus size={18} />
            Nouvelle réservation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">En attente</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          <p className="text-sm text-gray-500">En cours</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-sm text-gray-500">Terminées</p>
        </div>
        <div className="card p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toFixed(0)} €</p>
          <p className="text-sm text-gray-500">Revenus</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par client, adresse, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | '')}
              className="input w-full sm:w-44"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input w-full sm:w-44"
            />
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                className={`px-3 py-2 text-sm ${viewMode === 'cards' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
                onClick={() => setViewMode('cards')}
              >
                Cartes
              </button>
              <button
                className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
                onClick={() => setViewMode('table')}
              >
                Tableau
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-40 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filteredBookings && filteredBookings.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => navigate(`/bookings/${booking.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Trajet</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Véhicule</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Prix</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const statusLabels: Record<BookingStatus, string> = {
                    pending: 'En attente',
                    assigned: 'Assignée',
                    en_route: 'En route',
                    arrived: 'Arrivé',
                    in_progress: 'En cours',
                    completed: 'Terminée',
                    cancelled: 'Annulée',
                  };
                  
                  return (
                    <tr 
                      key={booking.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{booking.customerName}</p>
                        <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 truncate max-w-xs">{booking.pickup.address}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">→ {booking.dropoff.address}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge status-${booking.status}`}>
                          {statusLabels[booking.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {booking.vehicleType}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {booking.estimatedPrice.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(new Date(booking.createdAt), 'dd/MM/yy HH:mm', { locale: fr })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter || dateFilter 
              ? 'Modifiez vos filtres pour voir plus de résultats'
              : 'Aucune réservation pour le moment'}
          </p>
        </div>
      )}
    </div>
  );
}
