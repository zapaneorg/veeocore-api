import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import BottomNav from '../components/BottomNav'
import type { Booking } from '../types'

// Mock data
const mockHistory: Booking[] = [
  {
    id: '1',
    reference: 'VTC-ABC123',
    status: 'completed',
    customerName: 'Jean Dupont',
    customerPhone: '+33 6 12 34 56 78',
    pickupAddress: '15 Rue de la République',
    dropoffAddress: '25 Avenue de la Liberté',
    distanceKm: 5.2,
    durationMinutes: 15,
    totalPrice: 25.50,
    passengers: 2,
    vehicleType: 'berline',
    scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    reference: 'VTC-DEF456',
    status: 'completed',
    customerName: 'Marie Martin',
    customerPhone: '+33 6 98 76 54 32',
    pickupAddress: 'Gare de Strasbourg',
    dropoffAddress: 'Aéroport de Strasbourg',
    distanceKm: 12.8,
    durationMinutes: 25,
    totalPrice: 45.00,
    passengers: 1,
    vehicleType: 'berline',
    scheduledAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    reference: 'VTC-GHI789',
    status: 'cancelled',
    customerName: 'Pierre Durand',
    customerPhone: '+33 6 11 22 33 44',
    pickupAddress: '10 Place Kléber',
    dropoffAddress: 'Kehl, Allemagne',
    distanceKm: 8.5,
    durationMinutes: 20,
    totalPrice: 35.00,
    passengers: 3,
    vehicleType: 'van',
    scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all')

  const filteredHistory = mockHistory.filter(booking => {
    if (filter === 'all') return true
    return booking.status === filter
  })

  // Group by date
  const groupedHistory = filteredHistory.reduce((acc, booking) => {
    const date = format(new Date(booking.scheduledAt), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(booking)
    return acc
  }, {} as Record<string, Booking[]>)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 safe-top">
        <h1 className="text-xl font-bold">Historique</h1>
      </header>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {['all', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border'
            }`}
          >
            {f === 'all' && 'Toutes'}
            {f === 'completed' && 'Terminées'}
            {f === 'cancelled' && 'Annulées'}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="px-4 space-y-4">
        {Object.entries(groupedHistory).map(([date, bookings]) => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              {format(new Date(date), 'EEEE d MMMM', { locale: fr })}
            </h2>
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        booking.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {booking.status === 'completed' ? 'Terminée' : 'Annulée'}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(booking.scheduledAt), 'HH:mm')}
                      </p>
                    </div>
                    <p className={`text-lg font-bold ${
                      booking.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {booking.status === 'completed' ? `${booking.totalPrice.toFixed(2)} €` : '—'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 text-xs">A</span>
                      </div>
                      <p className="text-sm text-gray-700">{booking.pickupAddress}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-600 text-xs">B</span>
                      </div>
                      <p className="text-sm text-gray-700">{booking.dropoffAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-gray-500">
                    <span>{booking.distanceKm} km</span>
                    <span>{booking.durationMinutes} min</span>
                    <span>{booking.customerName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredHistory.length === 0 && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">Aucune course dans l'historique</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
