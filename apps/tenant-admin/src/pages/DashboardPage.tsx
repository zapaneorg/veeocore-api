import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Car,
  TrendingUp,
  Clock,
  ArrowRight,
  Download,
  Filter,
  RefreshCw,
  ChevronDown
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
  Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api, endpoints } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import StatsCard from '../components/StatsCard';
import BookingCard from '../components/BookingCard';
import type { DashboardStats, Booking } from '../types';

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { tenant } = useAuthStore();
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Calculer les dates selon la période
  const getDateParams = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': 
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week': return { start: startOfWeek(now, { locale: fr }), end: endOfDay(now) };
      case 'month': return { start: startOfMonth(now), end: endOfDay(now) };
      case 'custom':
        return { 
          start: customDateStart ? new Date(customDateStart) : subDays(now, 7),
          end: customDateEnd ? new Date(customDateEnd) : now
        };
      default: return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', dateRange, customDateStart, customDateEnd],
    queryFn: async () => {
      const { start, end } = getDateParams();
      const response = await api.get<{ data: DashboardStats }>(endpoints.stats, {
        params: { startDate: start.toISOString(), endDate: end.toISOString() }
      });
      return response.data.data;
    },
    // For now, return mock data
    placeholderData: {
      todayBookings: 24,
      todayRevenue: 847,
      activeDrivers: 8,
      inProgressRides: 3,
      completedRides: 18,
      cancelledRides: 2,
      avgRideValue: 35.29,
      avgWaitTime: 8.5,
      weeklyBookings: [18, 24, 20, 28, 32, 38, 24],
      weeklyRevenue: [680, 790, 650, 890, 1200, 1450, 847],
      hourlyDistribution: [
        { hour: '06h', bookings: 2 }, { hour: '08h', bookings: 8 },
        { hour: '10h', bookings: 5 }, { hour: '12h', bookings: 7 },
        { hour: '14h', bookings: 4 }, { hour: '16h', bookings: 6 },
        { hour: '18h', bookings: 12 }, { hour: '20h', bookings: 9 },
        { hour: '22h', bookings: 4 },
      ],
      bookingsByStatus: {
        pending: 4, assigned: 2, en_route: 1, arrived: 0,
        in_progress: 3, completed: 18, cancelled: 2
      },
      revenueByVehicleType: { standard: 520, premium: 210, van: 117 },
      topDrivers: [
        { id: '1', name: 'Ahmed M.', rides: 12, revenue: 425, rating: 4.9 },
        { id: '2', name: 'Karim B.', rides: 10, revenue: 380, rating: 4.8 },
        { id: '3', name: 'Olivier D.', rides: 8, revenue: 295, rating: 4.7 },
      ],
      topRoutes: [
        { from: 'Gare de Strasbourg', to: 'Aéroport', count: 15, avgPrice: 45 },
        { from: 'Centre-ville', to: 'Kehl', count: 8, avgPrice: 35 },
        { from: 'Université', to: 'Gare', count: 6, avgPrice: 18 },
      ]
    }
  });

  // Fetch recent bookings
  const { data: recentBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const response = await api.get(endpoints.bookings, {
        params: { limit: 5, offset: 0 }
      });
      return response.data.data.bookings as Booking[];
    },
    placeholderData: []
  });

  // Chart data
  const revenueChartData = stats?.weeklyRevenue?.map((value, index) => ({
    name: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index],
    revenue: value,
    bookings: stats.weeklyBookings?.[index] || 0
  })) || [];

  const vehicleTypeData = stats?.revenueByVehicleType ? Object.entries(stats.revenueByVehicleType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value
  })) : [];

  // Export CSV
  const handleExportCSV = () => {
    const { start, end } = getDateParams();
    const csvData = [
      ['Métrique', 'Valeur'],
      ['Période', `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`],
      ['Total réservations', stats?.todayBookings || 0],
      ['Revenus', `${stats?.todayRevenue || 0} €`],
      ['Chauffeurs actifs', stats?.activeDrivers || 0],
      ['Courses terminées', stats?.completedRides || 0],
      ['Courses annulées', stats?.cancelledRides || 0],
      ['Valeur moyenne', `${stats?.avgRideValue?.toFixed(2) || 0} €`],
    ];
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard-stats-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const bookingsChartData = stats?.hourlyDistribution || [
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header avec filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Bienvenue sur {tenant?.name || 'votre tableau de bord'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de période */}
          <div className="flex items-center bg-white rounded-lg border shadow-sm">
            {(['today', 'yesterday', 'week', 'month'] as DateRange[]).map((range, idx, arr) => (
              <button key={range} onClick={() => setDateRange(range)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  dateRange === range ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                } ${idx === 0 ? 'rounded-l-lg' : ''} ${idx === arr.length - 1 ? 'rounded-r-lg' : ''}`}>
                {range === 'today' && "Aujourd'hui"}{range === 'yesterday' && 'Hier'}
                {range === 'week' && 'Semaine'}{range === 'month' && 'Mois'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border shadow-sm hover:bg-gray-50">
            <Filter size={16} />Filtres<ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => refetch()} className="p-2 text-gray-600 bg-white rounded-lg border shadow-sm hover:bg-gray-50" title="Actualiser">
            <RefreshCw size={18} className={statsLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg shadow-sm hover:bg-primary-600">
            <Download size={16} />Export CSV
          </button>
        </div>
      </div>

      {/* Filtres étendus */}
      {showFilters && (
        <div className="bg-white rounded-xl border p-4 animate-fadeIn">
          <div className="flex flex-wrap items-end gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input type="date" value={customDateStart} onChange={(e) => { setCustomDateStart(e.target.value); setDateRange('custom'); }} className="px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input type="date" value={customDateEnd} onChange={(e) => { setCustomDateEnd(e.target.value); setDateRange('custom'); }} className="px-3 py-2 border rounded-lg text-sm" /></div>
            <button onClick={() => { setDateRange('today'); setCustomDateStart(''); setCustomDateEnd(''); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Réinitialiser</button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Réservations aujourd'hui"
          value={stats?.todayBookings || 0}
          change="+12%"
          changeType="positive"
          icon={Calendar}
          iconColor="bg-blue-100 text-blue-600"
          loading={statsLoading}
        />
        <StatsCard
          title="Chauffeurs actifs"
          value={stats?.activeDrivers || 0}
          change="+2"
          changeType="positive"
          icon={Users}
          iconColor="bg-emerald-100 text-emerald-600"
          loading={statsLoading}
        />
        <StatsCard
          title="Revenus du jour"
          value={`${stats?.todayRevenue || 0} €`}
          change="+18%"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-amber-100 text-amber-600"
          loading={statsLoading}
        />
        <StatsCard
          title="Courses en cours"
          value={stats?.inProgressRides || 0}
          icon={Car}
          iconColor="bg-purple-100 text-purple-600"
          loading={statsLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Revenus de la semaine</h3>
              <p className="text-sm text-gray-500">Évolution des revenus sur 7 jours</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp size={18} />
              <span className="font-medium">+23%</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}€`} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`${value} €`, 'Revenus']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings by Hour */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Réservations par heure</h3>
              <p className="text-sm text-gray-500">Distribution des courses aujourd'hui</p>
            </div>
            <Clock size={18} className="text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [value, 'Courses']}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Dernières réservations</h3>
            <p className="text-sm text-gray-500">Les 5 courses les plus récentes</p>
          </div>
          <Link to="/bookings" className="btn btn-outline text-sm">
            Voir tout
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="p-4 space-y-3">
          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentBookings && recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                compact 
                onClick={() => window.location.href = `/bookings/${booking.id}`}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={48} className="mx-auto mb-3 opacity-30" />
              <p>Aucune réservation récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
