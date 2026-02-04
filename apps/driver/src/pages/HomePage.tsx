import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import toast from 'react-hot-toast'
import type { Booking, DailyStats } from '../types'
import BottomNav from '../components/BottomNav'
import StatusToggle from '../components/StatusToggle'

export default function HomePage() {
  const navigate = useNavigate()
  const { driver, updateStatus } = useAuthStore()
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null)
  const [stats, setStats] = useState<DailyStats>({
    rides: 0,
    earnings: 0,
    rating: 5.0,
    acceptanceRate: 100,
  })

  // Simuler les données pour la démo
  useEffect(() => {
    // Simuler une course active
    if (driver?.status === 'busy') {
      setActiveBooking({
        id: '1',
        reference: 'VTC-ABC123',
        status: 'in_progress',
        customerName: 'Jean Dupont',
        customerPhone: '+33 6 12 34 56 78',
        pickupAddress: '15 Rue de la République, Strasbourg',
        dropoffAddress: '25 Avenue de la Liberté, Strasbourg',
        distanceKm: 5.2,
        durationMinutes: 15,
        totalPrice: 25.50,
        passengers: 2,
        vehicleType: 'berline',
        scheduledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    }

    // Simuler des stats
    setStats({
      rides: 8,
      earnings: 245.80,
      rating: 4.9,
      acceptanceRate: 95,
    })
  }, [driver?.status])

  // Simuler une nouvelle demande de course
  useEffect(() => {
    if (driver?.status === 'available' && !pendingBooking) {
      const timer = setTimeout(() => {
        setPendingBooking({
          id: '2',
          reference: 'VTC-XYZ789',
          status: 'pending',
          customerName: 'Marie Martin',
          customerPhone: '+33 6 98 76 54 32',
          pickupAddress: '5 Place Kléber, Strasbourg',
          dropoffAddress: 'Gare de Strasbourg',
          distanceKm: 3.1,
          durationMinutes: 10,
          totalPrice: 18.50,
          passengers: 1,
          vehicleType: 'berline',
          scheduledAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [driver?.status, pendingBooking])

  const handleAcceptBooking = () => {
    if (pendingBooking) {
      toast.success('Course acceptée !')
      setActiveBooking({ ...pendingBooking, status: 'assigned' })
      setPendingBooking(null)
      updateStatus('busy')
    }
  }

  const handleDeclineBooking = () => {
    setPendingBooking(null)
    toast('Course refusée', { icon: '✕' })
  }

  const handleStatusChange = (status: 'available' | 'busy' | 'offline') => {
    updateStatus(status)
    if (status === 'offline') {
      setActiveBooking(null)
      setPendingBooking(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Bonjour</p>
            <h1 className="text-lg font-semibold">
              {driver?.firstName} {driver?.lastName}
            </h1>
          </div>
          <Link to="/notifications" className="relative p-2">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Link>
        </div>
      </header>

      {/* Status Toggle */}
      <div className="px-4 py-4">
        <StatusToggle 
          status={driver?.status || 'offline'} 
          onChange={handleStatusChange} 
        />
      </div>

      {/* Pending Booking Alert */}
      {pendingBooking && (
        <div className="mx-4 mb-4 card p-4 border-2 border-primary-500 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></span>
            <span className="font-semibold text-primary-600">Nouvelle course</span>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-sm">A</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Départ</p>
                <p className="font-medium text-sm">{pendingBooking.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-sm">B</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Arrivée</p>
                <p className="font-medium text-sm">{pendingBooking.dropoffAddress}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>{pendingBooking.distanceKm} km • {pendingBooking.durationMinutes} min</span>
            <span className="font-bold text-lg text-gray-900">{pendingBooking.totalPrice.toFixed(2)} €</span>
          </div>

          <div className="flex gap-3">
            <button onClick={handleDeclineBooking} className="flex-1 btn-secondary">
              Refuser
            </button>
            <button onClick={handleAcceptBooking} className="flex-1 btn-success">
              Accepter
            </button>
          </div>
        </div>
      )}

      {/* Active Booking */}
      {activeBooking && (
        <div className="mx-4 mb-4">
          <div className="card overflow-hidden">
            <div className="bg-primary-500 text-white px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-80">Course en cours</span>
                <span className="text-sm font-medium">{activeBooking.reference}</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Client Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">
                      {activeBooking.customerName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{activeBooking.customerName}</p>
                    <p className="text-sm text-gray-500">{activeBooking.passengers} passager(s)</p>
                  </div>
                </div>
                <a 
                  href={`tel:${activeBooking.customerPhone}`}
                  className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              </div>

              {/* Addresses */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs">A</span>
                  </div>
                  <p className="text-sm">{activeBooking.pickupAddress}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs">B</span>
                  </div>
                  <p className="text-sm">{activeBooking.dropoffAddress}</p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-gray-500">{activeBooking.distanceKm} km • {activeBooking.durationMinutes} min</span>
                <span className="text-xl font-bold">{activeBooking.totalPrice.toFixed(2)} €</span>
              </div>

              {/* Actions */}
              <button 
                onClick={() => navigate(`/booking/${activeBooking.id}`)}
                className="w-full btn-primary"
              >
                Voir les détails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Stats */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Aujourd'hui</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-2xl font-bold">{stats.rides}</p>
            <p className="text-sm text-gray-500">Courses</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-green-600">{stats.earnings.toFixed(2)} €</p>
            <p className="text-sm text-gray-500">Revenus</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold">{stats.rating}</p>
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Note moyenne</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold">{stats.acceptanceRate}%</p>
            <p className="text-sm text-gray-500">Acceptation</p>
          </div>
        </div>
      </div>

      {/* No active booking message */}
      {!activeBooking && !pendingBooking && driver?.status === 'available' && (
        <div className="px-4 mt-6">
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">En attente de courses</h3>
            <p className="text-sm text-gray-500 mt-1">
              Vous recevrez une notification dès qu'une course est disponible
            </p>
          </div>
        </div>
      )}

      {driver?.status === 'offline' && (
        <div className="px-4 mt-6">
          <div className="card p-6 text-center bg-gray-50">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Vous êtes hors ligne</h3>
            <p className="text-sm text-gray-500 mt-1">
              Passez en mode "Disponible" pour recevoir des courses
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
