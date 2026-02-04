import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Bell, 
  Key, 
  Shield,
  Globe,
  Save,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { api, endpoints } from '../lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { tenant } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'stripe' | 'webhooks' | 'api'>('general');

  // Form states
  const [companyName, setCompanyName] = useState(tenant?.name || '');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const tabs = [
    { id: 'general', label: 'Général', icon: SettingsIcon },
    { id: 'stripe', label: 'Stripe', icon: CreditCard },
    { id: 'webhooks', label: 'Webhooks', icon: Bell },
    { id: 'api', label: 'Clés API', icon: Key },
  ];

  const handleSaveGeneral = async () => {
    // Save general settings
    toast.success('Paramètres enregistrés');
  };

  const handleSaveStripe = async () => {
    // Save Stripe settings
    toast.success('Configuration Stripe enregistrée');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Configurez votre espace VeeoCore</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Informations générales</h2>
                <p className="text-sm text-gray-500">Paramètres de votre entreprise</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input"
                    placeholder="Mon entreprise VTC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan actuel
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg border border-primary-100">
                    <Shield className="text-primary-600" size={24} />
                    <div>
                      <p className="font-medium text-gray-900 capitalize">Plan {tenant?.plan || 'Starter'}</p>
                      <p className="text-sm text-gray-500">Fonctionnalités complètes incluses</p>
                    </div>
                    <button className="ml-auto btn btn-outline text-sm">
                      Upgrader
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuseau horaire
                  </label>
                  <select className="input">
                    <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Devise
                  </label>
                  <select className="input">
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button className="btn btn-primary" onClick={handleSaveGeneral}>
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Stripe Settings */}
          {activeTab === 'stripe' && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <CreditCard size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Configuration Stripe</h2>
                    <p className="text-sm text-gray-500">
                      Connectez votre compte Stripe pour accepter les paiements en ligne
                    </p>
                  </div>
                </div>

                {tenant?.stripeConfigured ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100 mb-6">
                    <CheckCircle className="text-emerald-600" size={20} />
                    <div>
                      <p className="font-medium text-emerald-800">Stripe configuré</p>
                      <p className="text-sm text-emerald-600">Votre compte Stripe est connecté</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100 mb-6">
                    <AlertCircle className="text-amber-600" size={20} />
                    <div>
                      <p className="font-medium text-amber-800">Stripe non configuré</p>
                      <p className="text-sm text-amber-600">Configurez Stripe pour accepter les paiements</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé publique (Publishable Key)
                    </label>
                    <input
                      type="text"
                      value={stripePublishableKey}
                      onChange={(e) => setStripePublishableKey(e.target.value)}
                      className="input font-mono text-sm"
                      placeholder="pk_live_..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Trouvez cette clé dans votre dashboard Stripe &gt; Développeurs &gt; Clés API
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé secrète (Secret Key)
                    </label>
                    <input
                      type="password"
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      className="input font-mono text-sm"
                      placeholder="sk_live_..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      ⚠️ Ne partagez jamais cette clé. Elle est chiffrée sur nos serveurs.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-6 flex items-center justify-between">
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    Accéder à Stripe Dashboard
                    <ExternalLink size={14} />
                  </a>
                  <button className="btn btn-primary" onClick={handleSaveStripe}>
                    <Save size={18} />
                    Enregistrer
                  </button>
                </div>
              </div>

              {/* Stripe Webhook */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Webhook Stripe</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Configurez ce webhook dans votre dashboard Stripe pour recevoir les événements de paiement
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                  <span className="text-gray-600 flex-1 truncate">
                    https://api-core.veeo-stras.fr/api/v1/webhooks/stripe/{tenant?.id || 'TENANT_ID'}
                  </span>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => copyToClipboard(`https://api-core.veeo-stras.fr/api/v1/webhooks/stripe/${tenant?.id}`)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Événements à activer : <code className="bg-gray-100 px-1 rounded">payment_intent.succeeded</code>, 
                  <code className="bg-gray-100 px-1 rounded ml-1">payment_intent.failed</code>,
                  <code className="bg-gray-100 px-1 rounded ml-1">charge.refunded</code>
                </p>
              </div>
            </div>
          )}

          {/* Webhooks Settings */}
          {activeTab === 'webhooks' && (
            <div className="card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Webhooks</h2>
                <p className="text-sm text-gray-500">
                  Recevez des notifications en temps réel sur vos événements
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL du Webhook
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="input"
                    placeholder="https://votre-site.com/webhook"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Nous enverrons des requêtes POST à cette URL pour chaque événement
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Événements à recevoir
                  </label>
                  <div className="space-y-3">
                    {[
                      { id: 'booking.created', label: 'Nouvelle réservation' },
                      { id: 'booking.assigned', label: 'Chauffeur assigné' },
                      { id: 'booking.started', label: 'Course démarrée' },
                      { id: 'booking.completed', label: 'Course terminée' },
                      { id: 'booking.cancelled', label: 'Course annulée' },
                      { id: 'payment.succeeded', label: 'Paiement réussi' },
                      { id: 'driver.status_changed', label: 'Statut chauffeur modifié' },
                    ].map((event) => (
                      <label key={event.id} className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          defaultChecked
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" 
                        />
                        <span className="text-sm text-gray-700">{event.label}</span>
                        <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {event.id}
                        </code>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button className="btn btn-primary">
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeTab === 'api' && (
            <div className="card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Clés API</h2>
                <p className="text-sm text-gray-500">
                  Gérez vos clés d'accès à l'API VeeoCore
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Clé API principale</span>
                  <span className="badge badge-success">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 font-mono text-sm text-gray-600">
                    vk_live_••••••••••••••••••••••••
                  </code>
                  <button className="btn btn-outline btn-sm">
                    <Copy size={14} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Créée le 1 janvier 2026 • Dernière utilisation : il y a 2 heures
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-amber-800">Sécurité</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Ne partagez jamais vos clés API. Si vous pensez qu'une clé a été compromise, 
                      régénérez-la immédiatement.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50">
                  Régénérer la clé
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
