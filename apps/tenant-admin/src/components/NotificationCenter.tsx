/**
 * Composant NotificationCenter
 * Affiche les notifications temps réel dans le dashboard
 */

import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Car, CreditCard, AlertTriangle, MapPin } from 'lucide-react';
import { useAdminWebSocket } from '../hooks/useAdminWebSocket';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isConnected, 
    notifications, 
    markNotificationRead, 
    clearNotifications 
  } = useAdminWebSocket();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'driver':
        return <Car className="w-4 h-4 text-green-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bouton notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        
        {/* Badge connexion */}
        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        
        {/* Badge compteur */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel notifications */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border z-50 max-h-[500px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                    {unreadCount} nouvelles
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Tout effacer"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Statut connexion */}
            <div className={`px-4 py-2 text-sm flex items-center gap-2 ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected ? 'Connecté en temps réel' : 'Déconnecté'}
            </div>

            {/* Liste notifications */}
            <div className="overflow-y-auto max-h-[350px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {notification.title}
                            </span>
                            {!notification.read ? (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            ) : (
                              <CheckCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <span className="text-xs text-gray-400 mt-1 block">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Voir toutes les notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationCenter;
