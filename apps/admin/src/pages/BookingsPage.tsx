import { useState } from 'react';
import { Search, Eye, MoreVertical } from 'lucide-react';

const bookings = [
  {
    id: 'BK-001',
    customer: 'Jean Dupont',
    phone: '+33 6 12 34 56 78',
    pickup: 'Gare Centrale, Strasbourg',
    dropoff: 'Aéroport de Strasbourg',
    driver: 'Thomas Müller',
    vehicle: 'standard',
    status: 'completed',
    price: 35,
    scheduledFor: '2026-02-03 14:30',
    createdAt: '2026-02-03 10:15'
  },
  {
    id: 'BK-002',
    customer: 'Marie Martin',
    phone: '+33 6 23 45 67 89',
    pickup: 'Centre-ville, Place Kléber',
    dropoff: 'Université de Strasbourg',
    driver: 'Sophie Leroy',
    vehicle: 'premium',
    status: 'in_progress',
    price: 18,
    scheduledFor: '2026-02-03 15:00',
    createdAt: '2026-02-03 14:45'
  },
  {
    id: 'BK-003',
    customer: 'Pierre Bernard',
    phone: '+33 6 34 56 78 90',
    pickup: 'Hôtel Hilton',
    dropoff: 'Palais des Congrès',
    driver: null,
    vehicle: 'standard',
    status: 'pending',
    price: 12,
    scheduledFor: '2026-02-03 16:00',
    createdAt: '2026-02-03 15:30'
  },
  {
    id: 'BK-004',
    customer: 'Sophie Leroy',
    phone: '+33 6 45 67 89 01',
    pickup: 'Aéroport de Strasbourg',
    dropoff: 'Centre-ville',
    driver: 'Pierre Martin',
    vehicle: 'van',
    status: 'driver_en_route',
    price: 45,
    scheduledFor: '2026-02-03 15:30',
    createdAt: '2026-02-03 09:00'
  },
  {
    id: 'BK-005',
    customer: 'Lucas Weber',
    phone: '+33 6 56 78 90 12',
    pickup: 'Quartier Neudorf',
    dropoff: 'Gare Centrale',
    driver: null,
    vehicle: 'standard',
    status: 'cancelled',
    price: 15,
    scheduledFor: '2026-02-03 12:00',
    createdAt: '2026-02-02 18:00'
  },
];

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customer.toLowerCase().includes(search.toLowerCase()) ||
      booking.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-600">Gérez les courses et réservations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="assigned">Assignée</option>
          <option value="driver_en_route">Chauffeur en route</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminée</option>
          <option value="cancelled">Annulée</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="all">Tout</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={bookings.length} />
        <StatCard label="En attente" value={bookings.filter(b => b.status === 'pending').length} color="yellow" />
        <StatCard label="En cours" value={bookings.filter(b => ['in_progress', 'driver_en_route'].includes(b.status)).length} color="blue" />
        <StatCard label="Terminées" value={bookings.filter(b => b.status === 'completed').length} color="green" />
        <StatCard label="Annulées" value={bookings.filter(b => b.status === 'cancelled').length} color="red" />
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-primary-600">{booking.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{booking.customer}</p>
                      <p className="text-sm text-gray-500">{booking.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-gray-900 truncate max-w-[200px]">{booking.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-gray-600 truncate max-w-[200px]">{booking.dropoff}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {booking.driver ? (
                      <span className="text-sm text-gray-900">{booking.driver}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Non assigné</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">{booking.price} €</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'gray' }: { label: string; value: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'text-gray-900',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    driver_en_route: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const labels: Record<string, string> = {
    pending: 'En attente',
    assigned: 'Assignée',
    driver_en_route: 'Chauffeur en route',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
}
