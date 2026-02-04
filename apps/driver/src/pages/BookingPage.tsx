import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import toast from 'react-hot-toast'
import type { Booking } from '../types'

// Simuler les données de la course
const mockBooking: Booking = {
  id: '1',
  reference: 'VTC-ABC123',
  status: 'assigned',
  customerName: 'Jean Dupont',
  customerPhone: '+33 6 12 34 56 78',
  pickupAddress: '15 Rue de la République, 67000 Strasbourg',
  pickupLat: 48.5734,
  pickupLng: 7.7521,
  dropoffAddress: '25 Avenue de la Liberté, 67000 Strasbourg',
  dropoffLat: 48.5834,
  dropoffLng: 7.7621,
  distanceKm: 5.2,
  durationMinutes: 15,
  totalPrice: 25.50,
  passengers: 2,
  vehicleType: 'berline',
  scheduledAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  notes: 'Client a des bagages',
}

const statusFlow = ['assigned', 'en_route', 'arrived', 'in_progress', 'completed'] as const
type BookingStatus = typeof statusFlow[number]

const statusLabels: Record<string, string> = {
  assigned: 'Course acceptée',
  en_route: 'En route vers le client',
  arrived: 'Arrivé au point de départ',
  in_progress: 'Course en cours',
  completed: 'Course terminée',
}

const statusActions: Record<string, string> = {
  assigned: 'Je suis en route',
  en_route: 'Je suis arrivé',
  arrived: 'Démarrer la course',
  in_progress: 'Terminer la course',
}

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updateStatus } = useAuthStore()
  const [booking, setBooking] = useState<Booking>(mockBooking)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const currentStatusIndex = statusFlow.indexOf(booking.status as BookingStatus)

  const handleNextStatus = () => {
    if (currentStatusIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentStatusIndex + 1]
      setBooking({ ...booking, status: nextStatus })
      
      if (nextStatus === 'completed') {
        toast.success('Course terminée !')
        updateStatus('available')
        setTimeout(() => navigate('/'), 1500)
      } else {
        toast.success(statusLabels[nextStatus])
      }
    }
  }

  const handleCall = () => {
    window.location.href = `tel:${booking.customerPhone}`
  }

  const handleNavigate = () => {
    const address = booking.status === 'in_progress' ? booking.dropoffAddress : booking.pickupAddress
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    window.open(url, '_blank')
  }

  const handleCancel = () => {
    setShowCancelModal(true)
  }

  const confirmCancel = () => {
    toast('Course annulée', { icon: '✕' })
    updateStatus('available')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-semibold">Course {booking.reference}</h1>
            <p className="text-sm text-primary-600">{statusLabels[booking.status]}</p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center gap-1">
          {statusFlow.map((status, index) => (
            <div
              key={status}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                index <= currentStatusIndex ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="h-48 map-container mx-4 mt-4 flex items-center justify-center">
        <button 
          onClick={handleNavigate}
          className="bg-white px-4 py-2 rounded-lg shadow flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Ouvrir dans Maps
        </button>
      </div>

      {/* Booking Details */}
      <div className="px-4 mt-4 space-y-4">
        {/* Client Card */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold text-gray-600">
                  {booking.customerName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-lg">{booking.customerName}</p>
                <p className="text-sm text-gray-500">{booking.passengers} passager(s)</p>
              </div>
            </div>
            <button 
              onClick={handleCall}
              className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Route Details */}
        <div className="card p-4">
          <div className="space-y-4">
            {/* Pickup */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">A</span>
                </div>
                <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
              </div>
              <div className="flex-1 pb-2">
                <p className="text-xs text-gray-500 uppercase font-medium">Départ</p>
                <p className="font-medium mt-0.5">{booking.pickupAddress}</p>
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-semibold text-sm">B</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase font-medium">Arrivée</p>
                <p className="font-medium mt-0.5">{booking.dropoffAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Info */}
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{booking.distanceKm}</p>
              <p className="text-xs text-gray-500 mt-1">Kilomètres</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{booking.durationMinutes}</p>
              <p className="text-xs text-gray-500 mt-1">Minutes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{booking.totalPrice.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="card p-4 bg-yellow-50 border-yellow-100">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Note du client</p>
                <p className="text-sm text-yellow-700 mt-0.5">{booking.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {booking.status !== 'completed' && (
            <>
              <button 
                onClick={handleNextStatus}
                className="w-full btn-success text-lg py-4"
              >
                {statusActions[booking.status]}
              </button>

              <button 
                onClick={handleCancel}
                className="w-full btn-secondary text-red-500"
              >
                Annuler la course
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
          <div className="bg-white w-full rounded-t-2xl p-6 safe-bottom animate-slide-up">
            <h3 className="text-lg font-semibold text-center">Annuler la course ?</h3>
            <p className="text-gray-500 text-center mt-2">
              Cette action ne peut pas être annulée et peut affecter votre note.
            </p>
            <div className="mt-6 space-y-3">
              <button 
                onClick={confirmCancel}
                className="w-full btn-danger"
              >
                Oui, annuler
              </button>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="w-full btn-secondary"
              >
                Non, continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
