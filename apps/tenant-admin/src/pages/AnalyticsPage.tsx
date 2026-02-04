import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Car,
  Clock,
  MapPin,
  Download
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api, endpoints } from '../lib/api';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Mock data
  const revenueData = [
    { name: 'Lun', revenue: 680, bookings: 18 },
    { name: 'Mar', revenue: 790, bookings: 24 },
    { name: 'Mer', revenue: 650, bookings: 20 },
    { name: 'Jeu', revenue: 890, bookings: 28 },
    { name: 'Ven', revenue: 1200, bookings: 32 },
    { name: 'Sam', revenue: 1450, bookings: 38 },
    { name: 'Dim', revenue: 980, bookings: 24 },
  ];

  const vehicleDistribution = [
    { name: 'Standard', value: 65, color: '#0ea5e9' },
    { name: 'Premium', value: 25, color: '#8b5cf6' },
    { name: 'Van', value: 10, color: '#f59e0b' },
  ];

  const hourlyDistribution = [
    { hour: '06h', bookings: 2 },
    { hour: '08h', bookings: 8 },
    { hour: '10h', bookings: 5 },
    { hour: '12h', bookings: 7 },
    { hour: '14h', bookings: 4 },
    { hour: '16h', bookings: 6 },
    { hour: '18h', bookings: 12 },
    { hour: '20h', bookings: 9 },
    { hour: '22h', bookings: 4 },
  ];

  const topDrivers = [
    { name: 'Thomas Müller', rides: 45, revenue: 1250, rating: 4.9 },
    { name: 'Marie Schmidt', rides: 38, revenue: 1080, rating: 4.8 },
    { name: 'Pierre Bernard', rides: 32, revenue: 920, rating: 4.7 },
    { name: 'Sophie Martin', rides: 28, revenue: 780, rating: 4.9 },
    { name: 'Jean Dupont', rides: 25, revenue: 650, rating: 4.6 },
  ];

  const topRoutes = [
    { from: 'Gare Centrale', to: 'Aéroport', count: 45, avgPrice: 35 },
    { from: 'Centre-ville', to: 'Gare TGV', count: 32, avgPrice: 18 },
    { from: 'Université', to: 'Centre-ville', count: 28, avgPrice: 12 },
    { from: 'Hôtel Hilton', to: 'Aéroport', count: 22, avgPrice: 42 },
    { from: 'Quartier Européen', to: 'Gare Centrale', count: 18, avgPrice: 15 },
  ];

  const stats = {
    totalRevenue: 6640,
    revenueChange: 18.5,
    totalBookings: 184,
    bookingsChange: 12,
    avgRideValue: 36.09,
    avgValueChange: 5.2,
    completionRate: 94.5,
    completionChange: 2.1,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Statistiques et performances</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                className={`px-4 py-2 text-sm font-medium ${
                  period === p 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
              </button>
            ))}
          </div>
          <button className="btn btn-outline">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign size={24} className="text-emerald-600" />
            </div>
            <span className={`flex items-center text-sm font-medium ${
              stats.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {stats.revenueChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(stats.revenueChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.totalRevenue} €</p>
          <p className="text-sm text-gray-500">Revenus totaux</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <span className={`flex items-center text-sm font-medium ${
              stats.bookingsChange >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {stats.bookingsChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(stats.bookingsChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
          <p className="text-sm text-gray-500">Réservations</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-100 rounded-xl">
              <BarChart3 size={24} className="text-purple-600" />
            </div>
            <span className={`flex items-center text-sm font-medium ${
              stats.avgValueChange >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {stats.avgValueChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(stats.avgValueChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.avgRideValue.toFixed(2)} €</p>
          <p className="text-sm text-gray-500">Panier moyen</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Car size={24} className="text-amber-600" />
            </div>
            <span className={`flex items-center text-sm font-medium ${
              stats.completionChange >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {stats.completionChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(stats.completionChange)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.completionRate}%</p>
          <p className="text-sm text-gray-500">Taux de complétion</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenus et réservations</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}€`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  name="Revenus (€)"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="bookings" 
                  fill="#8b5cf6" 
                  opacity={0.5}
                  radius={[4, 4, 0, 0]}
                  name="Réservations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Distribution */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Répartition véhicules</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vehicleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Distribution horaire des réservations</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [value, 'Courses']}
              />
              <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Drivers */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} />
              Top Chauffeurs
            </h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chauffeur</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Courses</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Revenus</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topDrivers.map((driver, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{driver.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{driver.rides}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{driver.revenue} €</td>
                  <td className="px-4 py-3 text-sm text-right text-amber-600">⭐ {driver.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Routes */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin size={18} />
              Trajets populaires
            </h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trajet</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Courses</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Prix moy.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topRoutes.map((route, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{route.from}</p>
                    <p className="text-xs text-gray-500">→ {route.to}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{route.count}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{route.avgPrice} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
