import { Booking, BookingStatus } from '../types';
import { MapPin, User, Phone, Clock, Car, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingCardProps {
  booking: Booking;
  onClick?: () => void;
  compact?: boolean;
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'status-pending' },
  assigned: { label: 'Assignée', className: 'status-assigned' },
  en_route: { label: 'En route', className: 'status-en_route' },
  arrived: { label: 'Arrivé', className: 'status-arrived' },
  in_progress: { label: 'En cours', className: 'status-in_progress' },
  completed: { label: 'Terminée', className: 'status-completed' },
  cancelled: { label: 'Annulée', className: 'status-cancelled' },
};

const vehicleLabels: Record<string, string> = {
  standard: 'Standard',
  premium: 'Premium',
  van: 'Van',
};

export default function BookingCard({ booking, onClick, compact = false }: BookingCardProps) {
  const status = statusConfig[booking.status];

  if (compact) {
    return (
      <div 
        className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span className="font-medium text-gray-900 truncate">{booking.customerName}</span>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <MapPin size={12} />
            <span className="truncate">{booking.pickup.address}</span>
            <span>→</span>
            <span className="truncate">{booking.dropoff.address}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">{booking.estimatedPrice.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">
            {format(new Date(booking.createdAt), 'HH:mm', { locale: fr })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{booking.customerName}</h3>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Phone size={12} />
              {booking.customerPhone}
            </span>
            <span className="flex items-center gap-1">
              <Car size={12} />
              {vehicleLabels[booking.vehicleType]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{booking.estimatedPrice.toFixed(2)} €</p>
          <span className="text-xs text-gray-500 flex items-center gap-1 justify-end">
            <CreditCard size={12} />
            {booking.paymentMethod === 'card' ? 'Carte' : booking.paymentMethod === 'cash' ? 'Espèces' : 'Facture'}
          </span>
        </div>
      </div>

      {/* Trajet */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Départ</p>
            <p className="text-sm text-gray-900">{booking.pickup.address}</p>
          </div>
        </div>
        
        {booking.stops?.map((stop, index) => (
          <div key={index} className="flex items-start gap-3 pl-3 border-l-2 border-dashed border-gray-200 ml-3">
            <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 -ml-5">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Arrêt {index + 1}</p>
              <p className="text-sm text-gray-900">{stop.address}</p>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Arrivée</p>
            <p className="text-sm text-gray-900">{booking.dropoff.address}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {booking.scheduledFor 
              ? format(new Date(booking.scheduledFor), 'dd/MM à HH:mm', { locale: fr })
              : 'Immédiat'
            }
          </span>
          <span>{booking.estimatedDistance.toFixed(1)} km</span>
          <span>{booking.estimatedDuration} min</span>
        </div>
        {booking.driver && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
              <User size={12} className="text-primary-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {booking.driver.firstName} {booking.driver.lastName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
