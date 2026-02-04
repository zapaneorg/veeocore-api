import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, endpoints } from '../lib/api';
import DriverCard from '../components/DriverCard';
import type { Driver } from '../types';
import toast from 'react-hot-toast';

export default function DriversPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch drivers
  const { data: drivers, isLoading } = useQuery({
    queryKey: ['drivers', statusFilter, vehicleFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (vehicleFilter) params.vehicleType = vehicleFilter;
      
      const response = await api.get(endpoints.drivers, { params });
      return response.data.data.drivers as Driver[];
    },
    placeholderData: []
  });

  // Update driver status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ driverId, status }: { driverId: string; status: Driver['status'] }) => {
      await api.post(endpoints.driverStatus(driverId), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Statut mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  // Filter drivers by search
  const filteredDrivers = drivers?.filter(driver => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      driver.firstName.toLowerCase().includes(searchLower) ||
      driver.lastName.toLowerCase().includes(searchLower) ||
      driver.email.toLowerCase().includes(searchLower) ||
      driver.phone.includes(search) ||
      driver.vehiclePlate.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    total: drivers?.length || 0,
    available: drivers?.filter(d => d.status === 'available').length || 0,
    busy: drivers?.filter(d => d.status === 'busy').length || 0,
    offline: drivers?.filter(d => d.status === 'offline').length || 0,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chauffeurs</h1>
          <p className="text-gray-500">Gérez votre flotte de chauffeurs</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          Ajouter un chauffeur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{stats.available}</p>
          <p className="text-sm text-gray-500">Disponibles</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.busy}</p>
          <p className="text-sm text-gray-500">En course</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{stats.offline}</p>
          <p className="text-sm text-gray-500">Hors ligne</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un chauffeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="">Tous les statuts</option>
            <option value="available">Disponible</option>
            <option value="busy">En course</option>
            <option value="on_break">En pause</option>
            <option value="offline">Hors ligne</option>
          </select>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="">Tous les véhicules</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="van">Van</option>
          </select>
        </div>
      </div>

      {/* Drivers List */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-40 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filteredDrivers && filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDrivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onClick={() => navigate(`/drivers/${driver.id}`)}
              showActions
              onStatusChange={(status) => 
                updateStatusMutation.mutate({ driverId: driver.id, status })
              }
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chauffeur trouvé</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter || vehicleFilter 
              ? 'Modifiez vos filtres pour voir plus de résultats'
              : 'Commencez par ajouter votre premier chauffeur'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Ajouter un chauffeur
          </button>
        </div>
      )}

      {/* Add Driver Modal (simplified) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nouveau chauffeur</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" className="input" placeholder="Jean" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" className="input" placeholder="Dupont" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input" placeholder="jean@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" className="input" placeholder="+33612345678" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule</label>
                  <select className="input">
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="van">Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaque</label>
                  <input type="text" className="input" placeholder="AB-123-CD" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
