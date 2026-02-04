import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { driver, logout } = useAuthStore()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Déconnexion réussie')
    navigate('/login', { replace: true })
  }

  // Stats mensuelles simulées
  const monthlyStats = {
    rides: 145,
    earnings: 4850.50,
    hours: 186,
    rating: 4.9,
  }

  const menuItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: 'Informations personnelles',
      onClick: () => toast('Bientôt disponible'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      label: 'Documents',
      onClick: () => toast('Bientôt disponible'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: 'Mes revenus',
      onClick: () => toast('Bientôt disponible'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Paramètres',
      onClick: () => toast('Bientôt disponible'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Aide & Support',
      onClick: () => toast('Bientôt disponible'),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with Profile */}
      <header className="bg-gradient-to-br from-primary-500 to-primary-600 px-4 pt-6 pb-8 safe-top">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-primary-500">
              {driver?.firstName?.charAt(0)}{driver?.lastName?.charAt(0)}
            </span>
          </div>
          <div className="text-white">
            <h1 className="text-xl font-bold">{driver?.firstName} {driver?.lastName}</h1>
            <p className="text-primary-100">{driver?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm">{driver?.rating || 5.0}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Vehicle Info */}
      <div className="mx-4 -mt-4 card p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold">{driver?.vehicleBrand || 'Mercedes'} {driver?.vehicleModel || 'Classe E'}</p>
          <p className="text-sm text-gray-500">{driver?.vehiclePlate || 'AB-123-CD'}</p>
        </div>
        <span className="text-xs font-medium px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
          {driver?.vehicleType || 'Berline'}
        </span>
      </div>

      {/* Monthly Stats */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Ce mois</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-2xl font-bold">{monthlyStats.rides}</p>
            <p className="text-sm text-gray-500">Courses</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-green-600">{monthlyStats.earnings.toFixed(2)} €</p>
            <p className="text-sm text-gray-500">Revenus</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold">{monthlyStats.hours}h</p>
            <p className="text-sm text-gray-500">Heures</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold">{monthlyStats.rating}</p>
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Note moyenne</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 mt-6">
        <div className="card divide-y divide-gray-100">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                {item.icon}
              </div>
              <span className="flex-1 font-medium">{item.label}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full card p-4 text-red-500 font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
      </div>

      {/* Version */}
      <p className="text-center text-gray-400 text-xs mt-6 mb-4">
        VeeoCore Driver v1.0.0
      </p>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
          <div className="bg-white w-full rounded-t-2xl p-6 safe-bottom animate-slide-up">
            <h3 className="text-lg font-semibold text-center">Se déconnecter ?</h3>
            <p className="text-gray-500 text-center mt-2">
              Vous devrez vous reconnecter pour accéder à l'application.
            </p>
            <div className="mt-6 space-y-3">
              <button 
                onClick={handleLogout}
                className="w-full btn-danger"
              >
                Se déconnecter
              </button>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="w-full btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
