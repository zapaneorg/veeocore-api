import { Driver } from '../types';
import { MapPin, Phone, Mail, Star, Car, Clock } from 'lucide-react';

interface DriverCardProps {
  driver: Driver;
  onClick?: () => void;
  showActions?: boolean;
  onStatusChange?: (status: Driver['status']) => void;
}

const statusConfig: Record<Driver['status'], { label: string; className: string; dotClass: string }> = {
  available: { label: 'Disponible', className: 'badge-success', dotClass: 'status-available' },
  busy: { label: 'En course', className: 'badge-warning', dotClass: 'status-busy' },
  offline: { label: 'Hors ligne', className: 'badge-neutral', dotClass: 'status-offline' },
  on_break: { label: 'En pause', className: 'badge-info', dotClass: 'status-on_break' },
};

const vehicleLabels: Record<string, string> = {
  standard: 'Standard',
  premium: 'Premium',
  van: 'Van',
};

export default function DriverCard({ driver, onClick, showActions = false, onStatusChange }: DriverCardProps) {
  const status = statusConfig[driver.status];

  return (
    <div 
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {driver.firstName[0]}{driver.lastName[0]}
            </span>
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${status.dotClass}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {driver.firstName} {driver.lastName}
            </h3>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              {driver.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Car size={14} />
              {vehicleLabels[driver.vehicleType]}
            </span>
            <span className="text-gray-400">{driver.vehiclePlate}</span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Phone size={12} />
              {driver.phone}
            </span>
            {driver.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail size={12} />
                {driver.email}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{driver.totalRides}</p>
          <p className="text-xs text-gray-500">courses</p>
        </div>
      </div>

      {/* Location */}
      {driver.currentLocation && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={14} className="text-primary-500" />
            <span>Position connue</span>
            {driver.currentLocation.updatedAt && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} />
                {new Date(driver.currentLocation.updatedAt).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <select
                value={driver.status}
                onChange={(e) => onStatusChange?.(e.target.value as Driver['status'])}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="available">Disponible</option>
                <option value="busy">En course</option>
                <option value="on_break">En pause</option>
                <option value="offline">Hors ligne</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
