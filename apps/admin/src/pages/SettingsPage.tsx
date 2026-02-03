import { useState } from 'react';
import { Save, Copy, RefreshCw, Eye, EyeOff, Bell, Globe, CreditCard } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export default function SettingsPage() {
  const { tenant } = useAuthStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'notifications' | 'billing'>('general');

  const apiKey = 'vk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Configurez votre compte et vos intégrations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'general', label: 'Général', icon: Globe },
            { id: 'api', label: 'API & Intégrations', icon: CreditCard },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'billing', label: 'Facturation', icon: CreditCard }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Informations de l'entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                <input
                  type="text"
                  defaultValue={tenant?.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  defaultValue={tenant?.slug}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
                <input
                  type="email"
                  defaultValue="contact@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  defaultValue="+33 1 23 45 67 89"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Préférences régionales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                  <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dollar ($)</option>
                  <option value="GBP">Livre (£)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Save className="h-5 w-5" />
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* API Settings */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Clé API</h3>
            <p className="text-sm text-gray-600 mb-4">
              Utilisez cette clé pour authentifier vos requêtes API. Gardez-la secrète !
            </p>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(apiKey)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy className="h-5 w-5" />
                Copier
              </button>
              <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Regénérer
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Webhook URL</h3>
            <p className="text-sm text-gray-600 mb-4">
              Recevez les événements en temps réel sur votre serveur.
            </p>
            <input
              type="url"
              placeholder="https://votre-site.com/webhook"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Widget - Code d'intégration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Copiez ce code pour intégrer le widget de réservation sur votre site.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`<script src="https://cdn.veeocore.com/widget.js"
        data-api-key="${apiKey.substring(0, 20)}..."
        data-theme="light">
</script>
<div id="veeo-booking"></div>`}
            </pre>
          </div>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Notifications Push</h3>
            <div className="space-y-4">
              <ToggleOption
                label="Nouvelles réservations"
                description="Recevoir une notification pour chaque nouvelle réservation"
                defaultChecked={true}
              />
              <ToggleOption
                label="Réservations annulées"
                description="Être notifié des annulations de courses"
                defaultChecked={true}
              />
              <ToggleOption
                label="Chauffeur connecté/déconnecté"
                description="Suivre l'activité des chauffeurs"
                defaultChecked={false}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Notifications Email</h3>
            <div className="space-y-4">
              <ToggleOption
                label="Rapport quotidien"
                description="Recevoir un résumé de l'activité chaque jour"
                defaultChecked={true}
              />
              <ToggleOption
                label="Rapport hebdomadaire"
                description="Statistiques et analyses de la semaine"
                defaultChecked={true}
              />
              <ToggleOption
                label="Alertes importantes"
                description="Problèmes techniques, limites atteintes, etc."
                defaultChecked={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Billing Settings */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900">Plan actuel</h3>
                <p className="text-sm text-gray-600">Votre abonnement VeeoCore</p>
              </div>
              <span className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full font-semibold">
                {tenant?.plan?.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Véhicules</p>
                <p className="text-2xl font-bold">4 / 10</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Réservations/mois</p>
                <p className="text-2xl font-bold">847 / ∞</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Prochain paiement</p>
                <p className="text-2xl font-bold">149€</p>
                <p className="text-xs text-gray-500">le 1er mars 2026</p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Changer de plan
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Voir les factures
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleOption({ 
  label, 
  description, 
  defaultChecked 
}: { 
  label: string; 
  description: string; 
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
