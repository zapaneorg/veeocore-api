import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Car,
  CreditCard,
  User,
  MessageSquare,
  Navigation,
  XCircle,
  CheckCircle,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api, endpoints } from '../lib/api';
import type { Booking, BookingStatus, Driver } from '../types';
import toast from 'react-hot-toast';

const statusConfig: Record<BookingStatus, { label: string; className: string; color: string }> = {
  pending: { label: 'En attente', className: 'status-pending', color: 'amber' },
  assigned: { label: 'Assignée', className: 'status-assigned', color: 'blue' },
  en_route: { label: 'En route', className: 'status-en_route', color: 'indigo' },
  arrived: { label: 'Arrivé', className: 'status-arrived', color: 'purple' },
  in_progress: { label: 'En cours', className: 'status-in_progress', color: 'cyan' },
  completed: { label: 'Terminée', className: 'status-completed', color: 'emerald' },
  cancelled: { label: 'Annulée', className: 'status-cancelled', color: 'red' },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch booking
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get(endpoints.bookingDetail(id!));
      return response.data.data.booking as Booking;
    },
    enabled: !!id
  });

  // Fetch available drivers for assignment
  const { data: availableDrivers } = useQuery({
    queryKey: ['available-drivers', booking?.vehicleType],
    queryFn: async () => {
      const response = await api.get(endpoints.driversAvailable, {
        params: { 
          vehicleType: booking?.vehicleType,
          lat: booking?.pickup.lat,
          lng: booking?.pickup.lng
        }
      });
      return response.data.data.drivers as Driver[];
    },
    enabled: !!booking && booking.status === 'pending'
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(endpoints.bookingCancel(id!), { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      toast.success('Réservation annulée');
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation");
    }
  });

  // Assign driver mutation
  const assignMutation = useMutation({
    mutationFn: async (driverId: string) => {
      await api.post(endpoints.bookingAssign(id!), { driverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      toast.success('Chauffeur assigné');
    },
    onError: () => {
      toast.error("Erreur lors de l'assignation");
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="card h-96 bg-gray-100" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Réservation non trouvée</p>
        <Link to="/bookings" className="btn btn-primary mt-4">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const status = statusConfig[booking.status];
  const canCancel = ['pending', 'assigned'].includes(booking.status);
  const canAssign = booking.status === 'pending';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Réservation #{booking.id.substring(0, 8)}
            </h1>
            <span className={`badge ${status.className} text-base`}>{status.label}</span>
          </div>
          <p className="text-gray-500">
            Créée le {format(new Date(booking.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canAssign && (
            <button className="btn btn-primary">
              <Send size={18} />
              Dispatch auto
            </button>
          )}
          {canCancel && (
            <button 
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Voulez-vous vraiment annuler cette réservation ?')) {
                  cancelMutation.mutate('Annulation manuelle admin');
                }
              }}
            >
              <XCircle size={18} />
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} />
              Informations client
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="font-medium text-gray-900">{booking.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <a href={`tel:${booking.customerPhone}`} className="font-medium text-primary-600 flex items-center gap-1">
                  <Phone size={14} />
                  {booking.customerPhone}
                </a>
              </div>
              {booking.customerEmail && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${booking.customerEmail}`} className="font-medium text-primary-600 flex items-center gap-1">
                    <Mail size={14} />
                    {booking.customerEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Navigation size={18} />
              Trajet
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Départ</p>
                  <p className="font-medium text-gray-900">{booking.pickup.address}</p>
                </div>
              </div>
              
              {booking.stops?.map((stop, index) => (
                <div key={index} className="flex items-start gap-4 pl-4 border-l-2 border-dashed border-gray-200 ml-4">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 -ml-7">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Arrêt {index + 1}</p>
                    <p className="text-gray-900">{stop.address}</p>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Arrivée</p>
                  <p className="font-medium text-gray-900">{booking.dropoff.address}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {booking.estimatedDistance.toFixed(1)} km
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                ~{booking.estimatedDuration} min
              </span>
            </div>
          </div>

          {/* Notes */}
          {booking.customerNotes && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={18} />
                Notes du client
              </h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{booking.customerNotes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Tarification</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Prix estimé</span>
                <span className="font-medium">{booking.estimatedPrice.toFixed(2)} €</span>
              </div>
              {booking.finalPrice && (
                <div className="flex justify-between text-lg font-bold">
                  <span>Prix final</span>
                  <span className="text-primary-600">{booking.finalPrice.toFixed(2)} €</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Méthode de paiement</span>
                  <span className="flex items-center gap-1 font-medium">
                    <CreditCard size={14} />
                    {booking.paymentMethod === 'card' ? 'Carte' : 
                     booking.paymentMethod === 'cash' ? 'Espèces' : 'Facture'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Statut paiement</span>
                  <span className={`badge ${booking.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {booking.paymentStatus === 'paid' ? 'Payé' : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car size={18} />
              Véhicule
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium capitalize">{booking.vehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passagers</span>
                <span className="font-medium">{booking.passengers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bagages</span>
                <span className="font-medium">{booking.luggage}</span>
              </div>
            </div>
          </div>

          {/* Driver */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Chauffeur</h3>
            {booking.driver ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {booking.driver.firstName[0]}{booking.driver.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.driver.firstName} {booking.driver.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{booking.driver.vehiclePlate}</p>
                </div>
              </div>
            ) : canAssign ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">Aucun chauffeur assigné</p>
                {availableDrivers && availableDrivers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Chauffeurs disponibles :</p>
                    {availableDrivers.slice(0, 3).map((driver) => (
                      <button
                        key={driver.id}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors text-left"
                        onClick={() => assignMutation.mutate(driver.id)}
                      >
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium text-sm">
                            {driver.firstName[0]}{driver.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{driver.vehiclePlate}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-600 text-sm">Aucun chauffeur disponible</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun chauffeur</p>
            )}
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Historique</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 bg-emerald-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Créée</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(booking.createdAt), 'dd/MM/yy HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
              {booking.assignedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Chauffeur assigné</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(booking.assignedAt), 'dd/MM/yy HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              )}
              {booking.startedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-purple-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Course démarrée</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(booking.startedAt), 'dd/MM/yy HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              )}
              {booking.completedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-emerald-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Terminée</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(booking.completedAt), 'dd/MM/yy HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              )}
              {booking.cancelledAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-red-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Annulée</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(booking.cancelledAt), 'dd/MM/yy HH:mm', { locale: fr })}
                    </p>
                    {booking.cancellationReason && (
                      <p className="text-xs text-red-600 mt-1">{booking.cancellationReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
