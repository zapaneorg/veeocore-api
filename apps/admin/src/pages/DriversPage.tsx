import { useState } from 'react';
import { Plus, Search, MoreVertical, Star, Car } from 'lucide-react';

const drivers = [
  { 
    id: 1, 
    name: 'Thomas Müller', 
    email: 'thomas@example.com',
    phone: '+33 6 12 34 56 78',
    vehicle: 'Mercedes E-Class',
    plate: 'AB-123-CD',
    type: 'standard',
    status: 'available',
    rating: 4.8,
    rides: 342
  },
  { 
    id: 2, 
    name: 'Sophie Leroy', 
    email: 'sophie@example.com',
    phone: '+33 6 23 45 67 89',
    vehicle: 'BMW Série 5',
    plate: 'EF-456-GH',
    type: 'premium',
    status: 'busy',
    rating: 4.9,
    rides: 521
  },
  { 
    id: 3, 
    name: 'Pierre Martin', 
    email: 'pierre@example.com',
    phone: '+33 6 34 56 78 90',
    vehicle: 'Mercedes V-Class',
    plate: 'IJ-789-KL',
    type: 'van',
    status: 'offline',
    rating: 4.7,
    rides: 189
  },
  { 
    id: 4, 
    name: 'Marie Bernard', 
    email: 'marie@example.com',
    phone: '+33 6 45 67 89 01',
    vehicle: 'Audi A6',
    plate: 'MN-012-OP',
    type: 'standard',
    status: 'available',
    rating: 4.6,
    rides: 267
  },
];

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(search.toLowerCase()) ||
                          driver.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chauffeurs</h1>
          <p className="text-gray-600">Gérez votre flotte de chauffeurs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-5 w-5" />
          Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un chauffeur..."
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
          <option value="available">Disponible</option>
          <option value="busy">En course</option>
          <option value="offline">Hors ligne</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Disponibles</p>
          <p className="text-2xl font-bold text-green-600">
            {drivers.filter(d => d.status === 'available').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">En course</p>
          <p className="text-2xl font-bold text-blue-600">
            {drivers.filter(d => d.status === 'busy').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Hors ligne</p>
          <p className="text-2xl font-bold text-gray-400">
            {drivers.filter(d => d.status === 'offline').length}
          </p>
        </div>
      </div>

      {/* Drivers List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Courses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-medium">
                          {driver.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{driver.name}</p>
                        <p className="text-sm text-gray-500">{driver.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-900">{driver.vehicle}</p>
                        <p className="text-xs text-gray-500">{driver.plate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <TypeBadge type={driver.type} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={driver.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{driver.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{driver.rides}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    busy: 'bg-blue-100 text-blue-800',
    offline: 'bg-gray-100 text-gray-600',
    on_break: 'bg-yellow-100 text-yellow-800'
  };

  const labels: Record<string, string> = {
    available: 'Disponible',
    busy: 'En course',
    offline: 'Hors ligne',
    on_break: 'En pause'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    standard: 'bg-gray-100 text-gray-800',
    premium: 'bg-purple-100 text-purple-800',
    van: 'bg-orange-100 text-orange-800',
    eco: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${styles[type] || 'bg-gray-100'}`}>
      {type}
    </span>
  );
}
