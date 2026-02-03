import { useState } from 'react';
import { Save, Plus, Edit2, Info } from 'lucide-react';

const initialVehicles = [
  {
    type: 'standard',
    name: 'Standard',
    baseFare: 4.50,
    perKm: 1.35,
    perMin: 0.35,
    minimum: 8.00,
    commission: 20,
    peakMultiplier: 1.15,
    nightMultiplier: 1.05,
    weekendMultiplier: 1.10
  },
  {
    type: 'premium',
    name: 'Premium',
    baseFare: 5.50,
    perKm: 1.60,
    perMin: 0.42,
    minimum: 10.00,
    commission: 22,
    peakMultiplier: 1.18,
    nightMultiplier: 1.06,
    weekendMultiplier: 1.12
  },
  {
    type: 'van',
    name: 'Van',
    baseFare: 12.00,
    perKm: 2.10,
    perMin: 0.55,
    minimum: 25.00,
    commission: 20,
    peakMultiplier: 1.15,
    nightMultiplier: 1.05,
    weekendMultiplier: 1.10
  }
];

const initialZones = [
  { id: 1, name: 'Aéroport', type: 'airport', fee: 5.00, active: true },
  { id: 2, name: 'Gare Centrale', type: 'station', fee: 2.00, active: true },
  { id: 3, name: 'Centre-ville', type: 'zone', fee: 0, active: true },
];

const initialFixedRoutes = [
  { id: 1, from: 'Gare Centrale', to: 'Aéroport', standard: 35, premium: 50, van: 75 },
  { id: 2, from: 'Centre-ville', to: 'Aéroport', standard: 32, premium: 45, van: 70 },
  { id: 3, from: 'Gare Centrale', to: 'Centre-ville', standard: 12, premium: 18, van: 25 },
];

export default function PricingPage() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [zones, _setZones] = useState(initialZones);
  const [fixedRoutes, _setFixedRoutes] = useState(initialFixedRoutes);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'zones' | 'routes' | 'surge'>('vehicles');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarification</h1>
          <p className="text-gray-600">Configurez vos prix et tarifs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Save className="h-5 w-5" />
          Enregistrer
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'vehicles', label: 'Véhicules' },
            { id: 'zones', label: 'Zones' },
            { id: 'routes', label: 'Prix Fixes' },
            { id: 'surge', label: 'Surge Pricing' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'vehicles' && (
        <div className="space-y-6">
          {vehicles.map((vehicle, index) => (
            <div key={vehicle.type} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{vehicle.name}</h3>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {vehicle.type}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField
                  label="Tarif de base (€)"
                  value={vehicle.baseFare}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].baseFare = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Prix/km (€)"
                  value={vehicle.perKm}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].perKm = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Prix/min (€)"
                  value={vehicle.perMin}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].perMin = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Minimum (€)"
                  value={vehicle.minimum}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].minimum = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Commission (%)"
                  value={vehicle.commission}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].commission = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Mult. Pointe"
                  value={vehicle.peakMultiplier}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].peakMultiplier = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Mult. Nuit"
                  value={vehicle.nightMultiplier}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].nightMultiplier = val;
                    setVehicles(updated);
                  }}
                />
                <InputField
                  label="Mult. Weekend"
                  value={vehicle.weekendMultiplier}
                  onChange={(val) => {
                    const updated = [...vehicles];
                    updated[index].weekendMultiplier = val;
                    setVehicles(updated);
                  }}
                />
              </div>
            </div>
          ))}
          
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-colors w-full justify-center">
            <Plus className="h-5 w-5" />
            Ajouter un type de véhicule
          </button>
        </div>
      )}

      {activeTab === 'zones' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Zones tarifaires</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frais (€)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actif</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{zone.name}</td>
                  <td className="px-6 py-4 text-gray-600 capitalize">{zone.type}</td>
                  <td className="px-6 py-4 text-gray-600">{zone.fee.toFixed(2)} €</td>
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={zone.active} readOnly className="rounded" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit2 className="h-4 w-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Prix fixes par trajet</h3>
              <p className="text-sm text-gray-500">Définissez des prix fixes pour les trajets courants</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Départ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arrivée</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Standard</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Premium</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Van</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fixedRoutes.map((route) => (
                <tr key={route.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{route.from}</td>
                  <td className="px-6 py-4 text-gray-600">{route.to}</td>
                  <td className="px-6 py-4 text-right font-medium">{route.standard} €</td>
                  <td className="px-6 py-4 text-right font-medium">{route.premium} €</td>
                  <td className="px-6 py-4 text-right font-medium">{route.van} €</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit2 className="h-4 w-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'surge' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Configuration Surge Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plafond Surge Maximum
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    defaultValue={1.50}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="text-gray-600">= +50% max</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Limite la majoration maximum même si plusieurs facteurs se cumulent
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Formule de calcul</p>
                  <p>Surge = Pointe × Weekend × Nuit</p>
                  <p>Plafonné à la valeur maximum configurée</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Heures de pointe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Matin</label>
                <div className="flex items-center gap-2">
                  <input type="time" defaultValue="07:00" className="px-3 py-2 border rounded-lg" />
                  <span>à</span>
                  <input type="time" defaultValue="09:00" className="px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Soir</label>
                <div className="flex items-center gap-2">
                  <input type="time" defaultValue="17:00" className="px-3 py-2 border rounded-lg" />
                  <span>à</span>
                  <input type="time" defaultValue="19:00" className="px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Heures de nuit</h3>
            <div className="flex items-center gap-2">
              <input type="time" defaultValue="22:00" className="px-3 py-2 border rounded-lg" />
              <span>à</span>
              <input type="time" defaultValue="06:00" className="px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
      />
    </div>
  );
}
